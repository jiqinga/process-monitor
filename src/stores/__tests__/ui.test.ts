import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '../ui';
import * as api from '@/api/tauri-commands';
import type { ActionPromptPayload, AppSettings } from '@/types';

vi.mock('@/api/tauri-commands', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  executeAction: vi.fn(),
  cancelAction: vi.fn(),
  getAutostartEnabled: vi.fn(),
  setAutostartEnabled: vi.fn(),
}));

function makePrompt(): ActionPromptPayload {
  return {
    rule_id: 'r1',
    process_name: 'chrome.exe',
    pid: 1234,
    metric: 'Cpu',
    value: 95.5,
    duration_secs: 10,
    available_actions: [{ index: 0, label: 'Kill', action_type: 'KillProcess' }],
  };
}

describe('useUIStore', () => {
  let store: ReturnType<typeof useUIStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUIStore();
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  describe('initial state', () => {
    it('has reasonable default settings', () => {
      expect(store.settings).toEqual({
        log_retention_days: 30,
        notification_position: 'bottom-right',
        notification_duration_ms: 5000,
        dashboard_page_size: 20,
        dashboard_sort_field: 'cpu',
        dashboard_sort_order: 'desc',
        rules_page_size: 20,
        logs_page_size: 20,
      });
    });

    it('defaults theme to light and actionPrompt to null', () => {
      expect(store.theme).toBe('light');
      expect(store.actionPrompt).toBeNull();
    });
  });

  describe('applyTheme', () => {
    it('adds the `dark` class for mode=dark', () => {
      store.applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes the `dark` class for mode=light', () => {
      document.documentElement.classList.add('dark');
      store.applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('mode=system follows the OS preference', () => {
      const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      store.applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      matchMediaSpy.mockRestore();
    });
  });

  describe('setTheme', () => {
    it('updates state, persists to localStorage and applies the class', () => {
      store.setTheme('dark');
      expect(store.theme).toBe('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('initTheme', () => {
    it('reads the persisted theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      // matchMedia for the `system` change listener must be callable
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      store.initTheme();
      expect(store.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('falls back to light when nothing is persisted', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      store.initTheme();
      expect(store.theme).toBe('light');
    });
  });

  describe('fetchSettings / saveSettings', () => {
    it('fetchSettings replaces settings with the api response', async () => {
      const next: AppSettings = {
        log_retention_days: 7,
        notification_position: 'top-left',
        notification_duration_ms: 3000,
        dashboard_page_size: 50,
        dashboard_sort_field: 'mem',
        dashboard_sort_order: 'asc',
        rules_page_size: 50,
        logs_page_size: 50,
      };
      vi.mocked(api.getSettings).mockResolvedValue(next);

      await store.fetchSettings();
      expect(store.settings).toEqual(next);
    });

    it('saveSettings writes then mirrors the payload locally (no read-back)', async () => {
      vi.mocked(api.saveSettings).mockResolvedValue(undefined);
      const next: AppSettings = { ...store.settings, log_retention_days: 7 };

      await store.saveSettings(next);

      expect(api.saveSettings).toHaveBeenCalledWith(next);
      expect(store.settings).toEqual(next);
      // Unlike rules, ui store trusts the local payload — no follow-up fetch
      expect(api.getSettings).not.toHaveBeenCalled();
    });
  });

  describe('action prompt', () => {
    it('setActionPrompt stores the payload', () => {
      const p = makePrompt();
      store.setActionPrompt(p);
      expect(store.actionPrompt).toEqual(p);
    });

    it('clearActionPrompt resets to null', () => {
      store.setActionPrompt(makePrompt());
      store.clearActionPrompt();
      expect(store.actionPrompt).toBeNull();
    });
  });

  describe('execute / cancel action pass through to api', () => {
    it('executeAction', async () => {
      vi.mocked(api.executeAction).mockResolvedValue(undefined);
      await store.executeAction('r1', 0);
      expect(api.executeAction).toHaveBeenCalledWith('r1', 0);
    });

    it('cancelAction', async () => {
      vi.mocked(api.cancelAction).mockResolvedValue(undefined);
      await store.cancelAction('r1');
      expect(api.cancelAction).toHaveBeenCalledWith('r1');
    });
  });

  describe('autostart pass-through', () => {
    it('getAutostartEnabled returns the api boolean', async () => {
      vi.mocked(api.getAutostartEnabled).mockResolvedValue(true);
      await expect(store.getAutostartEnabled()).resolves.toBe(true);
    });

    it('setAutostartEnabled forwards the flag', async () => {
      vi.mocked(api.setAutostartEnabled).mockResolvedValue(undefined);
      await store.setAutostartEnabled(false);
      expect(api.setAutostartEnabled).toHaveBeenCalledWith(false);
    });
  });
});
