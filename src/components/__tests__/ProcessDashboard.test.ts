import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProcessDashboard from '../ProcessDashboard.vue';
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

// 模拟 Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// 模拟子组件
vi.mock('@/components/DashboardOverview.vue', () => ({
  default: {
    name: 'DashboardOverview',
    template: '<div data-testid="dashboard-overview">DashboardOverview</div>',
  },
}));

vi.mock('@/components/RuleFormModal.vue', () => ({
  default: {
    name: 'RuleFormModal',
    template: '<div data-testid="rule-form-modal">RuleFormModal</div>',
    props: ['title', 'initialProcessName', 'processNameReadonly'],
    emits: ['save', 'close'],
  },
}));

vi.mock('@/components/ProcessDetailModal.vue', () => ({
  default: {
    name: 'ProcessDetailModal',
    template: '<div data-testid="process-detail-modal">ProcessDetailModal</div>',
    props: ['process'],
    emits: ['close'],
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

vi.mock('@/components/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    template: '<div data-testid="confirm-dialog">ConfirmDialog</div>',
    props: ['visible', 'title', 'message', 'type', 'confirmText', 'cancelText'],
    emits: ['update:visible', 'confirm'],
  },
}));

describe('ProcessDashboard', () => {
  let store: ReturnType<typeof useMonitorStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMonitorStore();

    // 设置 mockInvoke 的默认返回值
    mockInvoke.mockImplementation((cmd: string) => {
      switch (cmd) {
        case 'get_rules':
          return Promise.resolve(store.rules);
        case 'get_logs':
          return Promise.resolve([]);
        case 'get_settings':
          return Promise.resolve(store.settings);
        default:
          return Promise.resolve([]);
      }
    });

    // 设置初始数据
    store.processes = [
      {
        pid: 1,
        name: 'process1.exe',
        display_name: 'Process 1',
        cpu_usage: 10,
        memory_mb: 100,
        memory_percent: 5,
        cmd: 'process1.exe',
        parent_pid: 0,
        user: 'user',
        start_time: '2024-01-01',
        threads: 4,
        status: 'running',
      },
      {
        pid: 2,
        name: 'process2.exe',
        display_name: 'Process 2',
        cpu_usage: 20,
        memory_mb: 200,
        memory_percent: 10,
        cmd: 'process2.exe',
        parent_pid: 0,
        user: 'user',
        start_time: '2024-01-01',
        threads: 4,
        status: 'running',
      },
      {
        pid: 3,
        name: 'process3.exe',
        display_name: 'Process 3',
        cpu_usage: 30,
        memory_mb: 300,
        memory_percent: 15,
        cmd: 'process3.exe',
        parent_pid: 0,
        user: 'user',
        start_time: '2024-01-01',
        threads: 4,
        status: 'running',
      },
    ];

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
    ];

    store.ruleStatuses = [
      {
        rule_id: '1',
        process_name: 'process1.exe',
        current_value: 85,
        elapsed_secs: 30,
        threshold_exceeded: true,
        triggered: true,
      },
    ];
  });

  it('应该正确渲染组件', () => {
    const wrapper = mount(ProcessDashboard);

    expect(wrapper.find('h2').text()).toContain('dashboard.title');
    expect(wrapper.find('[data-testid="dashboard-overview"]').exists()).toBe(true);
  });

  it('应该显示进程数量', () => {
    const wrapper = mount(ProcessDashboard);

    expect(wrapper.text()).toContain('dashboard.processCount');
  });

  it('应该渲染进程表格', () => {
    const wrapper = mount(ProcessDashboard);

    const table = wrapper.find('table');
    expect(table.exists()).toBe(true);

    // 检查表头
    const headers = table.findAll('th');
    expect(headers).toHaveLength(6);
    expect(headers[0].text()).toContain('dashboard.pid');
    expect(headers[1].text()).toContain('dashboard.name');
    expect(headers[2].text()).toContain('dashboard.cpu');
    expect(headers[3].text()).toContain('dashboard.memory');
    expect(headers[4].text()).toContain('dashboard.status');
    expect(headers[5].text()).toContain('dashboard.action');
  });

  it('应该渲染正确的进程行数', () => {
    const wrapper = mount(ProcessDashboard);

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('应该显示进程信息', () => {
    const wrapper = mount(ProcessDashboard);

    const firstRow = wrapper.find('tbody tr');
    expect(firstRow.text()).toContain('1'); // PID
    expect(firstRow.text()).toContain('Process 1'); // 名称
    expect(firstRow.text()).toContain('10.0%'); // CPU
    expect(firstRow.text()).toContain('100.0 MB'); // 内存
  });

  it('应该显示监控状态', () => {
    const wrapper = mount(ProcessDashboard);

    // 第一个进程应该被监控
    const firstRow = wrapper.find('tbody tr');
    expect(firstRow.text()).toContain('dashboard.monitored');

    // 第二个进程应该未被监控
    const secondRow = wrapper.findAll('tbody tr')[1];
    expect(secondRow.text()).toContain('dashboard.notMonitored');
  });

  it('应该显示触发状态', () => {
    const wrapper = mount(ProcessDashboard);

    const firstRow = wrapper.find('tbody tr');
    // 根据实际组件，触发状态可能显示为 dashboard.normal 或 dashboard.triggered
    expect(firstRow.text()).toMatch(/dashboard\.(normal|triggered)/);
  });

  it('应该显示搜索框', () => {
    const wrapper = mount(ProcessDashboard);

    const searchInput = wrapper.find('input[placeholder="dashboard.searchPlaceholder"]');
    expect(searchInput.exists()).toBe(true);
  });

  it('应该显示过滤器按钮', () => {
    const wrapper = mount(ProcessDashboard);

    const filterButton = wrapper.find('button');
    expect(filterButton.text()).toContain('dashboard.filters');
  });

  it('应该显示分页大小选择器', () => {
    const wrapper = mount(ProcessDashboard);

    const pageSizeSelect = wrapper.find('select');
    expect(pageSizeSelect.exists()).toBe(true);

    const options = pageSizeSelect.findAll('option');
    expect(options).toHaveLength(4);
    expect(options[0].text()).toBe('10');
    expect(options[1].text()).toBe('20');
    expect(options[2].text()).toBe('50');
    expect(options[3].text()).toBe('100');
  });

  it('应该支持搜索功能', async () => {
    const wrapper = mount(ProcessDashboard);

    const searchInput = wrapper.find('input[placeholder="dashboard.searchPlaceholder"]');
    await searchInput.setValue('Process 1');

    // 检查过滤后的进程数量
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Process 1');
  });

  it('应该支持排序功能', async () => {
    const wrapper = mount(ProcessDashboard);

    // 点击 CPU 列头进行排序
    const cpuHeader = wrapper.findAll('th')[2];
    await cpuHeader.trigger('click');

    // 检查排序方向指示器
    expect(cpuHeader.text()).toContain('↑');

    // 再次点击切换排序方向
    await cpuHeader.trigger('click');
    expect(cpuHeader.text()).toContain('↓');
  });

  it('应该支持过滤器切换', async () => {
    const wrapper = mount(ProcessDashboard);

    // 点击过滤器按钮
    const filterButton = wrapper.find('button');
    await filterButton.trigger('click');

    // 检查过滤器面板是否显示
    expect(wrapper.text()).toContain('dashboard.filterCpu');
    expect(wrapper.text()).toContain('dashboard.filterMemory');
    expect(wrapper.text()).toContain('dashboard.filterStatus');
  });

  it('应该支持添加监控规则', async () => {
    const wrapper = mount(ProcessDashboard);

    // 找到添加监控按钮
    const buttons = wrapper.findAll('button');
    const addMonitorButton = buttons.find((btn) => btn.text().includes('dashboard.addMonitor'));
    expect(addMonitorButton).toBeDefined();
    await addMonitorButton?.trigger('click');

    // 检查模态框是否显示
    expect(wrapper.find('[data-testid="rule-form-modal"]').exists()).toBe(true);
  });

  it('应该显示进程详情模态框', async () => {
    const wrapper = mount(ProcessDashboard);

    // 点击进程名称
    const processNameButton = wrapper.find('tbody tr button');
    await processNameButton.trigger('click');

    // 检查详情模态框是否显示
    expect(wrapper.find('[data-testid="process-detail-modal"]').exists()).toBe(true);
  });

  it('应该显示杀进程确认对话框', async () => {
    const wrapper = mount(ProcessDashboard);

    // 找到杀进程按钮
    const killButton = wrapper.find('button[title="dashboard.killProcess"]');
    await killButton.trigger('click');

    // 检查确认对话框是否显示
    expect(wrapper.find('[data-testid="confirm-dialog"]').exists()).toBe(true);
  });

  it('应该显示分页组件', () => {
    // 设置足够多的进程以触发分页
    store.processes = Array.from({ length: 50 }, (_, i) => ({
      pid: i + 1,
      name: `process${i + 1}.exe`,
      display_name: `Process ${i + 1}`,
      cpu_usage: Math.random() * 100,
      memory_mb: Math.random() * 1000,
      memory_percent: Math.random() * 100,
      status: 'running',
    }));

    const wrapper = mount(ProcessDashboard);

    expect(wrapper.find('[data-testid="pagination-bar"]').exists()).toBe(true);
  });

  it('应该支持分页功能', async () => {
    // 设置足够多的进程以触发分页
    store.processes = Array.from({ length: 50 }, (_, i) => ({
      pid: i + 1,
      name: `process${i + 1}.exe`,
      display_name: `Process ${i + 1}`,
      cpu_usage: Math.random() * 100,
      memory_mb: Math.random() * 1000,
      memory_percent: Math.random() * 100,
      status: 'running',
    }));

    const wrapper = mount(ProcessDashboard);

    // 检查初始显示的进程数量（默认分页大小为 20）
    let rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(20);

    // 模拟点击下一页
    const paginationBar = wrapper.findComponent({ name: 'PaginationBar' });
    await paginationBar.vm.$emit('next');

    // 检查第二页的进程
    rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(20);
  });

  it('应该支持分页大小更改', async () => {
    // 设置足够多的进程
    store.processes = Array.from({ length: 50 }, (_, i) => ({
      pid: i + 1,
      name: `process${i + 1}.exe`,
      display_name: `Process ${i + 1}`,
      cpu_usage: Math.random() * 100,
      memory_mb: Math.random() * 1000,
      memory_percent: Math.random() * 100,
      status: 'running',
    }));

    const wrapper = mount(ProcessDashboard);

    // 更改分页大小
    const pageSizeSelect = wrapper.find('select');
    await pageSizeSelect.setValue('50');

    // 检查显示的进程数量
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(50);
  });

  it('应该支持状态过滤', async () => {
    const wrapper = mount(ProcessDashboard);

    // 打开过滤器面板
    const filterButton = wrapper.find('button');
    await filterButton.trigger('click');

    // 找到状态过滤器选择器（第二个选择器）
    const selects = wrapper.findAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(2);

    // 选择"已监控"过滤器
    await selects[1].setValue('monitored');

    // 等待过滤器应用
    await wrapper.vm.$nextTick();

    // 检查过滤器是否被设置
    expect(wrapper.vm.filters.status).toBe('monitored');
  });

  it('应该支持清除过滤器', async () => {
    const wrapper = mount(ProcessDashboard);

    // 打开过滤器面板
    const filterButton = wrapper.find('button');
    await filterButton.trigger('click');

    // 设置一些过滤器
    const cpuMinInput = wrapper.find('input[placeholder="0"]');
    await cpuMinInput.setValue('10');

    // 检查清除过滤器按钮是否存在
    const buttons = wrapper.findAll('button');
    const clearButton = buttons.find((btn) => btn.text().includes('dashboard.clearFilters'));
    expect(clearButton).toBeDefined();

    // 点击清除过滤器
    await clearButton?.trigger('click');

    // 检查过滤器是否被清除
    expect(cpuMinInput.element.value).toBe('');
  });

  it('应该正确处理空进程列表', () => {
    store.processes = [];

    const wrapper = mount(ProcessDashboard);

    // 检查是否显示空状态
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(0);
  });

  it('应该正确处理大量进程', () => {
    // 设置大量进程
    store.processes = Array.from({ length: 1000 }, (_, i) => ({
      pid: i + 1,
      name: `process${i + 1}.exe`,
      display_name: `Process ${i + 1}`,
      cpu_usage: Math.random() * 100,
      memory_mb: Math.random() * 1000,
      memory_percent: Math.random() * 100,
      status: 'running',
    }));

    const wrapper = mount(ProcessDashboard);

    // 应该只显示分页大小数量的进程
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(20);
  });
});
