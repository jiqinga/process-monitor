import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRuleStore } from '../rule';
import * as api from '@/api/tauri-commands';
import type { Rule } from '@/types';

vi.mock('@/api/tauri-commands', () => ({
  getRules: vi.fn(),
  saveRule: vi.fn(),
  deleteRule: vi.fn(),
  toggleRule: vi.fn(),
}));

function makeRule(id: string, overrides: Partial<Rule> = {}): Rule {
  return {
    id,
    process_name: 'chrome.exe',
    metric: 'Cpu',
    memory_threshold_type: 'Percent',
    threshold: 80,
    duration_secs: 10,
    cooldown_secs: 60,
    enabled: true,
    trigger_mode: 'Auto',
    actions: ['WriteLog'],
    conditions: undefined,
    ...overrides,
  };
}

describe('useRuleStore', () => {
  let store: ReturnType<typeof useRuleStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useRuleStore();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty rules and no selection', () => {
      expect(store.rules).toEqual([]);
      expect(store.selectedRuleId).toBeNull();
    });
  });

  describe('fetchRules', () => {
    it('replaces rules with the api response', async () => {
      const rules = [makeRule('r1'), makeRule('r2')];
      vi.mocked(api.getRules).mockResolvedValue(rules);

      await store.fetchRules();

      expect(api.getRules).toHaveBeenCalledTimes(1);
      expect(store.rules).toEqual(rules);
    });

    it('propagates errors so callers can handle them', async () => {
      vi.mocked(api.getRules).mockRejectedValue(new Error('backend down'));
      await expect(store.fetchRules()).rejects.toThrow('backend down');
      expect(store.rules).toEqual([]);
    });
  });

  describe('saveRule', () => {
    it('saves then refreshes the list from the backend (write-through)', async () => {
      const rule = makeRule('r1');
      const refreshed = [makeRule('r1', { threshold: 95 })];
      vi.mocked(api.saveRule).mockResolvedValue(undefined);
      vi.mocked(api.getRules).mockResolvedValue(refreshed);

      await store.saveRule(rule);

      expect(api.saveRule).toHaveBeenCalledWith(rule);
      expect(api.getRules).toHaveBeenCalledTimes(1);
      // Store reflects the backend's view, not the local payload — so server-side
      // normalization (e.g. threshold clamping) shows up immediately.
      expect(store.rules).toEqual(refreshed);
    });

    it('does not call getRules if saveRule fails', async () => {
      vi.mocked(api.saveRule).mockRejectedValue(new Error('disk full'));
      await expect(store.saveRule(makeRule('r1'))).rejects.toThrow('disk full');
      expect(api.getRules).not.toHaveBeenCalled();
    });
  });

  describe('deleteRule', () => {
    it('deletes by id then refreshes', async () => {
      vi.mocked(api.deleteRule).mockResolvedValue(undefined);
      vi.mocked(api.getRules).mockResolvedValue([makeRule('r2')]);

      await store.deleteRule('r1');

      expect(api.deleteRule).toHaveBeenCalledWith('r1');
      expect(store.rules.map((r) => r.id)).toEqual(['r2']);
    });
  });

  describe('toggleRule', () => {
    it('passes id+enabled then refreshes', async () => {
      vi.mocked(api.toggleRule).mockResolvedValue(undefined);
      vi.mocked(api.getRules).mockResolvedValue([makeRule('r1', { enabled: false })]);

      await store.toggleRule('r1', false);

      expect(api.toggleRule).toHaveBeenCalledWith('r1', false);
      expect(store.rules[0].enabled).toBe(false);
    });
  });

  describe('setSelectedRuleId', () => {
    it('updates the selection synchronously without touching the api', () => {
      store.setSelectedRuleId('r1');
      expect(store.selectedRuleId).toBe('r1');
      store.setSelectedRuleId(null);
      expect(store.selectedRuleId).toBeNull();
      expect(api.getRules).not.toHaveBeenCalled();
    });
  });
});
