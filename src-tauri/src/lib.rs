mod actions;
mod commands;
mod config;
mod error;
mod monitor;
mod types;

use commands::AppState;
use config::ConfigManager;
use monitor::MonitorEngine;
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let config = Arc::new(ConfigManager::new());
    let engine = Arc::new(MonitorEngine::new(config.clone()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .manage(AppState {
            config: config.clone(),
            engine: engine.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_rules,
            commands::save_rule,
            commands::delete_rule,
            commands::toggle_rule,
            commands::get_processes,
            commands::get_process_cmd,
            commands::get_logs,
            commands::execute_action,
            commands::execute_all_actions,
            commands::cancel_action,
            commands::create_alert_window,
            commands::get_settings,
            commands::save_settings,
            commands::show_notification_window,
            commands::get_process_history,
            commands::get_autostart_enabled,
            commands::set_autostart_enabled,
            commands::get_system_overview,
            commands::kill_process_by_pid,
            commands::suspend_process,
            commands::resume_process,
        ])
        .setup(move |app| {
            // 创建系统托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 创建系统托盘图标
            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Process Monitor");
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            } else {
                log::warn!("default_window_icon unavailable; tray icon not set");
            }
            let _tray = tray_builder
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        // Signal the monitor loop to stop before terminating
                        // the process, so a tick currently sleeping won't
                        // start another iteration during teardown.
                        if let Some(state) = app.try_state::<AppState>() {
                            state.engine.shutdown();
                        }
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 决定主窗口初始显隐：
            // 仅当「本次由自启项拉起（命令行携带 --minimized）」且
            // 「用户开启了 start_minimized」时，才保持隐藏、仅驻留托盘；
            // 其余情况（手动启动 / 未开启静默）一律正常显示，避免闪窗或误藏。
            let launched_minimized = std::env::args().any(|arg| arg == "--minimized");
            let want_start_minimized = app
                .try_state::<AppState>()
                .and_then(|state| state.config.get_settings().ok())
                .map(|settings| settings.start_minimized)
                .unwrap_or(false);

            if !(launched_minimized && want_start_minimized) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            let handle = app.handle().clone();
            let engine_clone = engine.clone();

            std::thread::spawn(move || {
                engine_clone.run(&handle);
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // 拦截关闭事件，最小化到托盘而不是退出
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            log::error!("Tauri runtime exited with error: {}", e);
            eprintln!("Tauri runtime exited with error: {}", e);
            std::process::exit(1);
        });
}
