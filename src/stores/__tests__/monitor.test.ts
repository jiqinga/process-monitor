import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMonitorStore } from '../monitor';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// 模拟 Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

describe('Monitor Store', () => {
  let store: ReturnType<typeof useMonitorStore>;

  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia());
    store = useMonitorStore();

    // 清除所有模拟
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      expect(store.rules).toEqual([]);
      expect(store.processes).toEqual([]);
      expect(store.ruleStatuses).toEqual([]);
      expect(store.logs).toEqual([]);
      expect(store.selectedRuleId).toBeNull();
      expect(store.actionPrompt).toBeNull();
      expect(store.theme).toBe('light');
    });

    it('应该有默认设置', () => {
      expect(store.settings).toEqual({
        log_retention_days: 30,
        notification_position: 'bottom-right',
        notification_duration_ms: 5000,
        dashboard_page_size: 20,
        dashboard_sort_field: 'cpu',
        dashboard_sort_order: 'desc',
        rules_page_size: 20,
        logs_page_size: 20,
        start_minimized: false,
      });
    });
  });

  describe('fetchRules', () => {
    it('应该获取规则并更新状态', async () => {
      const mockRules = [
        { id: '1', name: 'Test Rule', enabled: true },
        { id: '2', name: 'Another Rule', enabled: false },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockRules);

      await store.fetchRules();

      expect(invoke).toHaveBeenCalledWith('get_rules');
      expect(store.rules).toEqual(mockRules);
    });

    it('应该处理获取规则失败的情况', async () => {
      const error = new Error('Failed to fetch rules');
      vi.mocked(invoke).mockRejectedValueOnce(error);

      await expect(store.fetchRules()).rejects.toThrow('Failed to fetch rules');
    });
  });

  describe('saveRule', () => {
    it('应该保存规则并刷新列表', async () => {
      const mockRule = { id: '1', name: 'Test Rule', enabled: true };
      const mockRules = [mockRule];

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // save_rule
        .mockResolvedValueOnce(mockRules); // get_rules

      await store.saveRule(mockRule);

      expect(invoke).toHaveBeenCalledWith('save_rule', { rule: mockRule });
      expect(invoke).toHaveBeenCalledWith('get_rules');
      expect(store.rules).toEqual(mockRules);
    });
  });

  describe('deleteRule', () => {
    it('应该删除规则并刷新列表', async () => {
      const mockRules = [{ id: '2', name: 'Remaining Rule', enabled: true }];

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // delete_rule
        .mockResolvedValueOnce(mockRules); // get_rules

      await store.deleteRule('1');

      expect(invoke).toHaveBeenCalledWith('delete_rule', { id: '1' });
      expect(invoke).toHaveBeenCalledWith('get_rules');
      expect(store.rules).toEqual(mockRules);
    });
  });

  describe('toggleRule', () => {
    it('应该切换规则状态并刷新列表', async () => {
      const mockRules = [{ id: '1', name: 'Test Rule', enabled: false }];

      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // toggle_rule
        .mockResolvedValueOnce(mockRules); // get_rules

      await store.toggleRule('1', false);

      expect(invoke).toHaveBeenCalledWith('toggle_rule', { id: '1', enabled: false });
      expect(invoke).toHaveBeenCalledWith('get_rules');
      expect(store.rules).toEqual(mockRules);
    });
  });

  describe('fetchProcesses', () => {
    it('应该获取进程列表并更新状态', async () => {
      const mockProcesses = [
        { pid: 1, name: 'process1', cpu: 10, memory: 20 },
        { pid: 2, name: 'process2', cpu: 5, memory: 30 },
      ];

      vi.mocked(invoke).mockResolvedValueOnce(mockProcesses);

      await store.fetchProcesses();

      expect(invoke).toHaveBeenCalledWith('get_processes');
      expect(store.processes).toEqual(mockProcesses);
    });
  });

  describe('fetchLogs', () => {
    it('应该获取日志并更新状态', async () => {
      const mockLogs = [{ id: '1', timestamp: Date.now(), level: 'info', message: 'Test log' }];

      vi.mocked(invoke).mockResolvedValueOnce(mockLogs);

      await store.fetchLogs();

      expect(invoke).toHaveBeenCalledWith('get_logs');
      expect(store.logs).toEqual(mockLogs);
    });
  });

  describe('setSelectedRuleId', () => {
    it('应该设置选中的规则 ID', () => {
      store.setSelectedRuleId('1');
      expect(store.selectedRuleId).toBe('1');

      store.setSelectedRuleId(null);
      expect(store.selectedRuleId).toBeNull();
    });
  });

  describe('fetchSettings', () => {
    it('应该获取设置并更新状态', async () => {
      const mockSettings = {
        log_retention_days: 60,
        notification_position: 'top-right',
        notification_duration_ms: 3000,
        dashboard_page_size: 50,
        dashboard_sort_field: 'memory',
        dashboard_sort_order: 'asc',
        rules_page_size: 10,
        logs_page_size: 50,
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockSettings);

      await store.fetchSettings();

      expect(invoke).toHaveBeenCalledWith('get_settings');
      expect(store.settings).toEqual(mockSettings);
    });
  });

  describe('saveSettings', () => {
    it('应该保存设置并更新状态', async () => {
      const mockSettings = {
        log_retention_days: 60,
        notification_position: 'top-right',
        notification_duration_ms: 3000,
        dashboard_page_size: 50,
        dashboard_sort_field: 'memory',
        dashboard_sort_order: 'asc',
        rules_page_size: 10,
        logs_page_size: 50,
      };

      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await store.saveSettings(mockSettings);

      expect(invoke).toHaveBeenCalledWith('save_settings', { settings: mockSettings });
      expect(store.settings).toEqual(mockSettings);
    });
  });

  describe('executeAction', () => {
    it('应该执行动作', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await store.executeAction('1', 0);

      expect(invoke).toHaveBeenCalledWith('execute_action', { ruleId: '1', actionIndex: 0 });
    });
  });

  describe('cancelAction', () => {
    it('应该取消动作', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await store.cancelAction('1');

      expect(invoke).toHaveBeenCalledWith('cancel_action', { ruleId: '1' });
    });
  });

  describe('clearActionPrompt', () => {
    it('应该清除动作提示', () => {
      store.actionPrompt = { rule_id: '1', rule_name: 'Test', action_index: 0 };
      store.clearActionPrompt();
      expect(store.actionPrompt).toBeNull();
    });
  });

  describe('主题管理', () => {
    it('应该设置主题并保存到 localStorage', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      store.setTheme('dark');

      expect(store.theme).toBe('dark');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');
    });

    it('应该从 localStorage 初始化主题', () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue('dark');

      store.initTheme();

      expect(getItemSpy).toHaveBeenCalledWith('theme');
      expect(store.theme).toBe('dark');
    });

    it('应该使用默认主题如果没有保存的主题', () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockReturnValue(null);

      store.initTheme();

      expect(getItemSpy).toHaveBeenCalledWith('theme');
      expect(store.theme).toBe('light');
    });
  });

  describe('startListening', () => {
    it('应该设置事件监听器', () => {
      const mockListen = vi.fn();
      vi.mocked(listen).mockImplementation(mockListen);

      store.startListening();

      expect(listen).toHaveBeenCalledWith('monitor-update', expect.any(Function));
      expect(listen).toHaveBeenCalledWith('action-executed', expect.any(Function));
      expect(listen).toHaveBeenCalledWith('show-action-prompt', expect.any(Function));
      expect(listen).toHaveBeenCalledWith('create-notification', expect.any(Function));
    });

    it('应该处理 monitor-update 事件', () => {
      let callback: ((event: { payload: unknown }) => void) | undefined;
      vi.mocked(listen).mockImplementation((event, cb) => {
        if (event === 'monitor-update') {
          callback = cb;
        }
        return Promise.resolve(() => {});
      });

      store.startListening();

      const mockPayload = {
        processes: [{ pid: 1, name: 'process1', cpu: 10, memory: 20 }],
        rule_statuses: [{ rule_id: '1', current_value: 10 }],
      };

      expect(callback).toBeDefined();
      callback?.({ payload: mockPayload });

      expect(store.processes).toEqual(mockPayload.processes);
      expect(store.ruleStatuses).toEqual(mockPayload.rule_statuses);
    });

    it('应该处理 show-action-prompt 事件', () => {
      let callback: ((event: { payload: unknown }) => void) | undefined;
      vi.mocked(listen).mockImplementation((event, cb) => {
        if (event === 'show-action-prompt') {
          callback = cb;
        }
        return Promise.resolve(() => {});
      });

      store.startListening();

      const mockPayload = {
        rule_id: '1',
        rule_name: 'Test Rule',
        action_index: 0,
      };

      expect(callback).toBeDefined();
      callback?.({ payload: mockPayload });

      expect(store.actionPrompt).toEqual(mockPayload);
    });
  });

  describe('fetchProcessHistory', () => {
    it('应该获取进程历史', async () => {
      const mockHistory = {
        process_name: 'process1',
        timestamps: [1, 2, 3],
        cpu_history: [10, 20, 30],
        memory_history: [100, 200, 300],
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockHistory);

      const result = await store.fetchProcessHistory('process1');

      expect(invoke).toHaveBeenCalledWith('get_process_history', { processName: 'process1' });
      expect(result).toEqual(mockHistory);
    });

    it('应该返回 null 如果没有历史数据', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(null);

      const result = await store.fetchProcessHistory('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAutostartEnabled', () => {
    it('应该获取自启动状态', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(true);

      const result = await store.getAutostartEnabled();

      expect(invoke).toHaveBeenCalledWith('get_autostart_enabled');
      expect(result).toBe(true);
    });
  });

  describe('setAutostartEnabled', () => {
    it('应该设置自启动状态', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined);

      await store.setAutostartEnabled(true);

      expect(invoke).toHaveBeenCalledWith('set_autostart_enabled', { enabled: true });
    });
  });

  describe('fetchSystemOverview', () => {
    it('应该获取系统概览', async () => {
      const mockOverview = {
        total_cpu: 50,
        total_memory: 60,
        process_count: 100,
        rule_count: 5,
        triggered_count: 2,
      };

      vi.mocked(invoke).mockResolvedValueOnce(mockOverview);

      const result = await store.fetchSystemOverview();

      expect(invoke).toHaveBeenCalledWith('get_system_overview');
      expect(result).toEqual(mockOverview);
    });
  });

  describe('killProcess', () => {
    it('应该杀掉进程', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('Process killed');

      const result = await store.killProcess(123);

      expect(invoke).toHaveBeenCalledWith('kill_process_by_pid', { pid: 123 });
      expect(result).toBe('Process killed');
    });
  });

  describe('suspendProcess', () => {
    it('应该挂起进程', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('Process suspended');

      const result = await store.suspendProcess(123);

      expect(invoke).toHaveBeenCalledWith('suspend_process', { pid: 123 });
      expect(result).toBe('Process suspended');
    });
  });

  describe('resumeProcess', () => {
    it('应该恢复进程', async () => {
      vi.mocked(invoke).mockResolvedValueOnce('Process resumed');

      const result = await store.resumeProcess(123);

      expect(invoke).toHaveBeenCalledWith('resume_process', { pid: 123 });
      expect(result).toBe('Process resumed');
    });
  });
});
