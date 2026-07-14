import { describe, it, expect } from 'vitest';
import type {
  Rule,
  ProcessInfo,
  RuleStatus,
  LogEntry,
  AppSettings,
  ActionExecutedPayload,
  ActionPromptPayload,
  MonitorUpdate,
  ThemeMode,
  ProcessHistory,
  SystemOverview,
  Condition,
  Action,
  ActionType,
} from '../index';

describe('类型定义', () => {
  describe('Rule', () => {
    it('应该有正确的结构', () => {
      const rule: Rule = {
        id: '1',
        name: 'Test Rule',
        enabled: true,
        process_name: 'test.exe',
        conditions: {
          type: 'leaf',
          metric: 'cpu',
          operator: '>',
          threshold: 80,
        },
        cooldown_secs: 60,
        trigger_mode: 'single',
        actions: [
          {
            type: 'kill_process',
            label: 'Kill Process',
          },
        ],
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      expect(rule.id).toBe('1');
      expect(rule.name).toBe('Test Rule');
      expect(rule.enabled).toBe(true);
      expect(rule.process_name).toBe('test.exe');
      expect(rule.conditions).toBeDefined();
      expect(rule.cooldown_secs).toBe(60);
      expect(rule.trigger_mode).toBe('single');
      expect(rule.actions).toHaveLength(1);
      expect(rule.created_at).toBeDefined();
      expect(rule.updated_at).toBeDefined();
    });
  });

  describe('ProcessInfo', () => {
    it('应该有正确的结构', () => {
      const process: ProcessInfo = {
        pid: 1234,
        name: 'test.exe',
        cpu: 25.5,
        memory: 1024 * 1024 * 100, // 100MB
        threads: 4,
        status: 'running',
        start_time: Date.now(),
        cmd: ['test.exe', '--arg1', '--arg2'],
        exe: 'C:\\test.exe',
        cwd: 'C:\\test',
      };

      expect(process.pid).toBe(1234);
      expect(process.name).toBe('test.exe');
      expect(process.cpu).toBe(25.5);
      expect(process.memory).toBe(1024 * 1024 * 100);
      expect(process.threads).toBe(4);
      expect(process.status).toBe('running');
      expect(process.start_time).toBeDefined();
      expect(process.cmd).toEqual(['test.exe', '--arg1', '--arg2']);
      expect(process.exe).toBe('C:\\test.exe');
      expect(process.cwd).toBe('C:\\test');
    });
  });

  describe('RuleStatus', () => {
    it('应该有正确的结构', () => {
      const status: RuleStatus = {
        rule_id: '1',
        current_value: 85.5,
        elapsed_secs: 30,
        threshold_exceeded: true,
        triggered: false,
      };

      expect(status.rule_id).toBe('1');
      expect(status.current_value).toBe(85.5);
      expect(status.elapsed_secs).toBe(30);
      expect(status.threshold_exceeded).toBe(true);
      expect(status.triggered).toBe(false);
    });
  });

  describe('LogEntry', () => {
    it('应该有正确的结构', () => {
      const log: LogEntry = {
        id: '1',
        timestamp: Date.now(),
        level: 'info',
        message: 'Process killed',
        rule_id: '1',
        rule_name: 'Test Rule',
        process_name: 'test.exe',
        action_type: 'kill_process',
      };

      expect(log.id).toBe('1');
      expect(log.timestamp).toBeDefined();
      expect(log.level).toBe('info');
      expect(log.message).toBe('Process killed');
      expect(log.rule_id).toBe('1');
      expect(log.rule_name).toBe('Test Rule');
      expect(log.process_name).toBe('test.exe');
      expect(log.action_type).toBe('kill_process');
    });
  });

  describe('AppSettings', () => {
    it('应该有正确的结构', () => {
      const settings: AppSettings = {
        log_retention_days: 30,
        notification_position: 'bottom-right',
        notification_duration_ms: 5000,
        dashboard_page_size: 20,
        dashboard_sort_field: 'cpu',
        dashboard_sort_order: 'desc',
        rules_page_size: 20,
        logs_page_size: 20,
      };

      expect(settings.log_retention_days).toBe(30);
      expect(settings.notification_position).toBe('bottom-right');
      expect(settings.notification_duration_ms).toBe(5000);
      expect(settings.dashboard_page_size).toBe(20);
      expect(settings.dashboard_sort_field).toBe('cpu');
      expect(settings.dashboard_sort_order).toBe('desc');
      expect(settings.rules_page_size).toBe(20);
      expect(settings.logs_page_size).toBe(20);
    });
  });

  describe('ActionExecutedPayload', () => {
    it('应该有正确的结构', () => {
      const payload: ActionExecutedPayload = {
        rule_id: '1',
        rule_name: 'Test Rule',
        action_index: 0,
        action_type: 'kill_process',
        success: true,
        message: 'Process killed successfully',
      };

      expect(payload.rule_id).toBe('1');
      expect(payload.rule_name).toBe('Test Rule');
      expect(payload.action_index).toBe(0);
      expect(payload.action_type).toBe('kill_process');
      expect(payload.success).toBe(true);
      expect(payload.message).toBe('Process killed successfully');
    });
  });

  describe('ActionPromptPayload', () => {
    it('应该有正确的结构', () => {
      const payload: ActionPromptPayload = {
        rule_id: '1',
        rule_name: 'Test Rule',
        action_index: 0,
      };

      expect(payload.rule_id).toBe('1');
      expect(payload.rule_name).toBe('Test Rule');
      expect(payload.action_index).toBe(0);
    });
  });

  describe('MonitorUpdate', () => {
    it('应该有正确的结构', () => {
      const update: MonitorUpdate = {
        processes: [
          {
            pid: 1234,
            name: 'test.exe',
            cpu: 25.5,
            memory: 1024 * 1024 * 100,
            threads: 4,
            status: 'running',
            start_time: Date.now(),
            cmd: ['test.exe'],
            exe: 'C:\\test.exe',
            cwd: 'C:\\test',
          },
        ],
        rule_statuses: [
          {
            rule_id: '1',
            current_value: 85.5,
            elapsed_secs: 30,
            threshold_exceeded: true,
            triggered: false,
          },
        ],
      };

      expect(update.processes).toHaveLength(1);
      expect(update.rule_statuses).toHaveLength(1);
    });
  });

  describe('ThemeMode', () => {
    it('应该支持所有主题模式', () => {
      const light: ThemeMode = 'light';
      const dark: ThemeMode = 'dark';
      const system: ThemeMode = 'system';

      expect(light).toBe('light');
      expect(dark).toBe('dark');
      expect(system).toBe('system');
    });
  });

  describe('ProcessHistory', () => {
    it('应该有正确的结构', () => {
      const history: ProcessHistory = {
        process_name: 'test.exe',
        timestamps: [1, 2, 3, 4, 5],
        cpu_history: [10, 20, 30, 40, 50],
        memory_history: [100, 200, 300, 400, 500],
      };

      expect(history.process_name).toBe('test.exe');
      expect(history.timestamps).toEqual([1, 2, 3, 4, 5]);
      expect(history.cpu_history).toEqual([10, 20, 30, 40, 50]);
      expect(history.memory_history).toEqual([100, 200, 300, 400, 500]);
    });
  });

  describe('SystemOverview', () => {
    it('应该有正确的结构', () => {
      const overview: SystemOverview = {
        total_cpu: 45.5,
        total_memory: 60.2,
        process_count: 150,
        rule_count: 5,
        triggered_count: 2,
      };

      expect(overview.total_cpu).toBe(45.5);
      expect(overview.total_memory).toBe(60.2);
      expect(overview.process_count).toBe(150);
      expect(overview.rule_count).toBe(5);
      expect(overview.triggered_count).toBe(2);
    });
  });

  describe('Condition', () => {
    it('应该支持叶子条件', () => {
      const condition: Condition = {
        type: 'leaf',
        metric: 'cpu',
        operator: '>',
        threshold: 80,
      };

      expect(condition.type).toBe('leaf');
      if (condition.type === 'leaf') {
        expect(condition.metric).toBe('cpu');
        expect(condition.operator).toBe('>');
        expect(condition.threshold).toBe(80);
      }
    });

    it('应该支持组条件', () => {
      const condition: Condition = {
        type: 'group',
        logic: 'and',
        conditions: [
          {
            type: 'leaf',
            metric: 'cpu',
            operator: '>',
            threshold: 80,
          },
          {
            type: 'leaf',
            metric: 'memory',
            operator: '>',
            threshold: 90,
          },
        ],
      };

      expect(condition.type).toBe('group');
      if (condition.type === 'group') {
        expect(condition.logic).toBe('and');
        expect(condition.conditions).toHaveLength(2);
      }
    });
  });

  describe('Action', () => {
    it('应该支持所有动作类型', () => {
      const killAction: Action = {
        type: 'kill_process',
        label: 'Kill Process',
      };

      const startAction: Action = {
        type: 'start_process',
        label: 'Start Process',
        path: 'C:\\test.exe',
      };

      const commandAction: Action = {
        type: 'run_command',
        label: 'Run Command',
        command: 'echo hello',
      };

      const notificationAction: Action = {
        type: 'show_notification',
        label: 'Show Notification',
        title: 'Alert',
        body: 'Process is using too much CPU',
      };

      const logAction: Action = {
        type: 'write_log',
        label: 'Write Log',
        message: 'Process killed',
      };

      expect(killAction.type).toBe('kill_process');
      expect(startAction.type).toBe('start_process');
      expect(commandAction.type).toBe('run_command');
      expect(notificationAction.type).toBe('show_notification');
      expect(logAction.type).toBe('write_log');
    });
  });

  describe('ActionType', () => {
    it('应该支持所有动作类型', () => {
      const types: ActionType[] = [
        'kill_process',
        'start_process',
        'run_command',
        'show_notification',
        'write_log',
      ];

      expect(types).toHaveLength(5);
      expect(types).toContain('kill_process');
      expect(types).toContain('start_process');
      expect(types).toContain('run_command');
      expect(types).toContain('show_notification');
      expect(types).toContain('write_log');
    });
  });
});
