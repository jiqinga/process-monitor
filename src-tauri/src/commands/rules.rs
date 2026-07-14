//! Rule CRUD commands.

use crate::commands::AppState;
use crate::error::AppResult;
use crate::types::Rule;
use tauri::State;

#[tauri::command]
pub fn get_rules(state: State<'_, AppState>) -> AppResult<Vec<Rule>> {
    state.config.get_rules()
}

#[tauri::command]
pub fn save_rule(state: State<'_, AppState>, rule: Rule) -> AppResult<()> {
    state.config.save_rule(rule)
}

#[tauri::command]
pub fn delete_rule(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.config.delete_rule(&id)
}

#[tauri::command]
pub fn toggle_rule(state: State<'_, AppState>, id: String, enabled: bool) -> AppResult<()> {
    state.config.toggle_rule(&id, enabled)
}
