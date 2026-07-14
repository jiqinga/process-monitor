/**
 * Centralised, type-safe wrappers around all Tauri commands exposed by the
 * Rust backend. Components and stores should import from this module instead
 * of calling `invoke()` directly, so:
 *   - command names live in exactly one place (refactor-safe)
 *   - argument shape and return type are checked at compile time
 *   - the front/back-end contract is visible at a glance
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  ActionPromptPayload,
  AppSettings,
  LogEntry,
  ProcessHistory,
  ProcessInfo,
  Rule,
  SystemOverview,
} from '@/types';

// --- Rules ---------------------------------------------------------------

export const getRules = (): Promise<Rule[]> => invoke('get_rules');

export const saveRule = (rule: Rule): Promise<void> => invoke('save_rule', { rule });

export const deleteRule = (id: string): Promise<void> => invoke('delete_rule', { id });

export const toggleRule = (id: string, enabled: boolean): Promise<void> =>
  invoke('toggle_rule', { id, enabled });

// --- Processes -----------------------------------------------------------

export const getProcesses = (): Promise<ProcessInfo[]> => invoke('get_processes');

export const getProcessCmd = (processName: string): Promise<string> =>
  invoke('get_process_cmd', { processName });

export const getProcessHistory = (processName: string): Promise<ProcessHistory | null> =>
  invoke('get_process_history', { processName });

export const getSystemOverview = (): Promise<SystemOverview> => invoke('get_system_overview');

export const killProcessByPid = (pid: number): Promise<string> =>
  invoke('kill_process_by_pid', { pid });

export const suspendProcess = (pid: number): Promise<string> => invoke('suspend_process', { pid });

export const resumeProcess = (pid: number): Promise<string> => invoke('resume_process', { pid });

// --- Actions -------------------------------------------------------------

export const executeAction = (ruleId: string, actionIndex: number): Promise<void> =>
  invoke('execute_action', { ruleId, actionIndex });

export const executeAllActions = (ruleId: string): Promise<void> =>
  invoke('execute_all_actions', { ruleId });

export const cancelAction = (ruleId: string): Promise<void> => invoke('cancel_action', { ruleId });

// --- Settings ------------------------------------------------------------

export const getSettings = (): Promise<AppSettings> => invoke('get_settings');

export const saveSettings = (settings: AppSettings): Promise<void> =>
  invoke('save_settings', { settings });

// --- Windows -------------------------------------------------------------

export const createAlertWindow = (payload: ActionPromptPayload): Promise<void> =>
  invoke('create_alert_window', { payload });

export const showNotificationWindow = (title: string, body: string): Promise<void> =>
  invoke('show_notification_window', { title, body });

// --- Logs / Autostart ----------------------------------------------------

export const getLogs = (): Promise<LogEntry[]> => invoke('get_logs');

export const getAutostartEnabled = (): Promise<boolean> => invoke('get_autostart_enabled');

export const setAutostartEnabled = (enabled: boolean): Promise<void> =>
  invoke('set_autostart_enabled', { enabled });
