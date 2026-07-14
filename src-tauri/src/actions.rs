use crate::commands::AppState;
use crate::types::{Action, CommandStep, LogEntry, NotificationPayload};
use chrono::Local;
use log::{error, info};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Check if a process with the given PID still exists on the system.
/// Returns true if the process is still running, false if it's gone.
#[cfg(target_os = "windows")]
fn check_pid_exists(pid: u32) -> bool {
    match Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/NH", "/FO", "CSV"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            // tasklist returns "INFO: No tasks are running..." if no match
            // or a CSV line like '"process.exe","1234","..."'
            !stdout.contains("No tasks") && stdout.contains(&pid.to_string())
        }
        Err(_) => false,
    }
}

// Only invoked from the Windows-specific kill_process verification path;
// kept for cross-platform parity but unused on non-Windows targets.
#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn check_pid_exists(pid: u32) -> bool {
    match Command::new("kill").args(["-0", &pid.to_string()]).output() {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

/// Execute a single action for a given process
pub fn execute_action(
    action: &Action,
    app: &AppHandle,
    pid: u32,
    process_name: &str,
    metric: &str,
    value: f32,
    duration_secs: u64,
) -> (bool, String) {
    match action {
        Action::KillProcess => kill_process(pid),
        Action::StartProcess { cmd } => start_process(cmd),
        Action::RunCommand { steps } => run_command_steps(steps),
        Action::ShowNotification { title, body } => show_notification(app, title, body),
        Action::WriteLog => {
            let msg = format!(
                "Process {} (PID {}) exceeded {} threshold ({:.1}%) for {}s",
                process_name, pid, metric, value, duration_secs
            );
            info!("{}", msg);
            (true, msg)
        }
    }
}

/// Kill a process by PID using taskkill on Windows
fn kill_process(pid: u32) -> (bool, String) {
    // PID 0 is the System Idle Process on Windows, cannot be killed
    if pid == 0 {
        return (
            false,
            "Cannot kill PID 0 (process already stopped)".to_string(),
        );
    }

    #[cfg(target_os = "windows")]
    {
        match Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            Ok(output) => {
                let msg = String::from_utf8_lossy(&output.stdout).to_string();
                let err = String::from_utf8_lossy(&output.stderr).to_string();

                if output.status.success() {
                    // Verify the process is actually gone after kill
                    if check_pid_exists(pid) {
                        error!("taskkill returned success but PID {} still exists", pid);
                        (
                            false,
                            format!(
                                "Process {} kill reported success but process still alive",
                                pid
                            ),
                        )
                    } else {
                        info!("Killed process PID {}: {}", pid, msg.trim());
                        (true, format!("Process {} killed", pid))
                    }
                } else {
                    error!("Failed to kill PID {}: {}", pid, err);
                    (false, format!("Failed to kill PID {}: {}", pid, err))
                }
            }
            Err(e) => {
                error!("taskkill failed: {}", e);
                (false, format!("taskkill error: {}", e))
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        match Command::new("kill").args(["-9", &pid.to_string()]).output() {
            Ok(output) => {
                if output.status.success() {
                    (true, format!("Process {} killed", pid))
                } else {
                    let err = String::from_utf8_lossy(&output.stderr).to_string();
                    (false, format!("Failed to kill PID {}: {}", pid, err))
                }
            }
            Err(e) => (false, format!("kill error: {}", e)),
        }
    }
}

/// Start a process with the given command
fn start_process(start_cmd: &str) -> (bool, String) {
    match run_single_command(start_cmd) {
        (true, msg) => (true, format!("Process started: {}", msg)),
        (false, msg) => (false, format!("Failed to start process: {}", msg)),
    }
}

/// Run multiple command steps sequentially with optional delays between them
fn run_command_steps(steps: &[CommandStep]) -> (bool, String) {
    let mut results = Vec::new();
    for (i, step) in steps.iter().enumerate() {
        if step.cmd.trim().is_empty() {
            continue;
        }
        let (success, msg) = run_single_command(&step.cmd);
        results.push(format!("[{}] {}", i + 1, msg));
        if !success {
            return (false, results.join("; "));
        }
        // Wait delay between commands (skip for last command)
        if i < steps.len() - 1 && step.delay_ms > 0 {
            std::thread::sleep(std::time::Duration::from_millis(step.delay_ms));
        }
    }
    if results.is_empty() {
        (false, "No commands to execute".to_string())
    } else {
        (true, results.join("; "))
    }
}

/// Run a single CMD command silently
fn run_single_command(cmd: &str) -> (bool, String) {
    #[cfg(target_os = "windows")]
    {
        match Command::new("cmd")
            .args(["/C", cmd])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                if output.status.success() {
                    info!("Command '{}' succeeded: {}", cmd, stdout);
                    (true, format!("Command executed: {}", cmd))
                } else {
                    error!("Command '{}' failed: {}", cmd, stderr);
                    (false, format!("Command failed: {}", stderr))
                }
            }
            Err(e) => {
                error!("Failed to run command '{}': {}", cmd, e);
                (false, format!("Command error: {}", e))
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        match Command::new("sh").args(["-c", cmd]).output() {
            Ok(output) => {
                if output.status.success() {
                    (true, format!("Command executed: {}", cmd))
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    (false, format!("Command failed: {}", stderr))
                }
            }
            Err(e) => (false, format!("Command error: {}", e)),
        }
    }
}

/// Inputs for building a [`LogEntry`] after executing an [`Action`].
/// Grouped into a single struct to keep [`build_log_entry`] readable.
pub struct LogEntryContext<'a> {
    pub rule_id: &'a str,
    pub process_name: &'a str,
    pub metric: &'a str,
    pub value: f32,
    pub duration_secs: u64,
    pub action: &'a Action,
    pub success: bool,
    pub message: &'a str,
}

/// Build a LogEntry from action execution result
pub fn build_log_entry(ctx: LogEntryContext<'_>) -> LogEntry {
    LogEntry {
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        rule_id: ctx.rule_id.to_string(),
        process_name: ctx.process_name.to_string(),
        metric: ctx.metric.to_string(),
        value: ctx.value,
        duration_secs: ctx.duration_secs,
        action_type: ctx.action.action_type_name(),
        result: if ctx.success {
            "Success".to_string()
        } else {
            format!("Failed: {}", ctx.message)
        },
    }
}

/// Show a notification by emitting an event to the main window
/// The main window's frontend will create the notification window using JS API
fn show_notification(app: &AppHandle, title: &str, body: &str) -> (bool, String) {
    let settings = {
        let state = app.state::<AppState>();
        match state.config.get_settings() {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to load settings for notification: {}", e);
                return (false, format!("Failed to load settings: {}", e));
            }
        }
    };

    let payload = NotificationPayload {
        title: title.to_string(),
        body: body.to_string(),
        position: settings.notification_position.clone(),
        duration_ms: settings.notification_duration_ms,
    };

    // Emit event to the main window, asking it to create the notification window
    match app.emit("create-notification", &payload) {
        Ok(_) => {
            info!("Notification event emitted: {}", title);
            (true, format!("Notification event emitted: {}", title))
        }
        Err(e) => {
            error!("Failed to emit notification event: {}", e);
            (false, format!("Failed to emit notification event: {}", e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Action, CommandStep};

    #[test]
    fn action_type_name_covers_all_variants() {
        assert_eq!(Action::KillProcess.action_type_name(), "KillProcess");
        assert_eq!(
            Action::StartProcess { cmd: "x".into() }.action_type_name(),
            "StartProcess"
        );
        assert_eq!(
            Action::RunCommand { steps: vec![] }.action_type_name(),
            "RunCommand"
        );
        assert_eq!(
            Action::ShowNotification {
                title: "t".into(),
                body: "b".into()
            }
            .action_type_name(),
            "ShowNotification"
        );
        assert_eq!(Action::WriteLog.action_type_name(), "WriteLog");
    }

    #[test]
    fn action_label_formats_runcommand() {
        let action = Action::RunCommand {
            steps: vec![
                CommandStep {
                    cmd: "echo a".into(),
                    delay_ms: 0,
                },
                CommandStep {
                    cmd: "echo b".into(),
                    delay_ms: 0,
                },
            ],
        };
        assert_eq!(action.label(), "Run: echo a | echo b");
    }

    #[test]
    fn action_label_formats_notification() {
        let action = Action::ShowNotification {
            title: "warn".into(),
            body: "body".into(),
        };
        assert_eq!(action.label(), "Notify: warn");
    }

    #[test]
    fn run_command_steps_returns_failure_on_empty_input() {
        let (success, msg) = run_command_steps(&[]);
        assert!(!success);
        assert!(msg.contains("No commands"));
    }

    #[test]
    fn run_command_steps_skips_blank_cmds() {
        let steps = vec![
            CommandStep {
                cmd: "   ".into(),
                delay_ms: 0,
            },
            CommandStep {
                cmd: "\t".into(),
                delay_ms: 0,
            },
        ];
        let (success, msg) = run_command_steps(&steps);
        // All steps were blank -> treated as empty
        assert!(!success);
        assert!(msg.contains("No commands"));
    }

    #[test]
    fn build_log_entry_marks_failure_with_message() {
        let action = Action::KillProcess;
        let entry = build_log_entry(LogEntryContext {
            rule_id: "r1",
            process_name: "proc",
            metric: "Cpu",
            value: 75.0,
            duration_secs: 10,
            action: &action,
            success: false,
            message: "boom",
        });
        assert_eq!(entry.rule_id, "r1");
        assert_eq!(entry.process_name, "proc");
        assert_eq!(entry.metric, "Cpu");
        assert_eq!(entry.value, 75.0);
        assert_eq!(entry.duration_secs, 10);
        assert_eq!(entry.action_type, "KillProcess");
        assert_eq!(entry.result, "Failed: boom");
        assert!(!entry.timestamp.is_empty());
    }

    #[test]
    fn build_log_entry_marks_success_without_message() {
        let action = Action::WriteLog;
        let entry = build_log_entry(LogEntryContext {
            rule_id: "r2",
            process_name: "proc",
            metric: "Memory",
            value: 80.0,
            duration_secs: 5,
            action: &action,
            success: true,
            message: "ignored",
        });
        assert_eq!(entry.action_type, "WriteLog");
        assert_eq!(entry.result, "Success");
    }

    #[test]
    fn kill_process_rejects_pid_zero() {
        let (success, msg) = kill_process(0);
        assert!(!success);
        assert!(msg.contains("PID 0"));
    }
}
