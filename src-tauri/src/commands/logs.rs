//! Log query commands.

use crate::commands::AppState;
use crate::error::AppResult;
use crate::types::LogEntry;
use tauri::State;

#[tauri::command]
pub fn get_logs(state: State<'_, AppState>) -> AppResult<Vec<LogEntry>> {
    state.config.get_logs()
}
