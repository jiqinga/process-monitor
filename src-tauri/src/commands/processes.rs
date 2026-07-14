//! Process inspection and OS-level process control commands.

use crate::commands::AppState;
use crate::error::{AppError, AppResult};
use crate::monitor;
use crate::types::{ProcessHistory, ProcessInfo};
use tauri::State;

#[tauri::command]
pub fn get_processes() -> Vec<ProcessInfo> {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_all();

    let num_cpus = sys.cpus().len() as f32;
    let total_memory_mb = sys.total_memory() as f32 / 1024.0 / 1024.0;

    let service_pid_map = monitor::build_service_pid_map();

    sys.processes()
        .iter()
        .map(|(pid, proc_info)| {
            let display_name = monitor::resolve_display_name(proc_info, &service_pid_map);
            let mem_mb = proc_info.memory() as f32 / 1024.0 / 1024.0;
            ProcessInfo {
                pid: pid.as_u32(),
                name: proc_info.name().to_string_lossy().to_string(),
                display_name,
                cpu_usage: proc_info.cpu_usage() / num_cpus,
                memory_mb: mem_mb,
                memory_percent: if total_memory_mb > 0.0 {
                    mem_mb / total_memory_mb * 100.0
                } else {
                    0.0
                },
                cmd: proc_info
                    .cmd()
                    .iter()
                    .map(|s| s.to_string_lossy().to_string())
                    .collect::<Vec<_>>()
                    .join(" "),
                parent_pid: proc_info.parent().map(|p| p.as_u32()).unwrap_or(0),
                user: proc_info
                    .user_id()
                    .map(|u| u.to_string())
                    .unwrap_or_default(),
                start_time: String::new(),
                threads: 0,
                status: String::new(),
            }
        })
        .collect()
}

#[tauri::command]
pub fn get_process_cmd(process_name: String) -> AppResult<String> {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_all();

    let service_pid_map = monitor::build_service_pid_map();
    let target = process_name.to_lowercase();

    let mut candidates: Vec<String> = Vec::new();

    for proc_info in sys.processes().values() {
        let name = proc_info.name().to_string_lossy().to_string();
        let display_name = monitor::resolve_display_name(proc_info, &service_pid_map);

        if name.to_lowercase() == target || display_name.to_lowercase() == target {
            let cmd = proc_info
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_string())
                .collect::<Vec<_>>()
                .join(" ");
            if !cmd.is_empty() {
                candidates.push(cmd);
            }
        }
    }

    if candidates.is_empty() {
        return Err(AppError::not_found(format!(
            "未找到正在运行的进程「{}」，无法获取启动命令",
            process_name
        )));
    }

    candidates.sort_by_key(|a| a.len());
    Ok(candidates[0].clone())
}

#[tauri::command]
pub fn get_process_history(
    state: State<'_, AppState>,
    process_name: String,
) -> AppResult<Option<ProcessHistory>> {
    state.engine.get_process_history(&process_name)
}

/// Process control operations supported across platforms.
#[derive(Clone, Copy)]
enum ProcessControl {
    Kill,
    Suspend,
    Resume,
}

impl ProcessControl {
    fn verb(self) -> &'static str {
        match self {
            ProcessControl::Kill => "terminate",
            ProcessControl::Suspend => "suspend",
            ProcessControl::Resume => "resume",
        }
    }

    fn past_tense(self) -> &'static str {
        match self {
            ProcessControl::Kill => "terminated",
            ProcessControl::Suspend => "suspended",
            ProcessControl::Resume => "resumed",
        }
    }
}

#[cfg(target_os = "windows")]
fn build_control_command(op: ProcessControl, pid: u32) -> (&'static str, Vec<String>) {
    match op {
        ProcessControl::Kill => (
            "taskkill",
            vec!["/F".to_string(), "/PID".to_string(), pid.to_string()],
        ),
        ProcessControl::Suspend => (
            "powershell",
            vec![
                "-Command".to_string(),
                format!("Suspend-Process -Id {} -ErrorAction Stop", pid),
            ],
        ),
        ProcessControl::Resume => (
            "powershell",
            vec![
                "-Command".to_string(),
                format!("Resume-Process -Id {} -ErrorAction Stop", pid),
            ],
        ),
    }
}

