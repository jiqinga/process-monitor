//! Webview window creation commands (alert popup, transient notifications).

use crate::commands::AppState;
use crate::error::{AppError, AppResult};
use crate::types::{ActionPromptPayload, NotificationPayload};
use tauri::webview::WebviewWindowBuilder;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn create_alert_window(app: AppHandle, payload: ActionPromptPayload) -> AppResult<()> {
    let window_label = format!("alert-{}", payload.rule_id);

    if app.get_webview_window(&window_label).is_some() {
        return Ok(());
    }

    let payload_json = serde_json::to_string(&payload)?;
    let encoded_payload = urlencoding::encode(&payload_json);
    let url = format!("/alert?data={}", encoded_payload);

    WebviewWindowBuilder::new(&app, &window_label, tauri::WebviewUrl::App(url.into()))
        .title("进程告警")
        .inner_size(560.0, 750.0)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .center()
        .build()?;

    Ok(())
}

#[tauri::command]
pub fn show_notification_window(app: AppHandle, title: String, body: String) -> AppResult<()> {
    let settings = {
        let state = app.state::<AppState>();
        state.config.get_settings()?
    };

    let payload = NotificationPayload {
        title,
        body,
        position: settings.notification_position.clone(),
        duration_ms: settings.notification_duration_ms,
    };

    let payload_json = serde_json::to_string(&payload)?;
    let encoded = urlencoding::encode(&payload_json);
    let url = format!("/notification?data={}", encoded);

    let label = format!(
        "notif-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );

    let (x, y) = calculate_notification_position(&app, &settings.notification_position)?;

    let app2 = app.clone();
    std::thread::spawn(move || {
        let app_for_window = app2.clone();
        let _ = app2.run_on_main_thread(move || {
            if let Err(e) = WebviewWindowBuilder::new(
                &app_for_window,
                &label,
                tauri::WebviewUrl::App(url.into()),
            )
            .title("通知")
            .inner_size(380.0, 80.0)
            .resizable(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .position(x, y)
            .visible(false)
            .build()
            {
                log::error!("Failed to create notification window: {}", e);
            }
        });
    });

    Ok(())
}

/// Compute the on-screen position for a transient notification window
/// based on the user's preferred corner.
fn calculate_notification_position(app: &AppHandle, position: &str) -> AppResult<(f64, f64)> {
    let monitor = app
        .primary_monitor()?
        .ok_or_else(|| AppError::not_found("No monitor found"))?;
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    let scale = monitor.scale_factor();

    // Tauri 2 position() accepts logical pixels, but monitor returns physical pixels
    let screen_w = monitor_size.width as f64 / scale;
    let screen_h = monitor_size.height as f64 / scale;
    let offset_x = monitor_pos.x as f64 / scale;
    let offset_y = monitor_pos.y as f64 / scale;

    let win_w = 380.0;
    let win_h = 80.0;
    let margin = 20.0;

    let (x, y) = match position {
        "top-left" => (offset_x + margin, offset_y + margin),
        "top-right" => (offset_x + screen_w - win_w - margin, offset_y + margin),
        "bottom-left" => (offset_x + margin, offset_y + screen_h - win_h - margin),
        _ => (
            offset_x + screen_w - win_w - margin,
            offset_y + screen_h - win_h - margin,
        ),
    };

    Ok((x, y))
}
