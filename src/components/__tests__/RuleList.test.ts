import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RuleList from '../RuleList.vue';
import { useMonitorStore } from '@/stores/monitor';

// 模拟 vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

// 模拟子组件
vi.mock('@/components/RuleFormModal.vue', () => ({
  default: {
    name: 'RuleFormModal',
    template: '<div data-testid="rule-form-modal">RuleFormModal</div>',
    props: ['title', 'initialRule', 'processNameReadonly'],
    emits: ['save', 'close'],
  },
}));

vi.mock('@/components/PaginationBar.vue', () => ({
  default: {
    name: 'PaginationBar',
    template: '<div data-testid="pagination-bar">PaginationBar</div>',
    props: ['currentPage', 'totalPages', 'visiblePages', 'startIndex', 'endIndex', 'total'],
    emits: ['prev', 'next', 'goTo'],
  },
}));

describe('RuleList', () => {
  let store: ReturnType<typeof useMonitorStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMonitorStore();

    // 设置默认设置
    store.settings = {
      log_retention_days: 30,
      notification_position: 'bottom-right',
      notification_duration_ms: 5000,
      dashboard_page_size: 20,
      dashboard_sort_field: 'cpu',
      dashboard_sort_order: 'desc',
      rules_page_size: 20,
      logs_page_size: 20,
    };
  });

  it('应该正确渲染组件', () => {
    store.rules = [];

    const wrapper = mount(RuleList);

    expect(wrapper.find('h2').text()).toContain('rules.title');
    expect(wrapper.find('button').text()).toContain('rules.addRule');
  });

  it('应该显示空状态', () => {
    store.rules = [];

    const wrapper = mount(RuleList);

    expect(wrapper.text()).toContain('rules.noRules');
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('应该显示规则列表', () => {
    store.rules = [
      {
        id: '1',
        process_name: 'process1.exe',
        metric: 'Cpu',
        threshold: 80,
        memory_threshold_type: 'Percent',
        duration_secs: 60,
        cooldown_secs: 300,
        enabled: true,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
      {
        id: '2',
        process_name: 'process2.exe',
        metric: 'Memory',
        threshold: 90,
        memory_threshold_type: 'Mb',
        duration_secs: 120,
        cooldown_secs: 600,
        enabled: false,
        trigger_mode: 'Prompt',
        actions: ['WriteLog'],
      },
    ];

    const wrapper = mount(RuleList);

    // 检查规则数量
    const ruleItems = wrapper.findAll('.card');
    expect(ruleItems).toHaveLength(2);

    // 检查第一个规则
    expect(ruleItems[0].text()).toContain('process1.exe');
    expect(ruleItems[0].text()).toContain('metrics.Cpu'); // 实际显示的是 metrics.Cpu
    expect(ruleItems[0].text()).toContain('80');
    expect(ruleItems[0].text()).toContain('rules.autoExecute');
    expect(ruleItems[0].text()).toContain('common.on');

    // 检查第二个规则
    expect(ruleItems[1].text()).toContain('process2.exe');
    expect(ruleItems[1].text()).toContain('metrics.Memory');
    expect(ruleItems[1].text()).toContain('90');
    expect(ruleItems[1].text()).toContain('rules.promptUser');
    expect(ruleItems[1].text()).toContain('common.off');
  });

  it('应该显示规则的操作按钮', () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    // 检查操作按钮
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4); // 添加规则 + 查看日志 + 编辑 + 删除
  });

  it('应该支持添加新规则', async () => {
    store.rules = [];

    const wrapper = mount(RuleList);

    // 点击添加规则按钮
    const buttons = wrapper.findAll('button');
    const addButton = buttons.find((btn) => btn.text().includes('rules.addRule'));
    expect(addButton).toBeDefined();
    await addButton?.trigger('click');

    // 检查模态框是否显示
    expect(wrapper.find('[data-testid="rule-form-modal"]').exists()).toBe(true);
  });

  it('应该支持编辑规则', async () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    // 找到编辑按钮（第三个按钮，跳过查看日志和切换按钮）
    const buttons = wrapper.findAll('button');
    const editButton = buttons.find(
      (btn) => btn.find('svg').exists() && btn.classes().includes('hover:text-indigo-600'),
    );
    expect(editButton).toBeDefined();
    await editButton?.trigger('click');

    // 检查模态框是否显示
    expect(wrapper.find('[data-testid="rule-form-modal"]').exists()).toBe(true);
  });

  it('应该支持删除规则', async () => {
    const deleteRuleSpy = vi.spyOn(store, 'deleteRule').mockResolvedValue(undefined);

    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    // 找到删除按钮（第四个按钮，跳过查看日志、切换和编辑按钮）
    const buttons = wrapper.findAll('button');
    const deleteButton = buttons.find(
      (btn) => btn.find('svg').exists() && btn.classes().includes('hover:text-red-600'),
    );
    expect(deleteButton).toBeDefined();
    await deleteButton?.trigger('click');

    expect(deleteRuleSpy).toHaveBeenCalledWith('1');
  });

  it('应该支持切换规则状态', async () => {
    const toggleRuleSpy = vi.spyOn(store, 'toggleRule').mockResolvedValue(undefined);

    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    // 找到切换按钮
    const toggleButton = wrapper.find('.toggle-switch');
    await toggleButton.trigger('click');

    expect(toggleRuleSpy).toHaveBeenCalledWith('1', false);
  });

  it('应该支持查看规则日志', async () => {
    const setSelectedRuleIdSpy = vi.spyOn(store, 'setSelectedRuleId');
    const navigateSpy = vi.fn();

    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList, {
      attrs: {
        onNavigate: navigateSpy,
      },
    });

    // 找到查看日志按钮
    const viewLogsButton = wrapper.find('button[title="rules.viewLogs"]');
    await viewLogsButton.trigger('click');

    expect(setSelectedRuleIdSpy).toHaveBeenCalledWith('1');
    expect(navigateSpy).toHaveBeenCalledWith('logs');
  });

  it('应该显示分页组件', () => {
    // 设置足够多的规则以触发分页
    store.rules = Array.from({ length: 50 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Rule ${i + 1}`,
      enabled: true,
      process_name: `process${i + 1}.exe`,
      metric: 'CPU',
      threshold: 80,
      duration_secs: 60,
      cooldown_secs: 300,
      trigger_mode: 'Auto',
      actions: ['KillProcess'],
    }));

    const wrapper = mount(RuleList);

    expect(wrapper.find('[data-testid="pagination-bar"]').exists()).toBe(true);
  });

  it('应该支持分页功能', async () => {
    // 设置足够多的规则以触发分页
    store.rules = Array.from({ length: 50 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Rule ${i + 1}`,
      enabled: true,
      process_name: `process${i + 1}.exe`,
      metric: 'CPU',
      threshold: 80,
      duration_secs: 60,
      cooldown_secs: 300,
      trigger_mode: 'Auto',
      actions: ['KillProcess'],
    }));

    const wrapper = mount(RuleList);

    // 检查初始显示的规则数量
    const ruleItems = wrapper.findAll('.card');
    expect(ruleItems).toHaveLength(20);

    // 模拟点击下一页
    const paginationBar = wrapper.findComponent({ name: 'PaginationBar' });
    await paginationBar.vm.$emit('next');

    // 检查第二页的规则
    const ruleItems2 = wrapper.findAll('.card');
    expect(ruleItems2).toHaveLength(20);
  });

  it('应该正确格式化操作标签', () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess', 'WriteLog'],
      },
      {
        id: '2',
        name: 'Rule 2',
        enabled: true,
        process_name: 'process2.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: [{ StartProcess: { path: 'test.exe' } }],
      },
      {
        id: '3',
        name: 'Rule 3',
        enabled: true,
        process_name: 'process3.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: [{ RunCommand: { steps: [{ cmd: 'echo test' }] } }],
      },
      {
        id: '4',
        name: 'Rule 4',
        enabled: true,
        process_name: 'process4.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: [{ ShowNotification: { title: 'Test', body: 'Test' } }],
      },
    ];

    const wrapper = mount(RuleList);

    const ruleItems = wrapper.findAll('.card');

    // 检查第一个规则的操作标签
    expect(ruleItems[0].text()).toContain('rules.actionLabels.kill');
    expect(ruleItems[0].text()).toContain('rules.actionLabels.log');

    // 检查第二个规则的操作标签
    expect(ruleItems[1].text()).toContain('rules.actionLabels.restart');

    // 检查第三个规则的操作标签
    expect(ruleItems[2].text()).toContain('rules.actionLabels.cmd');

    // 检查第四个规则的操作标签
    expect(ruleItems[3].text()).toContain('rules.actionLabels.notify');
  });

  it('应该显示正确的触发模式', () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
      {
        id: '2',
        name: 'Rule 2',
        enabled: true,
        process_name: 'process2.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Prompt',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    const ruleItems = wrapper.findAll('.card');

    // 检查第一个规则的触发模式
    expect(ruleItems[0].text()).toContain('rules.autoExecute');

    // 检查第二个规则的触发模式
    expect(ruleItems[1].text()).toContain('rules.promptUser');
  });

  it('应该显示正确的启用状态', () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
      {
        id: '2',
        name: 'Rule 2',
        enabled: false,
        process_name: 'process2.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    const ruleItems = wrapper.findAll('.card');

    // 检查第一个规则的启用状态
    expect(ruleItems[0].text()).toContain('common.on');

    // 检查第二个规则的启用状态
    expect(ruleItems[1].text()).toContain('common.off');
  });

  it('应该显示正确的冷却时间', () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: ['KillProcess'],
      },
    ];

    const wrapper = mount(RuleList);

    expect(wrapper.text()).toContain('rules.cooldown');
    expect(wrapper.text()).toContain('300');
    expect(wrapper.text()).toContain('rules.seconds');
  });

  it('应该正确处理空操作列表', () => {
    store.rules = [
      {
        id: '1',
        name: 'Rule 1',
        enabled: true,
        process_name: 'process1.exe',
        metric: 'CPU',
        threshold: 80,
        duration_secs: 60,
        cooldown_secs: 300,
        trigger_mode: 'Auto',
        actions: [],
      },
    ];

    const wrapper = mount(RuleList);

    expect(wrapper.text()).toContain('rules.actions');
  });

  it('应该在组件挂载时获取规则', () => {
    const fetchRulesSpy = vi.spyOn(store, 'fetchRules').mockResolvedValue(undefined);

    mount(RuleList);

    expect(fetchRulesSpy).toHaveBeenCalled();
  });
});
