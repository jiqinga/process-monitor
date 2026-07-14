import { ref, computed, watch, type ComputedRef } from 'vue';
import type { ProcessInfo, RuleStatus } from '@/types';

export type SortField = 'pid' | 'name' | 'cpu' | 'memory' | 'status';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | 'monitored' | 'unmonitored' | 'triggered';

interface FilterDeps {
  processes: ComputedRef<ProcessInfo[]>;
  isMonitored: (p: ProcessInfo) => boolean;
  getRuleStatus: (p: ProcessInfo) => RuleStatus | undefined;
}

/**
 * State machine for the process dashboard's list view: search, advanced
 * filters, sort, pagination. UI shell stays in the component; this owns
 * the data shaping pipeline (filter → sort → paginate).
 */
export function useProcessFilters(deps: FilterDeps) {
  const searchQuery = ref('');
  const showFilters = ref(false);
  const filters = ref({
    cpuMin: undefined as number | undefined,
    cpuMax: undefined as number | undefined,
    memoryMin: undefined as number | undefined,
    memoryMax: undefined as number | undefined,
    status: 'all' as StatusFilter,
  });

  const sortField = ref<SortField | null>(null);
  const sortOrder = ref<SortOrder>('asc');
  const currentPage = ref(1);
  const pageSize = ref<number>(20);

  const hasActiveFilters = computed(
    () =>
      filters.value.cpuMin !== undefined ||
      filters.value.cpuMax !== undefined ||
      filters.value.memoryMin !== undefined ||
      filters.value.memoryMax !== undefined ||
      filters.value.status !== 'all',
  );

  function clearFilters() {
    filters.value = {
      cpuMin: undefined,
      cpuMax: undefined,
      memoryMin: undefined,
      memoryMax: undefined,
      status: 'all',
    };
  }

  function sortBy(field: SortField) {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortField.value = field;
      sortOrder.value = 'asc';
    }
  }

  function statusSortValue(proc: ProcessInfo): number {
    if (!deps.isMonitored(proc)) return 0;
    const s = deps.getRuleStatus(proc);
    if (!s) return 1;
    if (s.is_triggered) return 3;
    if (s.is_threshold_exceeded) return 2;
    return 1;
  }

  const filteredProcesses = computed(() => {
    let result = [...deps.processes.value];

    // Text search
    const q = searchQuery.value.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (proc) =>
          proc.name.toLowerCase().includes(q) ||
          proc.display_name.toLowerCase().includes(q) ||
          proc.pid.toString().includes(q),
      );
    }

    // CPU/memory filters — captured to locals for type narrowing.
    const { cpuMin, cpuMax, memoryMin, memoryMax, status } = filters.value;
    if (cpuMin !== undefined) result = result.filter((p) => p.cpu_usage >= cpuMin);
    if (cpuMax !== undefined) result = result.filter((p) => p.cpu_usage <= cpuMax);
    if (memoryMin !== undefined) result = result.filter((p) => p.memory_mb >= memoryMin);
    if (memoryMax !== undefined) result = result.filter((p) => p.memory_mb <= memoryMax);

    // Status filter
    if (status !== 'all') {
      result = result.filter((proc) => {
        const monitored = deps.isMonitored(proc);
        const triggered = deps.getRuleStatus(proc)?.is_triggered;
        switch (status) {
          case 'monitored':
            return monitored;
          case 'unmonitored':
            return !monitored;
          case 'triggered':
            return !!triggered;
          default:
            return true;
        }
      });
    }

    // Sort
    if (sortField.value) {
      const field = sortField.value;
      result.sort((a, b) => {
        let va: number | string;
        let vb: number | string;
        switch (field) {
          case 'pid':
            va = a.pid;
            vb = b.pid;
            break;
          case 'name':
            va = a.name.toLowerCase();
            vb = b.name.toLowerCase();
            break;
          case 'cpu':
            va = a.cpu_usage;
            vb = b.cpu_usage;
            break;
          case 'memory':
            va = a.memory_mb;
            vb = b.memory_mb;
            break;
          case 'status':
            va = statusSortValue(a);
            vb = statusSortValue(b);
            break;
          default:
            return 0;
        }
        if (va < vb) return sortOrder.value === 'asc' ? -1 : 1;
        if (va > vb) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  });

  const totalPages = computed(() => Math.ceil(filteredProcesses.value.length / pageSize.value));
  const startIndex = computed(() => (currentPage.value - 1) * pageSize.value);
  const endIndex = computed(() =>
    Math.min(startIndex.value + pageSize.value, filteredProcesses.value.length),
  );
  const paginatedProcesses = computed(() =>
    filteredProcesses.value.slice(startIndex.value, endIndex.value),
  );

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

  // Reset to page 1 whenever any filter that affects the visible list changes.
  watch([searchQuery, pageSize], () => {
    currentPage.value = 1;
  });
  watch(
    filters,
    () => {
      currentPage.value = 1;
    },
    { deep: true },
  );

  return {
    // search + advanced filters
    searchQuery,
    showFilters,
    filters,
    hasActiveFilters,
    clearFilters,
    // sort
    sortField,
    sortOrder,
    sortBy,
    // pagination
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedProcesses,
    visiblePages,
    filteredProcesses,
    prevPage,
    nextPage,
    goToPage,
  };
}
