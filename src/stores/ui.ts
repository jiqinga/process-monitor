import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as api from '@/api/tauri-commands';
import type { ActionPromptPayload, AppSettings, ThemeMode } from '@/types';

/**
 * Owns user-facing preferences (settings, theme, language), the currently
 * displayed action prompt, and OS-level integrations (autostart). Anything
 * that affects how the UI looks or behaves outside of process data lives here.
 */
export const useUIStore = defineStore('ui', () => {
  const settings = ref<AppSettings>({
    log_retention_days: 30,
    notification_position: 'bottom-right',
    notification_duration_ms: 5000,
    dashboard_page_size: 20,
    dashboard_sort_field: 'cpu',
    dashboard_sort_order: 'desc',
    rules_page_size: 20,
    logs_page_size: 20,
  });
  const theme = ref<ThemeMode>('light');
  const actionPrompt = ref<ActionPromptPayload | null>(null);

  // --- Theme ---------------------------------------------------------------

  function applyTheme(mode: ThemeMode) {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode;
    localStorage.setItem('theme', mode);
    applyTheme(mode);
  }

  function initTheme() {
    const saved = localStorage.getItem('theme') as ThemeMode | null;
    theme.value = saved || 'light';
    applyTheme(theme.value);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') {
        applyTheme('system');
      }
    });
  }

  // --- Settings ------------------------------------------------------------

  async function fetchSettings() {
    const result = await api.getSettings();
    if (result) settings.value = result;
  }

  async function saveSettings(newSettings: AppSettings) {
    await api.saveSettings(newSettings);
    settings.value = newSettings;
  }

  // --- Action prompt -------------------------------------------------------

  function setActionPrompt(payload: ActionPromptPayload | null) {
    actionPrompt.value = payload;
  }

  function clearActionPrompt() {
    actionPrompt.value = null;
  }

  async function executeAction(ruleId: string, actionIndex: number) {
    await api.executeAction(ruleId, actionIndex);
  }

  async function cancelAction(ruleId: string) {
    await api.cancelAction(ruleId);
  }

  // --- Autostart -----------------------------------------------------------

  async function getAutostartEnabled(): Promise<boolean> {
    return await api.getAutostartEnabled();
  }

  async function setAutostartEnabled(enabled: boolean): Promise<void> {
    await api.setAutostartEnabled(enabled);
  }

  return {
    settings,
    theme,
    actionPrompt,
    applyTheme,
    setTheme,
    initTheme,
    fetchSettings,
    saveSettings,
    setActionPrompt,
    clearActionPrompt,
    executeAction,
    cancelAction,
    getAutostartEnabled,
    setAutostartEnabled,
  };
});
