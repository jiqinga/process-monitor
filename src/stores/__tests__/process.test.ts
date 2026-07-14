import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useProcessStore } from '../process';
import * as api from '@/api/tauri-commands';
import type { LogEntry, ProcessHistory, ProcessInfo, RuleStatus, SystemOverview } from '@/types';

vi.mock('@/api/tauri-commands', () => ({
  getProcesses: vi.fn(),
  getLogs: vi.fn(),
  getProcessHistory: vi.fn(),
  getSystemOverview: vi.fn(),
  killProcessByPid: vi.fn(),
  suspendProcess: vi.fn(),
  resumeProcess: vi.fn(),
}));

function makeProc(pid: number, overrides: Partial<ProcessInfo> = {}): ProcessInfo {
  return {
    pid,
    name: `proc-${pid}.exe`,
    display_name: `Proc ${pid}`,
    cpu_usage: 0,
    memory_mb: 0,
    memory_percent: 0,
    cmd: '',
    parent_pid: 0,
    user: '',
    start_time: '',
    threads: 0,
    status: '',
    ...overrides,
  };
}

describe('useProcessStore', () => {
  let store: ReturnType<typeof useProcessStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useProcessStore();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty processes / ruleStatuses / logs', () => {
      expect(store.processes).toEqual([]);
      expect(store.ruleStatuses).toEqual([]);
      expect(store.logs).toEqual([]);
    });
  });

  describe('fetchProcesses', () => {
    it('replaces processes with the api response', async () => {
      const procs = [makeProc(100), makeProc(200)];
      vi.mocked(api.getProcesses).mockResolvedValue(procs);

      await store.fetchProcesses();

      expect(api.getProcesses).toHaveBeenCalledTimes(1);
      expect(store.processes).toEqual(procs);
    });
  });

  describe('fetchLogs', () => {
    it('replaces logs with the api response', async () => {
      const logs: LogEntry[] = [
        {
          timestamp: '2026-05-26 12:00:00',
          rule_id: 'r1',
          process_name: 'p',
          metric: 'Cpu',
          value: 90,
          duration_secs: 10,
          action_type: 'KillProcess',
          result: 'Success',
        },
      ];
      vi.mocked(api.getLogs).mockResolvedValue(logs);

      await store.fetchLogs();

      expect(store.logs).toEqual(logs);
    });
  });

  describe('setProcesses / setRuleStatuses (event-driven setters)', () => {
    it('setProcesses replaces the list without an api call', () => {
      const next = [makeProc(1)];
      store.setProcesses(next);
      expect(store.processes).toEqual(next);
      expect(api.getProcesses).not.toHaveBeenCalled();
    });

    it('setRuleStatuses replaces the list without an api call', () => {
      const next: RuleStatus[] = [
        {
          rule_id: 'r1',
          process_name: 'p',
          metric: 'Cpu',
          threshold: 80,
          current_value: 90,
          duration_secs: 10,
          elapsed_secs: 5,
          is_threshold_exceeded: true,
          is_duration_met: false,
          is_triggered: false,
        },
      ];
      store.setRuleStatuses(next);
      expect(store.ruleStatuses).toEqual(next);
    });
  });

  describe('fetchProcessHistory', () => {
    it('returns the api response without storing it', async () => {
      const history: ProcessHistory = {
        pid: 1,
        name: 'chrome.exe',
        display_name: 'Chrome',
        timestamps: [1, 2, 3],
        cpu_history: [10, 20, 30],
        memory_history: [100, 200, 300],
      };
      vi.mocked(api.getProcessHistory).mockResolvedValue(history);

      const result = await store.fetchProcessHistory('chrome');

      expect(api.getProcessHistory).toHaveBeenCalledWith('chrome');
      expect(result).toEqual(history);
      // History is a read-through query — must not leak into the global processes list
      expect(store.processes).toEqual([]);
    });

    it('returns null when the backend has no record', async () => {
      vi.mocked(api.getProcessHistory).mockResolvedValue(null);
      const result = await store.fetchProcessHistory('unknown');
      expect(result).toBeNull();
    });
  });

  describe('fetchSystemOverview', () => {
    it('returns the api response (also read-through)', async () => {
      const overview: SystemOverview = {
        total_cpu_usage: 35.5,
        total_memory_usage: 60,
        total_memory_mb: 16384,
        used_memory_mb: 9830,
        process_count: 200,
        monitored_count: 5,
        triggered_count: 1,
      };
      vi.mocked(api.getSystemOverview).mockResolvedValue(overview);
      const result = await store.fetchSystemOverview();
      expect(result).toEqual(overview);
    });
  });

  describe('per-PID controls pass through to the api unchanged', () => {
    it('killProcess', async () => {
      vi.mocked(api.killProcessByPid).mockResolvedValue('Process 42 terminated successfully');
      const msg = await store.killProcess(42);
      expect(api.killProcessByPid).toHaveBeenCalledWith(42);
      expect(msg).toBe('Process 42 terminated successfully');
    });

    it('suspendProcess', async () => {
      vi.mocked(api.suspendProcess).mockResolvedValue('Process 42 suspended successfully');
      const msg = await store.suspendProcess(42);
      expect(api.suspendProcess).toHaveBeenCalledWith(42);
      expect(msg).toBe('Process 42 suspended successfully');
    });

    it('resumeProcess', async () => {
      vi.mocked(api.resumeProcess).mockResolvedValue('Process 42 resumed successfully');
      const msg = await store.resumeProcess(42);
      expect(api.resumeProcess).toHaveBeenCalledWith(42);
      expect(msg).toBe('Process 42 resumed successfully');
    });

    it('propagates errors from process control', async () => {
      vi.mocked(api.killProcessByPid).mockRejectedValue(
        new Error('Failed to terminate process 42: access denied'),
      );
      await expect(store.killProcess(42)).rejects.toThrow('access denied');
    });
  });
});
