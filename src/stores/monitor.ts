import { defineStore, storeToRefs } from 'pinia';
import { listen } from '@tauri-apps/api/event';
import * as api from '@/api/tauri-commands';
import { useRuleStore } from './rule';
import { useProcessStore } from './process';
import { useUIStore } from './ui';
import type { ActionExecutedPayload, ActionPromptPayload, MonitorUpdate } from '@/types';

/**
 * Backward-compatible facade over the three domain stores:
 *   - {@link useRuleStore}    — rules + selectedRuleId
 *   - {@link useProcessStore} — processes / ruleStatuses / logs + per-PID ops
 *   - {@link useUIStore}      — settings / theme / actionPrompt / autostart
 *
 * New code should depend on the relevant focused store directly. This facade
 * exists so existing components keep working without a sweeping rename.
 * It also owns `startListening`, the single Tauri-event entry point that
 * fans events out to the correct sub-store.
 */
export const useMonitorStore = defineStore('monitor', () => {
  const rule = useRuleStore();
  const proc = useProcessStore();
  const ui = useUIStore();

  // Expose sub-store reactive state as refs (so consumers can both read and
  // assign, e.g. `store.rules = []` in tests).
  const { rules, selectedRuleId } = storeToRefs(rule);
  const { processes, ruleStatuses, logs } = storeToRefs(proc);
  const { settings, theme, actionPrompt } = storeToRefs(ui);

  /**
   * Subscribe to all Tauri events. Returns a list of unlisten functions
   * that the caller should run on teardown (typically `onBeforeUnmount`).
   */
  async function startListening(): Promise<Array<() => void>> {
    const unlistens = await Promise.all([
      listen<MonitorUpdate>('monitor-update', (event) => {
        proc.setProcesses(event.payload.processes);
        proc.setRuleStatuses(event.payload.rule_statuses);
      }),
      listen<ActionExecutedPayload>('action-executed', () => {
        proc.fetchLogs();
      }),
      listen<ActionPromptPayload>('show-action-prompt', (event) => {
        ui.setActionPrompt(event.payload);
      }),
      listen<{ title: string; body: string; position: string; duration_ms: number }>(
        'create-notification',
        (event) => {
          const { title, body } = event.payload;
          api.showNotificationWindow(title, body).catch(console.error);
        },
      ),
    ]);
    return unlistens;
  }

  return {
    // --- State (refs from sub-stores) -------------------------------------
    rules,
    selectedRuleId,
    processes,
    ruleStatuses,
    logs,
    settings,
    theme,
    actionPrompt,

    // --- Rule actions (delegated) -----------------------------------------
    fetchRules: rule.fetchRules,
    saveRule: rule.saveRule,
    deleteRule: rule.deleteRule,
    toggleRule: rule.toggleRule,
    setSelectedRuleId: rule.setSelectedRuleId,

    // --- Process actions (delegated) --------------------------------------
    fetchProcesses: proc.fetchProcesses,
    fetchLogs: proc.fetchLogs,
    fetchProcessHistory: proc.fetchProcessHistory,
    fetchSystemOverview: proc.fetchSystemOverview,
    killProcess: proc.killProcess,
    suspendProcess: proc.suspendProcess,
    resumeProcess: proc.resumeProcess,

    // --- UI actions (delegated) -------------------------------------------
    fetchSettings: ui.fetchSettings,
    saveSettings: ui.saveSettings,
    executeAction: ui.executeAction,
    cancelAction: ui.cancelAction,
    clearActionPrompt: ui.clearActionPrompt,
    applyTheme: ui.applyTheme,
    setTheme: ui.setTheme,
    initTheme: ui.initTheme,
    getAutostartEnabled: ui.getAutostartEnabled,
    setAutostartEnabled: ui.setAutostartEnabled,

    // --- Cross-cutting -----------------------------------------------------
    startListening,
  };
});
