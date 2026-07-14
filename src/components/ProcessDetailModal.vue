<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <div
        class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-t-2xl flex items-center justify-between"
      >
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">
          {{ process.display_name || process.name }}
        </h3>
        <button
          class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-all"
          @click="$emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div class="p-6 space-y-5">
        <!-- Basic Info -->
        <div class="relative pl-4 border-l-2 border-indigo-400">
          <h4 class="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
            {{ t('detail.basicInfo') }}
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-xs text-slate-400">PID</span>
              <p class="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                {{ process.pid }}
              </p>
            </div>
            <div>
              <span class="text-xs text-slate-400">{{ t('detail.processName') }}</span>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
                {{ process.name }}
              </p>
            </div>
            <div>
              <span class="text-xs text-slate-400">{{ t('detail.displayName') }}</span>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
                {{ process.display_name || '-' }}
              </p>
            </div>
            <div>
              <span class="text-xs text-slate-400">{{ t('detail.status') }}</span>
              <p class="text-sm">
                <span class="badge badge-green">{{ t('detail.running') }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Resource Usage -->
        <div class="relative pl-4 border-l-2 border-amber-400">
          <h4 class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">
            {{ t('detail.resources') }}
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <span class="text-xs text-slate-400">CPU</span>
              <p
                class="font-mono text-sm font-semibold"
                :class="
                  process.cpu_usage >= 90
                    ? 'text-red-600 dark:text-red-400'
                    : process.cpu_usage >= 72
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                "
              >
                {{ process.cpu_usage.toFixed(1) }}%
              </p>
            </div>
            <div>
              <span class="text-xs text-slate-400">{{ t('detail.memoryMb') }}</span>
              <p class="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                {{ process.memory_mb.toFixed(1) }} MB
              </p>
            </div>
            <div>
              <span class="text-xs text-slate-400">{{ t('detail.memoryPct') }}</span>
              <p
                class="font-mono text-sm font-semibold"
                :class="
                  process.memory_percent >= 80
                    ? 'text-red-600 dark:text-red-400'
                    : process.memory_percent >= 64
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-700 dark:text-slate-200'
                "
              >
                {{ process.memory_percent.toFixed(1) }}%
              </p>
            </div>
          </div>
        </div>

        <!-- Associated Rules -->
        <div class="relative pl-4 border-l-2 border-emerald-400">
          <h4 class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
            {{ t('detail.associatedRules') }} ({{ associatedRules.length }})
          </h4>
          <div v-if="associatedRules.length === 0" class="text-xs text-slate-400">
            {{ t('detail.noRules') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="rule in associatedRules"
              :key="rule.id"
              class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
            >
              <span class="badge badge-blue text-xs">
                {{ t(`metrics.${rule.metric}`) }} > {{ rule.threshold }}%
              </span>
              <span class="badge" :class="rule.enabled ? 'badge-green' : 'badge-gray'">
                {{ rule.enabled ? t('common.on') : t('common.off') }}
              </span>
              <span
                class="badge"
                :class="rule.trigger_mode === 'Auto' ? 'badge-blue' : 'badge-purple'"
              >
                {{ rule.trigger_mode === 'Auto' ? t('rules.autoExecute') : t('rules.promptUser') }}
              </span>
              <span class="badge badge-blue">{{ t(`metrics.${rule.metric}`) }}</span>
            </div>
          </div>
        </div>

        <!-- Trend Charts -->
        <div class="relative pl-4 border-l-2 border-blue-400">
          <h4 class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
            {{ t('detail.trendCharts') }}
          </h4>
          <div class="grid grid-cols-1 gap-4">
            <TrendChart
              :title="t('detail.cpuTrend')"
              :data="processHistory"
              data-key="cpu_history"
              color="#6366f1"
              unit="%"
              :warning-threshold="72"
              :critical-threshold="90"
            />
            <TrendChart
              :title="t('detail.memoryTrend')"
              :data="processHistory"
              data-key="memory_history"
              color="#f59e0b"
              unit="MB"
              :reference-line="memoryReferenceLine"
            />
          </div>
        </div>

        <!-- Recent Logs -->
        <div class="relative pl-4 border-l-2 border-purple-400">
          <h4 class="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">
            {{ t('detail.recentLogs') }} ({{ recentLogs.length }})
          </h4>
          <div v-if="recentLogs.length === 0" class="text-xs text-slate-400">
            {{ t('detail.noLogs') }}
          </div>
          <div v-else class="space-y-1.5 max-h-40 overflow-y-auto">
            <div v-for="(log, i) in recentLogs" :key="i" class="flex items-center gap-2 text-xs">
              <span class="text-slate-400 font-mono flex-shrink-0">{{ log.timestamp }}</span>
              <span class="badge badge-blue">{{ log.action_type }}</span>
              <span
                class="badge"
                :class="log.result.startsWith('Success') ? 'badge-green' : 'badge-red'"
              >
                {{ log.result.startsWith('Success') ? t('logs.success') : log.result }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, shallowRef, onMounted, onUnmounted, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { useMonitorStore } from '@/stores/monitor';
  import type { ProcessInfo, ProcessHistory } from '@/types';
  import TrendChart from '@/components/TrendChart.vue';

  const { t } = useI18n();
  const store = useMonitorStore();

  const props = defineProps<{
    process: ProcessInfo;
  }>();

  defineEmits<{
    (e: 'close'): void;
  }>();

  const processHistory = shallowRef<ProcessHistory | null>(null);
  let unlistenMonitor: UnlistenFn | null = null;

  async function fetchHistory() {
    // Try by name first; fall back to display_name (resolved svchost service names etc.)
    let h = await store.fetchProcessHistory(props.process.name);
    if (!h && props.process.display_name && props.process.display_name !== props.process.name) {
      h = await store.fetchProcessHistory(props.process.display_name);
    }
    processHistory.value = h;
  }

  onMounted(async () => {
    await fetchHistory();
    // Keep chart live: each monitor tick (~2s) refreshes the snapshot.
    unlistenMonitor = await listen('monitor-update', () => {
      fetchHistory();
    });
  });

  onUnmounted(() => {
    if (unlistenMonitor) unlistenMonitor();
  });

  watch(
    () => props.process.name,
    () => {
      fetchHistory();
    },
  );

  const associatedRules = computed(() => {
    const procName = props.process.name.toLowerCase();
    const dispName = props.process.display_name.toLowerCase();
    return store.rules.filter((r) => {
      const ruleName = r.process_name.toLowerCase();
      return ruleName === procName || ruleName === dispName;
    });
  });

  const recentLogs = computed(() => {
    const procName = props.process.name.toLowerCase();
    const dispName = props.process.display_name.toLowerCase();
    return store.logs
      .filter((log) => {
        const logName = log.process_name.toLowerCase();
        return logName === procName || logName === dispName;
      })
      .slice(0, 20);
  });

  const memoryReferenceLine = computed(() => {
    // First memory-in-MB rule that targets this process becomes the chart's threshold line.
    const rule = associatedRules.value.find(
      (r) => r.enabled && r.metric === 'Memory' && r.memory_threshold_type === 'Mb',
    );
    if (!rule) return undefined;
    return { value: rule.threshold, label: t('trendChart.threshold'), color: '#f43f5e' };
  });
</script>
