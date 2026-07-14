import { describe, expect, it } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { useProcessFilters } from '../useProcessFilters';
import type { ProcessInfo, RuleStatus } from '@/types';

function makeProc(over: Partial<ProcessInfo>): ProcessInfo {
  return {
    pid: 1,
    name: 'app.exe',
    display_name: 'app',
    cpu_usage: 0,
    memory_mb: 0,
    memory_percent: 0,
    cmd: '',
    parent_pid: 0,
    user: '',
    start_time: '',
    threads: 0,
    status: '',
    ...over,
  };
}

function makeStatus(over: Partial<RuleStatus> & { rule_id: string; process_name: string }): RuleStatus {
  return {
    rule_id: over.rule_id,
    process_name: over.process_name,
    metric: 'Cpu',
    threshold: 80,
    current_value: 0,
    duration_secs: 0,
    elapsed_secs: 0,
    is_threshold_exceeded: false,
    is_duration_met: false,
    is_triggered: false,
    ...over,
  };
}

describe('useProcessFilters', () => {
  describe('initial state', () => {
    it('starts with no filters/sort and page 1', () => {
      const processes = computed<ProcessInfo[]>(() => []);
      const f = useProcessFilters({
        processes,
        isMonitored: () => false,
        getRuleStatus: () => undefined,
      });

      expect(f.searchQuery.value).toBe('');
      expect(f.hasActiveFilters.value).toBe(false);
      expect(f.sortField.value).toBeNull();
      expect(f.sortOrder.value).toBe('asc');
      expect(f.currentPage.value).toBe(1);
      expect(f.pageSize.value).toBe(20);
    });
  });

  describe('text search', () => {
    const procs = [
      makeProc({ pid: 1, name: 'chrome.exe', display_name: 'Chrome' }),
      makeProc({ pid: 22, name: 'firefox.exe', display_name: 'Firefox' }),
      makeProc({ pid: 333, name: 'node.exe', display_name: 'Node' }),
    ];

    it('matches name (case-insensitive)', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.searchQuery.value = 'CHROME';
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([1]);
    });

    it('matches display_name', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.searchQuery.value = 'firefox';
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([22]);
    });

    it('matches pid prefix as string', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.searchQuery.value = '33';
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([333]);
    });

    it('blank/whitespace search returns all', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.searchQuery.value = '   ';
      expect(f.filteredProcesses.value.length).toBe(3);
    });
  });

  describe('range filters', () => {
    const procs = [
      makeProc({ pid: 1, cpu_usage: 5, memory_mb: 100 }),
      makeProc({ pid: 2, cpu_usage: 50, memory_mb: 500 }),
      makeProc({ pid: 3, cpu_usage: 95, memory_mb: 2000 }),
    ];

    it('cpu min/max are inclusive', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.filters.value.cpuMin = 50;
      f.filters.value.cpuMax = 95;
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([2, 3]);
    });

    it('memory min/max are inclusive', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.filters.value.memoryMin = 200;
      f.filters.value.memoryMax = 1000;
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([2]);
    });

    it('only one side bound applies if other is undefined', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.filters.value.cpuMin = 50;
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([2, 3]);
    });
  });

  describe('status filter', () => {
    const procs = [
      makeProc({ pid: 1, name: 'unmonitored.exe' }),
      makeProc({ pid: 2, name: 'monitored.exe' }),
      makeProc({ pid: 3, name: 'triggered.exe' }),
    ];
    const statuses: Record<string, RuleStatus> = {
      'monitored.exe': makeStatus({ rule_id: 'r1', process_name: 'monitored.exe' }),
      'triggered.exe': makeStatus({ rule_id: 'r2', process_name: 'triggered.exe', is_triggered: true }),
    };
    const isMonitored = (p: ProcessInfo) => !!statuses[p.name];
    const getRuleStatus = (p: ProcessInfo) => statuses[p.name];

    it('filter=monitored excludes unmonitored', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored, getRuleStatus });
      f.filters.value.status = 'monitored';
      expect(f.filteredProcesses.value.map((p) => p.pid).sort()).toEqual([2, 3]);
    });

    it('filter=unmonitored keeps only unmonitored', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored, getRuleStatus });
      f.filters.value.status = 'unmonitored';
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([1]);
    });

    it('filter=triggered keeps only triggered processes', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored, getRuleStatus });
      f.filters.value.status = 'triggered';
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([3]);
    });
  });

  describe('hasActiveFilters', () => {
    it('is true when any range or status filter is set', () => {
      const processes = computed<ProcessInfo[]>(() => []);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      expect(f.hasActiveFilters.value).toBe(false);
      f.filters.value.cpuMin = 10;
      expect(f.hasActiveFilters.value).toBe(true);
    });

    it('clearFilters resets all to defaults', () => {
      const processes = computed<ProcessInfo[]>(() => []);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.filters.value.cpuMin = 10;
      f.filters.value.memoryMax = 500;
      f.filters.value.status = 'triggered';
      f.clearFilters();
      expect(f.hasActiveFilters.value).toBe(false);
      expect(f.filters.value.cpuMin).toBeUndefined();
      expect(f.filters.value.memoryMax).toBeUndefined();
      expect(f.filters.value.status).toBe('all');
    });
  });

  describe('sorting', () => {
    const procs = [
      makeProc({ pid: 2, name: 'banana', cpu_usage: 30, memory_mb: 200 }),
      makeProc({ pid: 1, name: 'apple', cpu_usage: 10, memory_mb: 500 }),
      makeProc({ pid: 3, name: 'cherry', cpu_usage: 90, memory_mb: 100 }),
    ];

    it('sortBy(pid) ascending then descending', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.sortBy('pid');
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([1, 2, 3]);
      f.sortBy('pid');
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([3, 2, 1]);
    });

    it('sortBy(name) is case-insensitive', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.sortBy('name');
      expect(f.filteredProcesses.value.map((p) => p.name)).toEqual(['apple', 'banana', 'cherry']);
    });

    it('sortBy(cpu) sorts by cpu_usage', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.sortBy('cpu');
      expect(f.filteredProcesses.value.map((p) => p.cpu_usage)).toEqual([10, 30, 90]);
    });

    it('sortBy(memory) sorts by memory_mb', () => {
      const processes = computed(() => procs);
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.sortBy('memory');
      expect(f.filteredProcesses.value.map((p) => p.memory_mb)).toEqual([100, 200, 500]);
    });

    it('sortBy(status) orders unmonitored < monitored < exceeded < triggered', () => {
      const procsForStatus = [
        makeProc({ pid: 10, name: 'unmonitored.exe' }),
        makeProc({ pid: 20, name: 'plain.exe' }),
        makeProc({ pid: 30, name: 'exceeded.exe' }),
        makeProc({ pid: 40, name: 'fired.exe' }),
      ];
      const statuses: Record<string, RuleStatus> = {
        'plain.exe': makeStatus({ rule_id: 'r1', process_name: 'plain.exe' }),
        'exceeded.exe': makeStatus({
          rule_id: 'r2',
          process_name: 'exceeded.exe',
          is_threshold_exceeded: true,
        }),
        'fired.exe': makeStatus({
          rule_id: 'r3',
          process_name: 'fired.exe',
          is_triggered: true,
        }),
      };
      const processes = computed(() => procsForStatus);
      const f = useProcessFilters({
        processes,
        isMonitored: (p) => !!statuses[p.name],
        getRuleStatus: (p) => statuses[p.name],
      });
      f.sortBy('status');
      expect(f.filteredProcesses.value.map((p) => p.pid)).toEqual([10, 20, 30, 40]);
    });
  });

  describe('pagination', () => {
    function makeManyProcs(n: number) {
      return Array.from({ length: n }, (_, i) =>
        makeProc({ pid: i + 1, name: `p${i + 1}`, display_name: `p${i + 1}` }),
      );
    }

    it('paginated slice respects pageSize and currentPage', () => {
      const processes = computed(() => makeManyProcs(25));
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.pageSize.value = 10;
      expect(f.totalPages.value).toBe(3);
      expect(f.paginatedProcesses.value.length).toBe(10);
      expect(f.startIndex.value).toBe(0);
      expect(f.endIndex.value).toBe(10);

      f.nextPage();
      expect(f.currentPage.value).toBe(2);
      expect(f.paginatedProcesses.value[0].pid).toBe(11);

      f.goToPage(3);
      expect(f.paginatedProcesses.value.length).toBe(5);
    });

    it('prevPage stops at 1, nextPage stops at totalPages', () => {
      const processes = computed(() => makeManyProcs(15));
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.pageSize.value = 10;
      expect(f.totalPages.value).toBe(2);
      f.prevPage();
      expect(f.currentPage.value).toBe(1);
      f.nextPage();
      f.nextPage();
      f.nextPage();
      expect(f.currentPage.value).toBe(2);
    });

    it('visiblePages caps at 7', () => {
      const processes = computed(() => makeManyProcs(200));
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.pageSize.value = 10;
      expect(f.totalPages.value).toBe(20);
      f.goToPage(10);
      expect(f.visiblePages.value.length).toBe(7);
      expect(f.visiblePages.value).toContain(10);
    });

    it('changing searchQuery or pageSize resets currentPage to 1', async () => {
      const processes = ref<ProcessInfo[]>(makeManyProcs(50));
      const f = useProcessFilters({
        processes: computed(() => processes.value),
        isMonitored: () => false,
        getRuleStatus: () => undefined,
      });
      f.pageSize.value = 10;
      f.goToPage(3);
      f.searchQuery.value = 'p4';
      await nextTick();
      expect(f.currentPage.value).toBe(1);

      f.goToPage(2);
      f.pageSize.value = 20;
      await nextTick();
      expect(f.currentPage.value).toBe(1);
    });

    it('changing filters resets currentPage to 1', async () => {
      const processes = computed(() => Array.from({ length: 50 }, (_, i) => makeProc({ pid: i + 1 })));
      const f = useProcessFilters({ processes, isMonitored: () => false, getRuleStatus: () => undefined });
      f.pageSize.value = 10;
      f.goToPage(3);
      f.filters.value.cpuMin = 5;
      await nextTick();
      expect(f.currentPage.value).toBe(1);
    });
  });
});
