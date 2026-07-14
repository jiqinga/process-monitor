//! System-wide commands: settings, overview, autostart.

use crate::commands::AppState;
use crate::error::{AppError, AppResult};
use crate::monitor;
use crate::types::{AppSettings, SystemOverview};
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<AppSettings> {
    state.config.get_settings()
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: AppSettings) -> AppResult<()> {
    state.config.save_settings(settings)
}

#[tauri::command]
pub fn get_autostart_enabled(app: AppHandle) -> bool {
    let autostart_manager = app.autolaunch();
    autostart_manager.is_enabled().unwrap_or(false)
}

#[tauri::command]
pub fn set_autostart_enabled(app: AppHandle, enabled: bool) -> AppResult<()> {
    let autostart_manager = app.autolaunch();
    if enabled {
        autostart_manager
            .enable()
            .map_err(|e| AppError::os_api(e.to_string()))
    } else {
        autostart_manager
            .disable()
            .map_err(|e| AppError::os_api(e.to_string()))
    }
}

#[tauri::command]
pub fn get_system_overview(state: State<'_, AppState>) -> AppResult<SystemOverview> {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_all();

    let num_cpus = sys.cpus().len() as f32;
    let total_cpu: f32 = sys.cpus().iter().map(|c| c.cpu_usage()).sum::<f32>() / num_cpus;
    let total_memory_mb = sys.total_memory() as f32 / 1024.0 / 1024.0;
    let used_memory_mb = sys.used_memory() as f32 / 1024.0 / 1024.0;
    let total_memory_usage = if total_memory_mb > 0.0 {
        used_memory_mb / total_memory_mb * 100.0
    } else {
        0.0
    };

    let process_count = sys.processes().len() as u32;

    let rules = state.config.get_rules()?;
    let enabled_rules: Vec<_> = rules.iter().filter(|r| r.enabled).collect();
    let monitored_count = enabled_rules.len() as u32;

    let service_pid_map = monitor::build_service_pid_map();
    let mut triggered_count = 0u32;

    for rule in &enabled_rules {
        let matching: Vec<_> = sys
            .processes()
            .iter()
            .filter(|(_, p)| {
                let name = p.name().to_string_lossy().to_string();
                let display_name = monitor::resolve_display_name(p, &service_pid_map);
                monitor::matches_glob(&rule.process_name, &name, &display_name)
            })
            .collect();

        if !matching.is_empty() {
            triggered_count += 1;
        }
    }

    Ok(SystemOverview {
        total_cpu_usage: total_cpu,
        total_memory_usage,
        total_memory_mb,
        used_memory_mb,
        process_count,
        monitored_count,
        triggered_count,
    })
}
