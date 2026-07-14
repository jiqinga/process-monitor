import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DashboardOverview from '../DashboardOverview.vue';
import { useMonitorStore } from '@/stores/monitor';

// 模拟 vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('DashboardOverview', () => {
  let store: ReturnType<typeof useMonitorStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMonitorStore();
  });

  it('应该正确渲染组件', async () => {
    // 模拟 fetchSystemOverview 返回值
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);

    // 等待异步数据加载
    await vi.dynamicImportSettled();

    expect(wrapper.find('[role="region"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="System Overview"]').exists()).toBe(true);
  });

  it('应该显示四张概览卡片', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const cards = wrapper.findAll('[role="article"]');
    expect(cards).toHaveLength(4);
    expect(cards[0].attributes('aria-label')).toBe('CPU Usage');
    expect(cards[1].attributes('aria-label')).toBe('Memory Usage');
    expect(cards[2].attributes('aria-label')).toBe('Process Count');
    expect(cards[3].attributes('aria-label')).toBe('Monitor Status');
  });

  it('应该显示 CPU 使用率', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const cpuCard = wrapper.find('[aria-label="CPU Usage"]');
    expect(cpuCard.text()).toContain('45.5%');
  });

  it('应该显示内存使用率', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const memoryCard = wrapper.find('[aria-label="Memory Usage"]');
    expect(memoryCard.text()).toContain('60.2%');
    expect(memoryCard.text()).toContain('8.0 / 16.0 GB');
  });

  it('应该显示进程数量', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const processCard = wrapper.find('[aria-label="Process Count"]');
    expect(processCard.text()).toContain('150');
    expect(processCard.text()).toContain('overview.activeProcesses');
  });

  it('应该显示监控状态', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const monitorCard = wrapper.find('[aria-label="Monitor Status"]');
    expect(monitorCard.text()).toContain('5');
    expect(monitorCard.text()).toContain('overview.rulesActive');
  });

  it('应该在数据加载前显示占位符', () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue(null);

    const wrapper = mount(DashboardOverview);

    // 检查占位符
    expect(wrapper.text()).toContain('--');
  });

  it('应该显示正确的进度条', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    // 检查 CPU 进度条
    const cpuProgressBar = wrapper.find('[aria-label="CPU Usage"] [role="progressbar"]');
    expect(cpuProgressBar.attributes('aria-valuenow')).toBe('45.5');
    expect(cpuProgressBar.attributes('aria-valuemin')).toBe('0');
    expect(cpuProgressBar.attributes('aria-valuemax')).toBe('100');

    // 检查内存进度条
    const memoryProgressBar = wrapper.find('[aria-label="Memory Usage"] [role="progressbar"]');
    expect(memoryProgressBar.attributes('aria-valuenow')).toBe('60.2');
  });

  it('应该根据 CPU 使用率显示正确的颜色', async () => {
    // 测试低使用率（< 70%）
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 50,
      total_memory_usage: 60,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 100,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    let cpuProgressBar = wrapper.find('[aria-label="CPU Usage"] [role="progressbar"]');
    expect(cpuProgressBar.classes()).toContain('bg-blue-500');

    // 测试中等使用率（70-90%）
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 75,
      total_memory_usage: 60,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 100,
      monitored_count: 5,
    });

    // 重新挂载组件以触发重新渲染
    const wrapper2 = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    cpuProgressBar = wrapper2.find('[aria-label="CPU Usage"] [role="progressbar"]');
    expect(cpuProgressBar.classes()).toContain('bg-amber-500');

    // 测试高使用率（>= 90%）
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 95,
      total_memory_usage: 60,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 100,
      monitored_count: 5,
    });

    const wrapper3 = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    cpuProgressBar = wrapper3.find('[aria-label="CPU Usage"] [role="progressbar"]');
    expect(cpuProgressBar.classes()).toContain('bg-red-500');
  });

  it('应该根据内存使用率显示正确的颜色', async () => {
    // 测试低使用率（< 70%）
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 50,
      total_memory_usage: 50,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 100,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    let memoryProgressBar = wrapper.find('[aria-label="Memory Usage"] [role="progressbar"]');
    expect(memoryProgressBar.classes()).toContain('bg-purple-500');

    // 测试中等使用率（70-90%）
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 50,
      total_memory_usage: 75,
      used_memory_mb: 12288,
      total_memory_mb: 16384,
      process_count: 100,
      monitored_count: 5,
    });

    const wrapper2 = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    memoryProgressBar = wrapper2.find('[aria-label="Memory Usage"] [role="progressbar"]');
    expect(memoryProgressBar.classes()).toContain('bg-amber-500');

    // 测试高使用率（>= 90%）
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 50,
      total_memory_usage: 95,
      used_memory_mb: 15564,
      total_memory_mb: 16384,
      process_count: 100,
      monitored_count: 5,
    });

    const wrapper3 = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    memoryProgressBar = wrapper3.find('[aria-label="Memory Usage"] [role="progressbar"]');
    expect(memoryProgressBar.classes()).toContain('bg-red-500');
  });

  it('应该支持键盘导航', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    // 检查卡片是否可聚焦
    const cards = wrapper.findAll('[role="article"]');
    cards.forEach((card) => {
      expect(card.attributes('tabindex')).toBe('0');
    });
  });

  it('应该正确处理获取概览失败的情况', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.fetchSystemOverview = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    // 应该显示占位符
    expect(wrapper.text()).toContain('--');
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch system overview:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('应该定期刷新数据', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });
    store.fetchSystemOverview = fetchSpy;

    mount(DashboardOverview);
    await vi.dynamicImportSettled();

    // 初始调用
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 前进 5 秒
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 再前进 5 秒
    vi.advanceTimersByTime(5000);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('应该在组件卸载时清除定时器', async () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 8192,
      total_memory_mb: 16384,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    // 卸载组件
    wrapper.unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
    vi.useRealTimers();
  });

  it('应该正确格式化内存大小', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 45.5,
      total_memory_usage: 60.2,
      used_memory_mb: 1024,
      total_memory_mb: 2048,
      process_count: 150,
      monitored_count: 5,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const memoryCard = wrapper.find('[aria-label="Memory Usage"]');
    expect(memoryCard.text()).toContain('1.0 / 2.0 GB');
  });

  it('应该正确处理零值', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 0,
      total_memory_usage: 0,
      used_memory_mb: 0,
      total_memory_mb: 16384,
      process_count: 0,
      monitored_count: 0,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const cpuCard = wrapper.find('[aria-label="CPU Usage"]');
    expect(cpuCard.text()).toContain('0.0%');

    const memoryCard = wrapper.find('[aria-label="Memory Usage"]');
    expect(memoryCard.text()).toContain('0.0%');

    const processCard = wrapper.find('[aria-label="Process Count"]');
    expect(processCard.text()).toContain('0');

    const monitorCard = wrapper.find('[aria-label="Monitor Status"]');
    expect(monitorCard.text()).toContain('0');
  });

  it('应该正确处理最大值', async () => {
    store.fetchSystemOverview = vi.fn().mockResolvedValue({
      total_cpu_usage: 100,
      total_memory_usage: 100,
      used_memory_mb: 16384,
      total_memory_mb: 16384,
      process_count: 1000,
      monitored_count: 100,
    });

    const wrapper = mount(DashboardOverview);
    await vi.dynamicImportSettled();

    const cpuCard = wrapper.find('[aria-label="CPU Usage"]');
    expect(cpuCard.text()).toContain('100.0%');

    const memoryCard = wrapper.find('[aria-label="Memory Usage"]');
    expect(memoryCard.text()).toContain('100.0%');

    const processCard = wrapper.find('[aria-label="Process Count"]');
    expect(processCard.text()).toContain('1000');

    const monitorCard = wrapper.find('[aria-label="Monitor Status"]');
    expect(monitorCard.text()).toContain('100');
  });
});
