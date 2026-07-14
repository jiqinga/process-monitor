<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ t('logs.title') }}</h2>
      <button class="btn-secondary text-xs" @click="store.fetchLogs()">
        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {{ t('logs.refresh') }}
      </button>
    </div>

    <!-- Search / Filter Bar -->
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
            :placeholder="t('logs.searchPlaceholder')"
            class="input-base pl-10"
          />
        </div>
        <button v-if="searchQuery" class="btn-secondary text-xs" @click="searchQuery = ''">
          {{ t('logs.clearFilter') }}
        </button>
      </div>
    </div>

    <div v-if="filteredLogs.length === 0" class="card p-12 text-center">
      <div class="text-slate-300 dark:text-slate-600 mb-3">
        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p class="text-slate-400 dark:text-slate-500">
        {{ searchQuery ? t('logs.noMatch') : t('logs.noLogs') }}
      </p>
    </div>

    <div v-else class="card overflow-hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th class="w-8"></th>
            <th>{{ t('logs.time') }}</th>
            <th>{{ t('logs.process') }}</th>
            <th>{{ t('logs.metric') }}</th>
            <th>{{ t('logs.value') }}</th>
            <th>{{ t('logs.duration') }}</th>
            <th>{{ t('logs.action') }}</th>
            <th>{{ t('logs.result') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in paginatedLogs" :key="group.key">
            <tr
              class="group-header cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              @click="toggleGroup(group.key)"
            >
              <td class="text-center">
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-90': isGroupExpanded(group.key) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </td>
              <td class="text-slate-500 dark:text-slate-400 font-mono text-xs">
                {{ group.timestamp }}
              </td>
              <td class="font-medium text-slate-800 dark:text-slate-100">
                {{ group.process_name }}
              </td>
              <td class="text-slate-600 dark:text-slate-300">
                {{ t(`metrics.${group.metric.split('(')[0]}`) }}
              </td>
              <td class="text-red-600 dark:text-red-400 font-mono font-semibold">
                <template v-if="group.metric.startsWith('ProcessState')">
                  {{
                    group.value === 1
                      ? t('detail.running')
                      : group.value === 0
                        ? t('detail.stopped')
                        : t('common.unknown')
                  }}
                </template>
                <template v-else>
                  {{ group.value.toFixed(1) }}{{ group.metric === 'Memory' ? ' MB' : '%' }}
                </template>
              </td>
              <td class="text-slate-600 dark:text-slate-300">{{ group.duration_secs }}s</td>
              <td>
                <div class="flex gap-1 flex-wrap">
                  <span class="badge badge-blue">
                    {{ group.actions.length }} {{ t('logs.actions') }}
                  </span>
                  <span v-if="getSuccessCount(group.actions) > 0" class="badge badge-green">
                    {{ getSuccessCount(group.actions) }} {{ t('logs.success') }}
                  </span>
                  <span v-if="getFailedCount(group.actions) > 0" class="badge badge-red">
                    {{ getFailedCount(group.actions) }} {{ t('logs.failed') }}
                  </span>
                </div>
              </td>
              <td>
                <span v-if="getFailedCount(group.actions) === 0" class="badge badge-green">
                  {{ t('logs.allSuccess') }}
                </span>
                <span v-else-if="getSuccessCount(group.actions) === 0" class="badge badge-red">
                  {{ t('logs.allFailed') }}
                </span>
                <span v-else class="badge badge-yellow">{{ t('logs.partialSuccess') }}</span>
              </td>
            </tr>
            <template v-if="isGroupExpanded(group.key)">
              <tr
                v-for="(action, j) in group.actions"
                :key="`${group.key}-${j}`"
                class="action-row bg-slate-50/50 dark:bg-slate-800/20"
              >
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>
                  <span class="badge badge-blue">{{ getActionLabel(action.action_type) }}</span>
                </td>
                <td>
                  <span class="badge" :class="getResultClass(action.result)">
                    {{ getResultLabel(action.result) }}
                  </span>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      :visible-pages="visiblePages"
      :start-index="startIndex"
      :end-index="endIndex"
      :total="groupedLogs.length"
      @prev="prevPage"
      @next="nextPage"
      @go-to="goToPage"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMonitorStore } from '@/stores/monitor';
  import PaginationBar from '@/components/PaginationBar.vue';
  import { useLogFilters, type LogActionRow } from '@/composables/useLogFilters';

  const { t } = useI18n();
  const store = useMonitorStore();
  const logs = computed(() => store.logs);
  const pageSize = computed(() => store.settings.logs_page_size);

  const {
    searchQuery,
    groupedLogs,
    filteredLogs,
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
  } = useLogFilters({ logs, pageSize });

  // Cross-view glue: when another view requests "show logs for this rule",
  // prefill the search box with the rule's process name and clear the request.
  watch(
    () => store.selectedRuleId,
    (id) => {
      if (id) {
        const rule = store.rules.find((r) => r.id === id);
        if (rule) {
          searchQuery.value = rule.process_name.replace(/\.exe$/i, '');
        }
        store.setSelectedRuleId(null);
      }
    },
    { immediate: true },
  );

  onMounted(() => {
    store.fetchLogs();
  });

  function getActionLabel(actionType: string): string {
    const map: Record<string, string> = {
      KillProcess: t('rules.actionLabels.kill'),
      StartProcess: t('rules.actionLabels.start'),
      RunCommand: t('rules.actionLabels.cmd'),
      ShowNotification: t('rules.actionLabels.notify'),
      WriteLog: t('rules.actionLabels.log'),
    };
    return map[actionType] || actionType;
  }

  function getResultClass(result: string): string {
    return result.startsWith('Success') ? 'badge-green' : 'badge-red';
  }

  function getResultLabel(result: string): string {
    return result.startsWith('Success') ? t('logs.success') : result;
  }

  function getSuccessCount(actions: LogActionRow[]): number {
    return actions.filter((a) => a.result.startsWith('Success')).length;
  }

  function getFailedCount(actions: LogActionRow[]): number {
    return actions.filter((a) => !a.result.startsWith('Success')).length;
  }
</script>
