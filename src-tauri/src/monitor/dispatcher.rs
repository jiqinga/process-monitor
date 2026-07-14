//! Action dispatch: trigger rule actions from UI commands and create
//! alert windows. Kept separate from the tick loop so the engine's
//! evaluation responsibility (`mod.rs`) and side-effect responsibility
//! (this file) read at one layer of abstraction.

use crate::actions;
use crate::error::{AppError, AppResult};
use crate::monitor::name_resolve::{matches_glob, resolve_display_name};
use crate::monitor::service_map::build_service_pid_map;
use crate::monitor::MonitorEngine;
use crate::types::{
    ActionExecutedPayload, ActionPromptPayload, LogEntry, MemoryThresholdType, Metric, Rule,
};
use tauri::{AppHandle, Emitter, Manager};

/// Bundle of facts needed to log and report an action against a specific
/// process at trigger time. Resolved once per call so action loops use the
/// same view.
struct ResolvedTarget {
    pid: u32,
    display_name: String,
    value: f32,
}

impl MonitorEngine {
    /// Compute current metric value for `proc` under `rule`. Pulled out
    /// so `resolve_target_*` paths read identically.
    fn current_value(rule: &Rule, num_cpus: f32, proc: &sysinfo::Process) -> f32 {
        match rule.metric {
            Metric::Cpu => proc.cpu_usage() / num_cpus,
            Metric::Memory => proc.memory() as f32 / 1024.0 / 1024.0,
            Metric::ProcessState => 0.0,
        }
    }

    /// Resolve `(pid, display_name, current_value)` for a rule trigger.
    /// Prefers the tracker's PID if it is still alive; otherwise falls back
    /// to the first matching process by name glob.
    fn resolve_target(&self, rule: &Rule, rule_id: &str) -> AppResult<ResolvedTarget> {
        let tracked_pid = {
            let trackers = self.trackers.lock().map_err(AppError::lock_from)?;
            trackers.get(rule_id).map(|t| t.pid)
        };

        let service_pid_map = build_service_pid_map();
        let sys = self.system.lock().map_err(AppError::lock_from)?;
        let num_cpus = sys.cpus().len() as f32;

        if let Some(pid) = tracked_pid {
            if let Some(proc) = sys.process(sysinfo::Pid::from_u32(pid)) {
                return Ok(ResolvedTarget {
                    pid,
                    display_name: resolve_display_name(proc, &service_pid_map),
                    value: Self::current_value(rule, num_cpus, proc),
                });
            }
        }

        // Fallback: find any process matching the rule's name glob.
        for (pid, proc_info) in sys.processes() {
            let name = proc_info.name().to_string_lossy().to_string();
            let display_name = resolve_display_name(proc_info, &service_pid_map);
            if matches_glob(&rule.process_name, &name, &display_name) {
                return Ok(ResolvedTarget {
                    pid: pid.as_u32(),
                    display_name,
                    value: Self::current_value(rule, num_cpus, proc_info),
                });
            }
        }

        Err(AppError::not_found("No matching process found"))
    }

