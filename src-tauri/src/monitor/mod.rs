//! Process-monitoring engine.
//!
//! Public surface:
//! * [`MonitorEngine`] — owns process state, drives the tick loop.
//! * [`build_service_pid_map`] / [`resolve_display_name`] / [`matches_glob`]
//!   — utilities re-exported for the Tauri command layer.
//!
//! Internal modules:
//! * [`service_map`] — Windows SCM → PID lookup (no-op on other platforms).
//! * [`name_resolve`] — process display-name + glob matching.
//! * [`condition`] — recursive rule condition evaluator.
//! * [`snapshot`] — build [`ProcessInfo`] from `sysinfo::Process`.
//! * [`history`] — per-process CPU/memory time series for trend charts.
//! * [`dispatcher`] — UI-driven action trigger + alert window creation.

mod condition;
mod dispatcher;
mod history;
mod name_resolve;
mod service_map;
mod snapshot;

pub use name_resolve::{matches_glob, resolve_display_name};
pub use service_map::build_service_pid_map;

use crate::actions;
use crate::config::ConfigManager;
use crate::error::{AppError, AppResult};
use crate::types::*;
use condition::evaluate_condition;
use snapshot::build_process_info;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::System;
use tauri::{AppHandle, Emitter};

pub struct MonitorEngine {
    pub(super) system: Mutex<System>,
    pub(super) trackers: Mutex<HashMap<String, ProcessTracker>>,
    pub(super) config: Arc<ConfigManager>,
    pub(super) history: Mutex<HashMap<String, ProcessHistory>>,
    /// Cooperative shutdown flag observed by [`MonitorEngine::run`].
    shutdown: AtomicBool,
}

impl MonitorEngine {
    pub fn new(config: Arc<ConfigManager>) -> Self {
        Self {
            system: Mutex::new(System::new_all()),
            trackers: Mutex::new(HashMap::new()),
            config,
            history: Mutex::new(HashMap::new()),
            shutdown: AtomicBool::new(false),
        }
    }

    /// Signal the monitoring loop to exit on its next iteration.
    /// Idempotent and safe to call from any thread.
    pub fn shutdown(&self) {
        self.shutdown.store(true, Ordering::SeqCst);
        log::info!("monitor engine shutdown requested");
    }

    /// Run the monitoring loop on the current thread (typically a background
    /// thread spawned from `setup`). The loop exits cooperatively when
    /// [`MonitorEngine::shutdown`] is called.
    ///
    /// On `tick` failure the inter-tick sleep is doubled (capped at 32 s)
    /// to avoid log flooding when the system is in a persistent bad state;
    /// the interval resets on the next successful tick.
    pub fn run(&self, app: &AppHandle) {
        const BASE_INTERVAL: Duration = Duration::from_secs(2);
        const MAX_BACKOFF: Duration = Duration::from_secs(32);

        let mut interval = BASE_INTERVAL;
        let mut consecutive_failures: u32 = 0;

        while !self.shutdown.load(Ordering::SeqCst) {
            std::thread::sleep(interval);

            if self.shutdown.load(Ordering::SeqCst) {
                break;
            }

            match self.tick(app) {
                Ok(()) => {
                    if consecutive_failures > 0 {
                        log::info!(
                            "monitor tick recovered after {} consecutive failures",
                            consecutive_failures
                        );
                        consecutive_failures = 0;
                        interval = BASE_INTERVAL;
                    }
                }
                Err(e) => {
                    consecutive_failures += 1;
                    log::error!(
                        "monitor tick failed (attempt #{}): {}",
                        consecutive_failures,
                        e
                    );
                    interval = std::cmp::min(interval * 2, MAX_BACKOFF);
                }
            }
        }

        log::info!("monitor loop stopped");
    }

