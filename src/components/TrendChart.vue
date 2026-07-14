<template>
  <div
    class="trend-card"
    :class="{ 'trend-card-compact': compact }"
    role="img"
    :aria-label="`${title} - ${t('trendChart.ariaDescription')}`"
  >
    <!-- ===== Header Row 1: title + trend badge + time range ===== -->
    <div class="header-row primary">
      <div class="title-cluster">
        <span class="dot" :style="{ background: lineColor }" aria-hidden="true"></span>
        <h4 class="title">{{ title }}</h4>
        <span
          v-if="trend !== undefined && trend !== 0"
          class="trend-pill"
          :class="trend > 0 ? 'trend-up' : 'trend-down'"
        >
          <svg viewBox="0 0 10 10" fill="none" class="trend-arrow" aria-hidden="true">
            <path v-if="trend > 0" d="M5 2L8 6H2L5 2Z" fill="currentColor" />
            <path v-else d="M5 8L2 4H8L5 8Z" fill="currentColor" />
          </svg>
          {{ Math.abs(trend).toFixed(1) }}%
        </span>
      </div>

      <div class="range-group" role="radiogroup" :aria-label="t('trendChart.timeRange')">
        <button
          v-for="r in timeRanges"
          :key="r.value"
          class="range-btn"
          :class="{ active: selectedRange === r.value }"
          role="radio"
          :aria-checked="selectedRange === r.value"
          :aria-label="t(`trendChart.${r.i18n}`)"
          @click="selectedRange = r.value"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <!-- ===== Header Row 2: current value + stat chips ===== -->
    <div v-if="hasData" class="header-row secondary">
      <div class="current">
        <span class="current-value" :class="valueSeverityClass">
          {{ formatVal(currentValue) }}
        </span>
        <span v-if="unit" class="current-unit">{{ unit }}</span>
        <span class="current-label">{{ t('trendChart.current') }}</span>
      </div>

      <div v-if="stats" class="chip-row">
        <span class="chip">
          <span class="chip-k">{{ t('trendChart.avg') }}</span>
          <span class="chip-v">{{ formatVal(stats.avg) }}</span>
        </span>
        <span class="chip">
          <span class="chip-k">{{ t('trendChart.min') }}</span>
          <span class="chip-v">{{ formatVal(stats.min) }}</span>
        </span>
        <span class="chip">
          <span class="chip-k">{{ t('trendChart.max') }}</span>
          <span class="chip-v">{{ formatVal(stats.max) }}</span>
        </span>
        <span class="chip peak" :title="t('trendChart.peakAt', { time: stats.peakTimeStr })">
          <span class="chip-k">{{ t('trendChart.peak') }}</span>
          <span class="chip-v">{{ stats.peakTimeStr }}</span>
        </span>
      </div>
    </div>

    <!-- ===== Chart container ===== -->
    <div class="chart-shell">
      <div ref="chartContainer" class="chart-wrapper"></div>

      <!-- Empty state -->
      <div v-if="!hasData" class="empty" role="status">
        <svg
          class="empty-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M3 17l4-4 3 3 5-5 4 4M3 21h18"
          />
        </svg>
        <div class="empty-text">{{ t('trendChart.noData') }}</div>
        <div class="empty-hint">{{ t('trendChart.noDataHint') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type { ProcessHistory } from '@/types';
  import { useTrendDerived } from '@/composables/useTrendDerived';
  import { useTrendChart } from '@/composables/useTrendChart';

  const { t } = useI18n();

  const props = withDefaults(
    defineProps<{
      title: string;
      data: ProcessHistory | null;
      dataKey: 'cpu_history' | 'memory_history';
      color?: string;
      unit?: string;
      compact?: boolean;
      trend?: number;
      warningThreshold?: number;
      criticalThreshold?: number;
      referenceLine?: { value: number; label?: string; color?: string };
    }>(),
    {
      color: '#6366f1',
      unit: '%',
      compact: false,
      trend: 0,
      warningThreshold: undefined,
      criticalThreshold: undefined,
      referenceLine: undefined,
    },
  );

  const chartContainer = ref<HTMLElement | null>(null);
  const selectedRange = ref<number>(150); // default 5m

  const timeRanges = [
    { label: '1m', value: 30, i18n: 'range1min' },
    { label: '5m', value: 150, i18n: 'range5min' },
    { label: '30m', value: 900, i18n: 'range30min' },
    { label: '1h', value: 1800, i18n: 'range1h' },
  ];

  // `lineColor` is exposed to the <style v-bind> below.
  const lineColor = computed(() => props.color);

  const { slice, hasData, currentValue, stats, valueSeverityClass, formatVal } = useTrendDerived({
    data: () => props.data,
    dataKey: () => props.dataKey,
    selectedRange,
    warningThreshold: () => props.warningThreshold,
    criticalThreshold: () => props.criticalThreshold,
  });

  useTrendChart({
    container: chartContainer,
    data: () => props.data,
    dataKey: () => props.dataKey,
    color: () => props.color,
    compact: () => props.compact,
    referenceLine: () => props.referenceLine,
    selectedRange,
    slice,
    thresholdLabelFallback: () => t('trendChart.threshold'),
  });
</script>

<style scoped>
  /* ===== Card ===== */
  .trend-card {
    @apply relative;
    @apply bg-white dark:bg-slate-800/60;
    @apply border border-slate-200/70 dark:border-slate-700/50;
    @apply rounded-xl p-4;
    @apply transition-colors duration-200;
  }
  .trend-card:hover {
    @apply border-slate-300/80 dark:border-slate-600/60;
  }
  .trend-card-compact {
    @apply p-3;
  }
  .trend-card-compact .chart-wrapper {
    height: 120px;
  }

  /* ===== Header rows ===== */
  .header-row {
    @apply flex items-center justify-between gap-3;
  }
  .header-row.primary {
    @apply mb-2;
  }
  .header-row.secondary {
    @apply mb-3 flex-wrap;
  }

  .title-cluster {
    @apply flex items-center gap-2 min-w-0;
  }
  .dot {
    @apply inline-block w-2 h-2 rounded-full flex-shrink-0;
  }
  .title {
    @apply text-sm font-semibold text-slate-700 dark:text-slate-200 truncate;
  }

  /* ===== Trend pill ===== */
  .trend-pill {
    @apply inline-flex items-center gap-1;
    @apply px-1.5 py-0.5 rounded-md;
    @apply text-[11px] font-mono font-medium;
  }
  .trend-pill.trend-up {
    @apply text-emerald-600 dark:text-emerald-400;
    @apply bg-emerald-50 dark:bg-emerald-900/30;
  }
  .trend-pill.trend-down {
    @apply text-rose-600 dark:text-rose-400;
    @apply bg-rose-50 dark:bg-rose-900/30;
  }
  .trend-arrow {
    @apply w-2.5 h-2.5;
  }

  /* ===== Time range segmented control ===== */
  .range-group {
    @apply inline-flex p-0.5 rounded-lg gap-0.5;
    @apply bg-slate-100/80 dark:bg-slate-700/50;
    @apply flex-shrink-0;
  }
  .range-btn {
    @apply px-2 py-0.5 text-[11px] font-medium rounded-md;
    @apply text-slate-500 dark:text-slate-400;
    @apply hover:text-slate-700 dark:hover:text-slate-200;
    @apply transition-colors duration-150;
  }
  .range-btn.active {
    @apply text-indigo-600 dark:text-indigo-300;
    @apply bg-white dark:bg-slate-800;
    @apply shadow-sm;
  }

  /* ===== Current value row ===== */
  .current {
    @apply flex items-baseline gap-1.5;
  }
  .current-value {
    @apply text-2xl font-bold font-mono tracking-tight;
    @apply transition-colors duration-200;
  }
  .current-value.sev-normal {
    color: v-bind(lineColor);
  }
  .current-value.sev-warning {
    @apply text-amber-500 dark:text-amber-400;
  }
  .current-value.sev-critical {
    @apply text-rose-500 dark:text-rose-400;
  }
  .current-unit {
    @apply text-xs font-medium text-slate-400 dark:text-slate-500;
  }
  .current-label {
    @apply text-[11px] text-slate-400 dark:text-slate-500 ml-1;
  }

  /* ===== Stat chips ===== */
  .chip-row {
    @apply flex items-center gap-1.5 flex-wrap;
  }
  .chip {
    @apply inline-flex items-center gap-1;
    @apply px-1.5 py-0.5 rounded-md;
    @apply bg-slate-50 dark:bg-slate-700/40;
    @apply border border-slate-200/60 dark:border-slate-700/40;
    @apply text-[11px];
  }
  .chip-k {
    @apply text-slate-400 dark:text-slate-500;
  }
  .chip-v {
    @apply font-mono font-medium text-slate-700 dark:text-slate-200;
  }
  .chip.peak .chip-v {
    @apply text-amber-600 dark:text-amber-400;
  }

  /* ===== Chart container ===== */
  .chart-shell {
    @apply relative;
  }
  .chart-wrapper {
    @apply w-full rounded-lg overflow-hidden;
    @apply bg-slate-50/40 dark:bg-slate-900/20;
    height: 200px;
  }

  /* ===== Empty state ===== */
  .empty {
    @apply absolute inset-0;
    @apply flex flex-col items-center justify-center gap-1;
    @apply bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm;
    @apply rounded-lg;
  }
  .empty-icon {
    @apply w-7 h-7 mb-1 text-slate-300 dark:text-slate-600;
  }
  .empty-text {
    @apply text-xs font-medium text-slate-500 dark:text-slate-400;
  }
  .empty-hint {
    @apply text-[11px] text-slate-400 dark:text-slate-500;
  }

  /* ===== Reduced motion ===== */
  @media (prefers-reduced-motion: reduce) {
    .trend-card,
    .range-btn,
    .current-value {
      transition: none !important;
    }
  }
</style>
