<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
        {{ t('dashboard.title') }}
      </h2>
      <span
        class="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full"
      >
        {{ t('dashboard.processCount', { count: filteredProcesses.length }) }}
      </span>
    </div>

    <!-- System Overview Cards -->
    <DashboardOverview />

    <!-- Search Box -->
    <div class="card p-4 mb-5">
      <div class="flex gap-4 items-center">
        <div class="flex-1 relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            v-model="searchQuery"
            :placeholder="t('dashboard.searchPlaceholder')"
            class="input-base pl-10"
          />
        </div>
        <button
          class="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors"
          :class="
            hasActiveFilters
              ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          "
          @click="showFilters = !showFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          {{ t('dashboard.filters') }}
          <span v-if="hasActiveFilters" class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        </button>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {{ t('dashboard.pageSize') }}:
          </label>
          <select v-model.number="pageSize" class="select-base w-24">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>

      <!-- Advanced Filters -->
      <div v-if="showFilters" class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
        <div class="grid grid-cols-4 gap-4">
          <!-- CPU Filter -->
          <div>
            <label class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
              {{ t('dashboard.filterCpu') }}
            </label>
            <div class="flex items-center gap-1.5">
              <input
                v-model.number="filters.cpuMin"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                class="input-base w-20 text-sm"
              />
              <span class="text-xs text-slate-400">-</span>
              <input
                v-model.number="filters.cpuMax"
                type="number"
                min="0"
                max="100"
                placeholder="100"
                class="input-base w-20 text-sm"
              />
              <span class="text-xs text-slate-400">%</span>
            </div>
          </div>
          <!-- Memory Filter -->
          <div>
            <label class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
              {{ t('dashboard.filterMemory') }}
            </label>
            <div class="flex items-center gap-1.5">
              <input
                v-model.number="filters.memoryMin"
                type="number"
                min="0"
                placeholder="0"
                class="input-base w-20 text-sm"
              />
              <span class="text-xs text-slate-400">-</span>
              <input
                v-model.number="filters.memoryMax"
                type="number"
                min="0"
                placeholder="max"
                class="input-base w-20 text-sm"
              />
              <span class="text-xs text-slate-400">MB</span>
            </div>
          </div>
          <!-- Status Filter -->
          <div>
            <label class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
              {{ t('dashboard.filterStatus') }}
            </label>
            <select v-model="filters.status" class="select-base w-full text-sm">
              <option value="all">{{ t('dashboard.filterAll') }}</option>
              <option value="monitored">{{ t('dashboard.filterMonitored') }}</option>
              <option value="unmonitored">{{ t('dashboard.filterUnmonitored') }}</option>
              <option value="triggered">{{ t('dashboard.filterTriggered') }}</option>
            </select>
          </div>
          <!-- Clear Filters -->
          <div class="flex items-end">
            <button
              v-if="hasActiveFilters"
              class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
              @click="clearFilters"
            >
              {{ t('dashboard.clearFilters') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Process Table -->
    <div class="card overflow-hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th class="cursor-pointer select-none" @click="sortBy('pid')">
              <span class="inline-flex items-center gap-1">
                {{ t('dashboard.pid') }}
                <span v-if="sortField === 'pid'" class="text-indigo-500">
                  {{ sortOrder === 'asc' ? '\u2191' : '\u2193' }}
                </span>
              </span>
            </th>
            <th class="cursor-pointer select-none" @click="sortBy('name')">
              <span class="inline-flex items-center gap-1">
                {{ t('dashboard.name') }}
                <span v-if="sortField === 'name'" class="text-indigo-500">
                  {{ sortOrder === 'asc' ? '\u2191' : '\u2193' }}
                </span>
              </span>
            </th>
            <th class="cursor-pointer select-none" @click="sortBy('cpu')">
              <span class="inline-flex items-center gap-1">
                {{ t('dashboard.cpu') }}
                <span v-if="sortField === 'cpu'" class="text-indigo-500">
                  {{ sortOrder === 'asc' ? '\u2191' : '\u2193' }}
                </span>
              </span>
            </th>
            <th class="cursor-pointer select-none" @click="sortBy('memory')">
              <span class="inline-flex items-center gap-1">
                {{ t('dashboard.memory') }}
                <span v-if="sortField === 'memory'" class="text-indigo-500">
                  {{ sortOrder === 'asc' ? '\u2191' : '\u2193' }}
                </span>
              </span>
            </th>
            <th class="cursor-pointer select-none" @click="sortBy('status')">
              <span class="inline-flex items-center gap-1">
                {{ t('dashboard.status') }}
                <span v-if="sortField === 'status'" class="text-indigo-500">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </span>
            </th>
            <th>{{ t('dashboard.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="proc in paginatedProcesses" :key="proc.pid">
            <td class="text-slate-500 dark:text-slate-400 font-mono text-xs">{{ proc.pid }}</td>
            <td>
              <button
                class="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors cursor-pointer"
                :title="proc.name"
                @click="showProcessDetail(proc)"
              >
                {{ proc.display_name || proc.name }}
              </button>
            </td>
            <td>
              <span class="font-mono" :class="getValueClass(proc.cpu_usage, 90)">
                {{ proc.cpu_usage.toFixed(1) }}%
              </span>
            </td>
            <td>
              <span
                class="font-mono text-slate-600 dark:text-slate-300"
                :class="getMemoryValueClass(proc.memory_percent, 80)"
              >
                {{ proc.memory_mb.toFixed(1) }} MB ({{ proc.memory_percent.toFixed(1) }}%)
              </span>
            </td>
            <td>
              <span v-if="isMonitored(proc)" class="badge" :class="getStatusBadgeClass(proc)">
                {{ getStatusText(proc) }}
              </span>
              <span v-else class="badge badge-gray">{{ t('dashboard.notMonitored') }}</span>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <button
                  v-if="!isMonitored(proc)"
                  class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-semibold transition-colors"
                  @click="addMonitorRule(proc)"
                >
                  + {{ t('dashboard.addMonitor') }}
                </button>
                <span v-else class="badge badge-green">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {{ t('dashboard.monitored') }}
                </span>
                <button
                  class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium transition-colors"
                  :title="t('dashboard.killProcess')"
                  @click="showKillConfirm(proc)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <PaginationBar
      v-if="totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      :visible-pages="visiblePages"
      :start-index="startIndex"
      :end-index="endIndex"
      :total="filteredProcesses.length"
      @prev="prevPage"
      @next="nextPage"
      @go-to="goToPage"
    />

    <!-- Add Monitor Rule Modal -->
    <RuleFormModal
      v-if="showAddMonitorModal"
      :title="t('dashboard.addMonitorRule')"
      :initial-process-name="selectedProcessName"
      :process-name-readonly="true"
      @save="handleSaveRule"
      @close="showAddMonitorModal = false"
    />

    <!-- Process Detail Modal -->
    <ProcessDetailModal
      v-if="detailProcess"
      :process="detailProcess"
      @close="detailProcess = null"
    />

    <!-- Kill Confirm Dialog -->
    <ConfirmDialog
      v-model:visible="showKillDialog"
      :title="t('dashboard.killProcess')"
      :message="
        t('dashboard.killConfirm', {
          name: pendingKillProcess?.display_name || pendingKillProcess?.name || '',
        })
      "
      type="danger"
      :confirm-text="t('dashboard.killProcess')"
      :cancel-text="t('rules.cancel')"
      @confirm="confirmKillProcess"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMonitorStore } from '@/stores/monitor';
  import type { ProcessInfo, Rule } from '@/types';
  import RuleFormModal from '@/components/RuleFormModal.vue';
  import ProcessDetailModal from '@/components/ProcessDetailModal.vue';
  import PaginationBar from '@/components/PaginationBar.vue';
  import DashboardOverview from '@/components/DashboardOverview.vue';
  import ConfirmDialog from '@/components/ConfirmDialog.vue';
  import { useProcessFilters } from '@/composables/useProcessFilters';

  const { t } = useI18n();
  const store = useMonitorStore();
  const processes = computed(() => store.processes);
  const ruleStatuses = computed(() => store.ruleStatuses);
  const rules = computed(() => store.rules);

  // ---- monitoring/status presentation helpers (closures over store state) ----
  function getRuleStatus(proc: ProcessInfo) {
    return ruleStatuses.value.find((s) => {
      const procName = proc.name.toLowerCase();
      const dispName = proc.display_name ? proc.display_name.toLowerCase() : procName;
      const statusName = s.process_name.toLowerCase();
      return statusName === procName || statusName === dispName;
    });
  }

  function hasMatchingRule(proc: ProcessInfo) {
    const procName = proc.name.toLowerCase();
    const dispName = proc.display_name ? proc.display_name.toLowerCase() : procName;
    return rules.value.some((r) => {
      if (!r.enabled) return false;
      const ruleName = r.process_name.toLowerCase();
      return ruleName === procName || ruleName === dispName;
    });
  }

  function isMonitored(proc: ProcessInfo) {
    return !!getRuleStatus(proc) || hasMatchingRule(proc);
  }

  // ---- list state (filter / sort / paginate) ----
  const {
    searchQuery,
    showFilters,
    filters,
    hasActiveFilters,
    clearFilters,
    sortField,
    sortOrder,
    sortBy,
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
  } = useProcessFilters({ processes, isMonitored, getRuleStatus });

  // ---- modal coordination ----
  const showAddMonitorModal = ref(false);
  const selectedProcessName = ref('');
  const detailProcess = ref<ProcessInfo | null>(null);
  const showKillDialog = ref(false);
  const pendingKillProcess = ref<ProcessInfo | null>(null);

  onMounted(async () => {
    store.fetchRules();
    store.fetchLogs();
    await store.fetchSettings();
    pageSize.value = store.settings.dashboard_page_size;
    sortField.value = store.settings.dashboard_sort_field;
    sortOrder.value = store.settings.dashboard_sort_order;
  });

  watch(
    () => store.settings,
    (newSettings) => {
      pageSize.value = newSettings.dashboard_page_size;
      sortField.value = newSettings.dashboard_sort_field;
      sortOrder.value = newSettings.dashboard_sort_order;
    },
    { deep: true },
  );

  function addMonitorRule(proc: ProcessInfo) {
    selectedProcessName.value = proc.name;
    showAddMonitorModal.value = true;
  }

  function showProcessDetail(proc: ProcessInfo) {
    detailProcess.value = proc;
  }

  async function handleSaveRule(rule: Rule) {
    await store.saveRule(rule);
    showAddMonitorModal.value = false;
  }

  function showKillConfirm(proc: ProcessInfo) {
    pendingKillProcess.value = proc;
    showKillDialog.value = true;
  }

  async function confirmKillProcess() {
    if (!pendingKillProcess.value) return;
    try {
      await store.killProcess(pendingKillProcess.value.pid);
    } catch (err) {
      console.error('Failed to kill process:', err);
    } finally {
      pendingKillProcess.value = null;
    }
  }

  // ---- value/badge presentation helpers (template-bound) ----
  function getValueClass(value: number, threshold: number) {
    if (value >= threshold) return 'text-red-600 dark:text-red-400 font-semibold';
    if (value >= threshold * 0.8) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  }
  function getMemoryValueClass(pct: number, threshold: number) {
    if (pct >= threshold) return 'text-red-600 dark:text-red-400 font-semibold';
    if (pct >= threshold * 0.8) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-600 dark:text-slate-300';
  }
  function getStatusBadgeClass(proc: ProcessInfo) {
    const s = getRuleStatus(proc);
    if (!s) return 'badge-green';
    if (s.is_triggered) return 'badge-red';
    if (s.is_threshold_exceeded) return 'badge-yellow';
    return 'badge-green';
  }
  function getStatusText(proc: ProcessInfo) {
    const s = getRuleStatus(proc);
    if (!s) return t('dashboard.normal');
    if (s.is_triggered) return t('dashboard.triggered');
    if (s.is_threshold_exceeded)
      return t('dashboard.progress', { elapsed: s.elapsed_secs, duration: s.duration_secs });
    return t('dashboard.normal');
  }
</script>