#[cfg(not(target_os = "windows"))]
fn build_control_command(op: ProcessControl, pid: u32) -> (&'static str, Vec<String>) {
    let signal = match op {
        ProcessControl::Kill => "-9",
        ProcessControl::Suspend => "-STOP",
        ProcessControl::Resume => "-CONT",
    };
    ("kill", vec![signal.to_string(), pid.to_string()])
}

/// Dispatch a process-control action to the OS and translate the outcome
/// into an [`AppResult`].
fn run_process_control(op: ProcessControl, pid: u32) -> AppResult<String> {
    use std::process::Command;

    let (program, args) = build_control_command(op, pid);
    let output = Command::new(program)
        .args(&args)
        .output()
        .map_err(|e| AppError::os_api(format!("Failed to {} process {}: {}", op.verb(), pid, e)))?;

    if output.status.success() {
        Ok(format!("Process {} {} successfully", pid, op.past_tense()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(AppError::os_api(format!(
            "Failed to {} process {}: {}",
            op.verb(),
            pid,
            stderr
        )))
    }
}

#[tauri::command]
pub fn kill_process_by_pid(pid: u32) -> AppResult<String> {
    run_process_control(ProcessControl::Kill, pid)
}

#[tauri::command]
pub fn suspend_process(pid: u32) -> AppResult<String> {
    run_process_control(ProcessControl::Suspend, pid)
}

#[tauri::command]
pub fn resume_process(pid: u32) -> AppResult<String> {
    run_process_control(ProcessControl::Resume, pid)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn process_control_verb_matches_op() {
        assert_eq!(ProcessControl::Kill.verb(), "terminate");
        assert_eq!(ProcessControl::Suspend.verb(), "suspend");
        assert_eq!(ProcessControl::Resume.verb(), "resume");
    }

    #[test]
    fn process_control_past_tense_matches_op() {
        assert_eq!(ProcessControl::Kill.past_tense(), "terminated");
        assert_eq!(ProcessControl::Suspend.past_tense(), "suspended");
        assert_eq!(ProcessControl::Resume.past_tense(), "resumed");
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn build_control_command_windows_kill_uses_taskkill_force() {
        let (program, args) = build_control_command(ProcessControl::Kill, 1234);
        assert_eq!(program, "taskkill");
        assert_eq!(args, vec!["/F".to_string(), "/PID".to_string(), "1234".to_string()]);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn build_control_command_windows_suspend_uses_powershell() {
        let (program, args) = build_control_command(ProcessControl::Suspend, 42);
        assert_eq!(program, "powershell");
        assert_eq!(args.len(), 2);
        assert_eq!(args[0], "-Command");
        assert!(args[1].contains("Suspend-Process"));
        assert!(args[1].contains("-Id 42"));
        assert!(args[1].contains("-ErrorAction Stop"));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn build_control_command_windows_resume_uses_powershell() {
        let (program, args) = build_control_command(ProcessControl::Resume, 7);
        assert_eq!(program, "powershell");
        assert!(args[1].contains("Resume-Process"));
        assert!(args[1].contains("-Id 7"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn build_control_command_unix_kill_sends_sigkill() {
        let (program, args) = build_control_command(ProcessControl::Kill, 99);
        assert_eq!(program, "kill");
        assert_eq!(args, vec!["-9".to_string(), "99".to_string()]);
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn build_control_command_unix_suspend_sends_sigstop() {
        let (_, args) = build_control_command(ProcessControl::Suspend, 99);
        assert_eq!(args[0], "-STOP");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn build_control_command_unix_resume_sends_sigcont() {
        let (_, args) = build_control_command(ProcessControl::Resume, 99);
        assert_eq!(args[0], "-CONT");
    }
}
