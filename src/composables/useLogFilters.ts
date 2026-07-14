import { ref, computed, watch, type ComputedRef } from 'vue';
import type { LogEntry } from '@/types';

export interface LogActionRow {
  action_type: string;
  result: string;
}

export interface LogGroup {
  key: string;
  timestamp: string;
  rule_id: string;
  process_name: string;
  metric: string;
  value: number;
  duration_secs: number;
  actions: LogActionRow[];
}

interface LogFilterDeps {
  logs: ComputedRef<LogEntry[]>;
  pageSize: ComputedRef<number>;
}

/**
 * State machine for the log viewer: search filter, grouping by trigger
 * occurrence, expand/collapse, pagination. UI shell stays in
 * <LogViewer>; this owns the data-shaping pipeline.
 */
export function useLogFilters(deps: LogFilterDeps) {
  const searchQuery = ref('');
  const expandedGroups = ref<Set<string>>(new Set());
  const currentPage = ref(1);

  const filteredLogs = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    if (!q) return deps.logs.value;
    return deps.logs.value.filter(
      (log) =>
        log.process_name.toLowerCase().includes(q) ||
        log.rule_id.toLowerCase().includes(q) ||
        log.action_type.toLowerCase().includes(q),
    );
  });

  const groupedLogs = computed<LogGroup[]>(() => {
    const groups: LogGroup[] = [];
    const groupMap = new Map<string, LogGroup>();

    for (const log of filteredLogs.value) {
      const key = `${log.rule_id}_${log.timestamp}_${log.process_name}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          key,
          timestamp: log.timestamp,
          rule_id: log.rule_id,
          process_name: log.process_name,
          metric: log.metric,
          value: log.value,
          duration_secs: log.duration_secs,
          actions: [],
        };
        groupMap.set(key, group);
        groups.push(group);
      }
      group.actions.push({
        action_type: log.action_type,
        result: log.result,
      });
    }

    return groups;
  });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(groupedLogs.value.length / deps.pageSize.value)),
  );
  const startIndex = computed(() => (currentPage.value - 1) * deps.pageSize.value);
  const endIndex = computed(() =>
    Math.min(startIndex.value + deps.pageSize.value, groupedLogs.value.length),
  );
  const paginatedLogs = computed(() => groupedLogs.value.slice(startIndex.value, endIndex.value));

  const visiblePages = computed(() => {
    const pages: number[] = [];
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages.value, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  });

  function prevPage() {
    if (currentPage.value > 1) currentPage.value--;
  }
  function nextPage() {
    if (currentPage.value < totalPages.value) currentPage.value++;
  }
  function goToPage(page: number) {
    currentPage.value = page;
  }

  function toggleGroup(key: string) {
    if (expandedGroups.value.has(key)) {
      expandedGroups.value.delete(key);
    } else {
      expandedGroups.value.add(key);
    }
  }

  function isGroupExpanded(key: string): boolean {
    return expandedGroups.value.has(key);
  }

  // Reset to page 1 whenever the visible list changes shape.
  watch([searchQuery, deps.pageSize], () => {
    currentPage.value = 1;
  });

  return {
    searchQuery,
    filteredLogs,
    groupedLogs,
    paginatedLogs,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    visiblePages,
    prevPage,
    nextPage,
    goToPage,
    toggleGroup,
    isGroupExpanded,
  };
}