    fn tick(&self, app: &AppHandle) -> AppResult<()> {
        let mut sys = self.system.lock().map_err(AppError::lock_from)?;
        sys.refresh_all();
        std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
        sys.refresh_cpu_all();

        let num_cpus = sys.cpus().len() as f32;
        let total_memory_mb = sys.total_memory() as f32 / 1024.0 / 1024.0;

        let rules = self.config.get_rules()?;
        let enabled_rules: Vec<_> = rules.iter().filter(|r| r.enabled).collect();

        // Build Windows service PID → display name map (resolves svchost.exe → service name)
        let service_pid_map = build_service_pid_map();

        let mut all_processes: Vec<ProcessInfo> = Vec::new();
        let mut matched_processes: Vec<ProcessInfo> = Vec::new();

        for (pid, proc_info) in sys.processes() {
            let info =
                build_process_info(pid, proc_info, num_cpus, total_memory_mb, &service_pid_map);
            all_processes.push(info.clone());

            for rule in &enabled_rules {
                if matches_glob(&rule.process_name, &info.name, &info.display_name) {
                    matched_processes.push(info.clone());
                    break;
                }
            }
        }

        let mut rule_statuses: Vec<RuleStatus> = Vec::new();
        let mut trackers = self.trackers.lock().map_err(AppError::lock_from)?;

        for rule in &enabled_rules {
            let matching: Vec<_> = matched_processes
                .iter()
                .filter(|p| matches_glob(&rule.process_name, &p.name, &p.display_name))
                .collect();

            // Handle ProcessState metric
            if rule.metric == Metric::ProcessState {
                let is_running = !matching.is_empty();
                let trigger_on_running = rule.threshold >= 1.0;
                let should_trigger = if trigger_on_running {
                    is_running
                } else {
                    !is_running
                };

                let state_label = if trigger_on_running {
                    "Running"
                } else {
                    "Stopped"
                };

                if should_trigger {
                    let pid = if is_running { matching[0].pid } else { 0 };
                    let tracker = trackers
                        .entry(rule.id.clone())
                        .or_insert_with(|| ProcessTracker::new(pid));

                    let duration_met = tracker.update(true, rule.duration_secs);
                    let elapsed = tracker.elapsed_secs();

                    let status = RuleStatus {
                        rule_id: rule.id.clone(),
                        process_name: rule.process_name.clone(),
                        metric: format!("ProcessState({})", state_label),
                        threshold: rule.threshold,
                        current_value: if is_running { 1.0 } else { 0.0 },
                        duration_secs: rule.duration_secs,
                        elapsed_secs: elapsed,
                        is_threshold_exceeded: true,
                        is_duration_met: duration_met,
                        is_triggered: false,
                    };
                    rule_statuses.push(status);

                    if duration_met && tracker.can_trigger(rule.cooldown_secs) {
                        tracker.mark_triggered();

                        if let Some(s) = rule_statuses.last_mut() {
                            s.is_triggered = true;
                        }

                        match &rule.trigger_mode {
                            TriggerMode::Auto => {
                                for action in &rule.actions {
                                    let (success, msg) = actions::execute_action(
                                        action,
                                        app,
                                        pid,
                                        &rule.process_name,
                                        &format!("ProcessState({})", state_label),
                                        if is_running { 1.0 } else { 0.0 },
                                        rule.duration_secs,
                                    );

                                    let log_entry =
                                        actions::build_log_entry(actions::LogEntryContext {
                                            rule_id: &rule.id,
                                            process_name: &rule.process_name,
                                            metric: &format!("ProcessState({})", state_label),
                                            value: if is_running { 1.0 } else { 0.0 },
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
                                            rule_id: rule.id.clone(),
                                            action_type: action.action_type_name(),
                                            success,
                                            message: msg,
                                        },
                                    );
                                }
                            }
                            TriggerMode::Prompt => {
                                let available_actions: Vec<ActionDetail> = rule
                                    .actions
                                    .iter()
                                    .enumerate()
                                    .map(|(i, a)| ActionDetail {
                                        index: i,
                                        label: a.label(),
                                        action_type: a.action_type_name(),
                                    })
                                    .collect();

                                let payload = ActionPromptPayload {
                                    rule_id: rule.id.clone(),
                                    process_name: rule.process_name.clone(),
                                    pid,
                                    metric: format!("ProcessState({})", state_label),
                                    value: if is_running { 1.0 } else { 0.0 },
                                    duration_secs: rule.duration_secs,
                                    available_actions,
                                };

                                self.create_alert_window(app, &rule.id, &payload);
                            }
                        }
                    }
                } else {
                    trackers.remove(&rule.id);
                }
                continue;
            }

            // Handle Running state (default behavior)
            if matching.is_empty() {
                trackers.remove(&rule.id);
                continue;
            }

            let proc = match matching.iter().max_by(|a, b| {
                let va = match rule.metric {
                    Metric::Cpu => a.cpu_usage,
                    Metric::Memory => a.memory_mb,
                    Metric::ProcessState => 0.0,
                };
                let vb = match rule.metric {
                    Metric::Cpu => b.cpu_usage,
                    Metric::Memory => b.memory_mb,
                    Metric::ProcessState => 0.0,
                };
                va.partial_cmp(&vb).unwrap_or(std::cmp::Ordering::Equal)
            }) {
                Some(p) => p,
                None => continue, // defensive: guarded by matching.is_empty() above
            };

            let current_value = match rule.metric {
                Metric::Cpu => proc.cpu_usage,
                Metric::Memory => match rule.memory_threshold_type {
                    MemoryThresholdType::Mb => proc.memory_mb,
                    MemoryThresholdType::Percent => proc.memory_percent,
                },
                Metric::ProcessState => 0.0,
            };
            let is_exceeded = if let Some(ref conditions) = rule.conditions {
                evaluate_condition(conditions, proc)
            } else {
                current_value > rule.threshold
            };

            let tracker = trackers
                .entry(rule.id.clone())
                .or_insert_with(|| ProcessTracker::new(proc.pid));
            tracker.pid = proc.pid;

            let duration_met = tracker.update(is_exceeded, rule.duration_secs);
            let elapsed = tracker.elapsed_secs();

            let status = RuleStatus {
                rule_id: rule.id.clone(),
                process_name: proc.display_name.clone(),
                metric: rule.metric.to_string(),
                threshold: rule.threshold,
                current_value,
                duration_secs: rule.duration_secs,
                elapsed_secs: elapsed,
                is_threshold_exceeded: is_exceeded,
                is_duration_met: duration_met,
                is_triggered: false,
            };

            rule_statuses.push(status);

            if duration_met && tracker.can_trigger(rule.cooldown_secs) {
                tracker.mark_triggered();

                if let Some(s) = rule_statuses.last_mut() {
                    s.is_triggered = true;
                }

                match &rule.trigger_mode {
                    TriggerMode::Auto => {
                        for action in &rule.actions {
                            let (success, msg) = actions::execute_action(
                                action,
                                app,
                                proc.pid,
                                &proc.display_name,
                                &rule.metric.to_string(),
                                current_value,
                                rule.duration_secs,
                            );

                            let log_entry = actions::build_log_entry(actions::LogEntryContext {
                                rule_id: &rule.id,
                                process_name: &proc.display_name,
                                metric: &rule.metric.to_string(),
                                value: current_value,
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
                                    rule_id: rule.id.clone(),
                                    action_type: action.action_type_name(),
                                    success,
                                    message: msg,
                                },
                            );
                        }
                    }
                    TriggerMode::Prompt => {
                        let available_actions: Vec<ActionDetail> = rule
                            .actions
                            .iter()
                            .enumerate()
                            .map(|(i, a)| ActionDetail {
                                index: i,
                                label: a.label(),
                                action_type: a.action_type_name(),
                            })
                            .collect();

                        let payload = ActionPromptPayload {
                            rule_id: rule.id.clone(),
                            process_name: proc.display_name.clone(),
                            pid: proc.pid,
                            metric: rule.metric.to_string(),
                            value: current_value,
                            duration_secs: rule.duration_secs,
                            available_actions,
                        };

                        self.create_alert_window(app, &rule.id, &payload);
                    }
                }
            }
        }

        drop(trackers);

        // Record history for trend charts
        if let Err(e) = self.record_history(&all_processes) {
            log::warn!("record_history failed: {}", e);
        }

        drop(sys);

        let update = MonitorUpdate {
            processes: all_processes,
            rule_statuses,
        };
        let _ = app.emit("monitor-update", update);
        Ok(())
    }
}
