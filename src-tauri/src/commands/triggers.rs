//! Rule-trigger commands invoked from the alert UI.

use crate::commands::AppState;
use crate::error::AppResult;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn execute_action(
    app: AppHandle,
    state: State<'_, AppState>,
    rule_id: String,
    action_index: usize,
) -> AppResult<()> {
    state
        .engine
        .execute_action_for_rule(&app, &rule_id, action_index)
}

#[tauri::command]
pub fn execute_all_actions(
    app: AppHandle,
    state: State<'_, AppState>,
    rule_id: String,
) -> AppResult<()> {
    state.engine.execute_all_actions_for_rule(&app, &rule_id)
}

#[tauri::command]
pub fn cancel_action(
    app: AppHandle,
    state: State<'_, AppState>,
    rule_id: String,
) -> AppResult<()> {
    state.engine.cancel_action_for_rule(&app, &rule_id)
}
