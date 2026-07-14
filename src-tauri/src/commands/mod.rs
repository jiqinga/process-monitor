//! Tauri command handlers, grouped by domain.
//!
//! `AppState` lives here so all sub-modules and `lib.rs` can reach it via
//! `crate::commands::AppState`. Each submodule exposes its own
//! `#[tauri::command]` handlers. We use glob re-exports so that
//! `lib.rs` keeps calling `commands::<name>` without knowing the new
//! layout, and so that Tauri's macro-generated helper items
//! (`__cmd__<name>`, `__tauri_command_name_<name>`) remain reachable
//! by name at the `commands::` path expected by `generate_handler!`.

use crate::config::ConfigManager;
use crate::monitor::MonitorEngine;
use std::sync::Arc;

pub struct AppState {
    pub config: Arc<ConfigManager>,
    pub engine: Arc<MonitorEngine>,
}

mod logs;
mod processes;
mod rules;
mod system;
mod triggers;
mod windows;

pub use logs::*;
pub use processes::*;
pub use rules::*;
pub use system::*;
pub use triggers::*;
pub use windows::*;