    /// Create (or reuse) the alert popup window that prompts a user to
    /// pick an action when a rule is in `TriggerMode::Prompt`.
    pub(super) fn create_alert_window(
        &self,
        app: &AppHandle,
        rule_id: &str,
        payload: &ActionPromptPayload,
    ) {
        use tauri::webview::WebviewWindowBuilder;

        let window_label = format!("alert-{}", rule_id);

        let should_create_window = match app.get_webview_window(&window_label) {
            None => true,
            Some(window) => match window.is_visible() {
                Ok(visible) => !visible,
                Err(_) => true,
            },
        };

        if !should_create_window {
            return;
        }

        let payload_json = match serde_json::to_string(payload) {
            Ok(json) => json,
            Err(e) => {
                log::error!("Failed to serialize payload: {}", e);
                return;
            }
        };
        let encoded_payload = urlencoding::encode(&payload_json);
        let url = format!("/alert?data={}", encoded_payload);
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let window_label_unique = format!("alert-{}-{}", rule_id, now_ms);

        match WebviewWindowBuilder::new(
            app,
            &window_label_unique,
            tauri::WebviewUrl::App(url.into()),
        )
        .title("进程告警")
        .inner_size(700.0, 750.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .center()
        .build()
        {
            Ok(_) => log::info!("Created alert window for rule {}", rule_id),
            Err(e) => log::error!("Failed to create alert window: {}", e),
        }
    }

    /// Execute one action from a rule's action list (user picked it from the
    /// alert prompt). Logs the outcome but does NOT emit `action-executed`
    /// — that emission is reserved for the auto-trigger path.
    pub fn execute_action_for_rule(
        &self,
        app: &AppHandle,
        rule_id: &str,
        action_index: usize,
    ) -> AppResult<()> {
        let rules = self.config.get_rules()?;
        let rule = rules
            .iter()
            .find(|r| r.id == rule_id)
            .ok_or_else(|| AppError::not_found(format!("Rule {} not found", rule_id)))?;

        if action_index >= rule.actions.len() {
            return Err(AppError::invalid(format!(
                "action_index {} out of range (len {})",
                action_index,
                rule.actions.len()
            )));
        }

        let target = self.resolve_target(rule, rule_id)?;
        let action = &rule.actions[action_index];
        let (success, msg) = actions::execute_action(
            action,
            app,
            target.pid,
            &target.display_name,
            &rule.metric.to_string(),
            target.value,
            rule.duration_secs,
        );

        let log_entry = actions::build_log_entry(actions::LogEntryContext {
            rule_id,
            process_name: &target.display_name,
            metric: &rule.metric.to_string(),
            value: target.value,
            duration_secs: rule.duration_secs,
            action,
            success,
            message: &msg,
        });
        if let Err(e) = self.config.add_log(log_entry) {
            log::warn!("add_log failed: {}", e);
        }

        Ok(())
    }

    /// Execute every action defined on a rule (user chose "run all" from the
    /// alert prompt). Emits `action-executed` per action so the dashboard
    /// can update incrementally.
    pub fn execute_all_actions_for_rule(&self, app: &AppHandle, rule_id: &str) -> AppResult<()> {
        let rules = self.config.get_rules()?;
        let rule = rules
            .iter()
            .find(|r| r.id == rule_id)
            .ok_or_else(|| AppError::not_found(format!("Rule {} not found", rule_id)))?;

        let target = self.resolve_target(rule, rule_id)?;

        for action in &rule.actions {
            let (success, msg) = actions::execute_action(
                action,
                app,
                target.pid,
                &target.display_name,
                &rule.metric.to_string(),
                target.value,
                rule.duration_secs,
            );

            let log_entry = actions::build_log_entry(actions::LogEntryContext {
                rule_id,
                process_name: &target.display_name,
                metric: &rule.metric.to_string(),
                value: target.value,
                duration_secs: rule.duration_secs,
                action,
                success,
                message: &msg,
            });
            if let Err(e) = self.config.add_log(log_entry) {
                log::warn!("add_log failed: {}", e);
            }

            let _ = app.emit(
                "action-executed",
                ActionExecutedPayload {
                    rule_id: rule_id.to_string(),
                    action_type: action.action_type_name(),
                    success,
                    message: msg,
                },
            );
        }

        Ok(())
    }

    /// Record a user-cancelled action prompt: mark the tracker as fresh
    /// (so cooldown applies), append a UserCancelled log entry, emit
    /// `action-executed`.
    pub fn cancel_action_for_rule(&self, app: &AppHandle, rule_id: &str) -> AppResult<()> {
        let rules = self.config.get_rules()?;
        let rule = rules.iter().find(|r| r.id == rule_id);

        let mut trackers = self.trackers.lock().map_err(AppError::lock_from)?;
        let tracker = match trackers.get_mut(rule_id) {
            Some(t) => t,
            None => return Ok(()),
        };
        tracker.mark_triggered();

        let Some(rule) = rule else { return Ok(()) };

        let service_pid_map = build_service_pid_map();
        let sys = self.system.lock().map_err(AppError::lock_from)?;
        let num_cpus = sys.cpus().len() as f32;

        let Some(proc) = sys.process(sysinfo::Pid::from_u32(tracker.pid)) else {
            return Ok(());
        };

        let display_name = resolve_display_name(proc, &service_pid_map);
        let value = match rule.metric {
            Metric::Cpu => proc.cpu_usage() / num_cpus,
            Metric::Memory => match rule.memory_threshold_type {
                MemoryThresholdType::Mb => proc.memory() as f32 / 1024.0 / 1024.0,
                MemoryThresholdType::Percent => {
                    let total_memory_mb = sys.total_memory() as f32 / 1024.0 / 1024.0;
                    let mem_mb = proc.memory() as f32 / 1024.0 / 1024.0;
                    if total_memory_mb > 0.0 {
                        mem_mb / total_memory_mb * 100.0
                    } else {
                        0.0
                    }
                }
            },
            Metric::ProcessState => 0.0,
        };
        drop(sys);

        let log_entry = LogEntry {
            timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            rule_id: rule_id.to_string(),
            process_name: display_name,
            metric: rule.metric.to_string(),
            value,
            duration_secs: rule.duration_secs,
            action_type: "UserCancelled".to_string(),
            result: "User cancelled the action prompt".to_string(),
        };

        if let Err(e) = self.config.add_log(log_entry) {
            log::warn!("add_log failed: {}", e);
        }

        let _ = app.emit(
            "action-executed",
            ActionExecutedPayload {
                rule_id: rule_id.to_string(),
                action_type: "UserCancelled".to_string(),
                success: true,
                message: "User cancelled the action prompt".to_string(),
            },
        );

        Ok(())
    }
}
