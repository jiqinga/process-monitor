import { describe, expect, it } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import { useLogFilters } from '../useLogFilters';
import type { LogEntry } from '@/types';

function makeLog(over: Partial<LogEntry> & { rule_id: string; timestamp: string }): LogEntry {
  return {
    timestamp: over.timestamp,
    rule_id: over.rule_id,
    process_name: 'app.exe',
    metric: 'Cpu',
    value: 0,
    duration_secs: 0,
    action_type: 'KillProcess',
    result: 'Success',
    ...over,
  };
}

describe('useLogFilters', () => {
  describe('search filter', () => {
    const sample: LogEntry[] = [
      makeLog({ rule_id: 'r1', timestamp: '2026-01-01 10:00:00', process_name: 'chrome.exe' }),
      makeLog({ rule_id: 'r2', timestamp: '2026-01-01 10:01:00', process_name: 'firefox.exe' }),
      makeLog({
        rule_id: 'r3',
        timestamp: '2026-01-01 10:02:00',
        process_name: 'node.exe',
        action_type: 'ShowNotification',
      }),
    ];

    it('blank search returns all', () => {
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });
      expect(f.filteredLogs.value.length).toBe(3);
    });

    it('matches process_name case-insensitively', () => {
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });
      f.searchQuery.value = 'FIREFOX';
      expect(f.filteredLogs.value.map((l) => l.process_name)).toEqual(['firefox.exe']);
    });

    it('matches rule_id', () => {
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });
      f.searchQuery.value = 'r3';
      expect(f.filteredLogs.value.map((l) => l.rule_id)).toEqual(['r3']);
    });

    it('matches action_type', () => {
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });
      f.searchQuery.value = 'notification';
      expect(f.filteredLogs.value.map((l) => l.process_name)).toEqual(['node.exe']);
    });
  });

  describe('grouping', () => {
    it('groups rows sharing (rule_id, timestamp, process_name)', () => {
      const sample: LogEntry[] = [
        makeLog({
          rule_id: 'r1',
          timestamp: '2026-01-01 10:00:00',
          process_name: 'app.exe',
          action_type: 'KillProcess',
        }),
        makeLog({
          rule_id: 'r1',
          timestamp: '2026-01-01 10:00:00',
          process_name: 'app.exe',
          action_type: 'WriteLog',
        }),
        makeLog({
          rule_id: 'r1',
          timestamp: '2026-01-01 10:00:01', // different timestamp → new group
          process_name: 'app.exe',
          action_type: 'KillProcess',
        }),
      ];
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });

      expect(f.groupedLogs.value.length).toBe(2);
      expect(f.groupedLogs.value[0].actions.length).toBe(2);
      expect(f.groupedLogs.value[0].actions.map((a) => a.action_type)).toEqual([
        'KillProcess',
        'WriteLog',
      ]);
      expect(f.groupedLogs.value[1].actions.length).toBe(1);
    });

    it('preserves first-seen order across groups', () => {
      const sample: LogEntry[] = [
        makeLog({ rule_id: 'r2', timestamp: '2026-01-01 10:00:00' }),
        makeLog({ rule_id: 'r1', timestamp: '2026-01-01 10:00:00' }),
        makeLog({ rule_id: 'r2', timestamp: '2026-01-01 10:00:00' }),
      ];
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });
      expect(f.groupedLogs.value.map((g) => g.rule_id)).toEqual(['r2', 'r1']);
    });

    it('group metadata (metric/value/duration) is taken from the first row', () => {
      const sample: LogEntry[] = [
        makeLog({
          rule_id: 'r1',
          timestamp: '2026-01-01 10:00:00',
          metric: 'Cpu',
          value: 87.5,
          duration_secs: 12,
        }),
        makeLog({
          rule_id: 'r1',
          timestamp: '2026-01-01 10:00:00',
          metric: 'IGNORED',
          value: 999,
          duration_secs: 999,
        }),
      ];
      const logs = computed(() => sample);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });
      expect(f.groupedLogs.value[0].metric).toBe('Cpu');
      expect(f.groupedLogs.value[0].value).toBe(87.5);
      expect(f.groupedLogs.value[0].duration_secs).toBe(12);
    });
  });

  describe('expand toggle', () => {
    it('toggleGroup flips membership; isGroupExpanded reflects it', () => {
      const logs = computed<LogEntry[]>(() => []);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });

      expect(f.isGroupExpanded('k1')).toBe(false);
      f.toggleGroup('k1');
      expect(f.isGroupExpanded('k1')).toBe(true);
      f.toggleGroup('k1');
      expect(f.isGroupExpanded('k1')).toBe(false);
    });

    it('expand state is independent per key', () => {
      const logs = computed<LogEntry[]>(() => []);
      const pageSize = computed(() => 50);
      const f = useLogFilters({ logs, pageSize });

      f.toggleGroup('a');
      f.toggleGroup('b');
      expect(f.isGroupExpanded('a')).toBe(true);
      expect(f.isGroupExpanded('b')).toBe(true);
      f.toggleGroup('a');
      expect(f.isGroupExpanded('a')).toBe(false);
      expect(f.isGroupExpanded('b')).toBe(true);
    });
  });

  describe('pagination', () => {
    function manyLogs(n: number) {
      // each entry becomes its own group (unique timestamp)
      return Array.from({ length: n }, (_, i) =>
        makeLog({
          rule_id: 'r1',
          timestamp: `2026-01-01 10:00:${String(i).padStart(2, '0')}`,
        }),
      );
    }

    it('totalPages, startIndex, endIndex match pageSize × current page', () => {
      const logs = computed(() => manyLogs(25));
      const pageSize = computed(() => 10);
      const f = useLogFilters({ logs, pageSize });

      expect(f.totalPages.value).toBe(3);
      expect(f.paginatedLogs.value.length).toBe(10);
      f.nextPage();
      expect(f.startIndex.value).toBe(10);
      expect(f.endIndex.value).toBe(20);
      f.goToPage(3);
      expect(f.paginatedLogs.value.length).toBe(5);
    });

    it('empty data → totalPages floor of 1 (avoids divide-by-zero UX)', () => {
      const logs = computed<LogEntry[]>(() => []);
      const pageSize = computed(() => 10);
      const f = useLogFilters({ logs, pageSize });
      expect(f.totalPages.value).toBe(1);
      expect(f.paginatedLogs.value.length).toBe(0);
    });

    it('changing searchQuery resets to page 1', async () => {
      const data = ref(manyLogs(30));
      const logs = computed(() => data.value);
      const pageSize = computed(() => 10);
      const f = useLogFilters({ logs, pageSize });

      f.goToPage(3);
      f.searchQuery.value = 'app';
      await nextTick();
      expect(f.currentPage.value).toBe(1);
    });

    it('changing pageSize resets to page 1', async () => {
      const data = ref(manyLogs(30));
      const logs = computed(() => data.value);
      const ps = ref(10);
      const pageSize = computed(() => ps.value);
      const f = useLogFilters({ logs, pageSize });

      f.goToPage(2);
      ps.value = 20;
      await nextTick();
      expect(f.currentPage.value).toBe(1);
    });

    it('visiblePages caps at 7', () => {
      const logs = computed(() => manyLogs(200));
      const pageSize = computed(() => 10);
      const f = useLogFilters({ logs, pageSize });
      expect(f.totalPages.value).toBe(20);
      f.goToPage(10);
      expect(f.visiblePages.value.length).toBe(7);
    });
  });
});
