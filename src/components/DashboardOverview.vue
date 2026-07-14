<template>
  <div class="grid grid-cols-4 gap-4 mb-6" role="region" aria-label="System Overview">
    <!-- CPU Card -->
    <div class="overview-card" tabindex="0" role="article" aria-label="CPU Usage">
      <div class="flex items-center justify-between mb-3">
        <div class="overview-icon bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        </div>
        <span class="text-xs text-slate-400 dark:text-slate-500">CPU</span>
      </div>
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {{ overview ? overview.total_cpu_usage.toFixed(1) : '--' }}%
          </p>
          <p class="text-xs text-transparent mt-1">&nbsp;</p>
          <div class="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getCpuBarColor(overview?.total_cpu_usage ?? 0)"
              :style="{ width: `${overview?.total_cpu_usage ?? 0}%` }"
              role="progressbar"
              :aria-valuenow="overview?.total_cpu_usage ?? 0"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Memory Card -->
    <div class="overview-card" tabindex="0" role="article" aria-label="Memory Usage">
      <div class="flex items-center justify-between mb-3">
        <div
          class="overview-icon bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <span class="text-xs text-slate-400 dark:text-slate-500">{{ t('overview.memory') }}</span>
      </div>
      <div class="flex items-end gap-3">
        <div class="flex-1">
          <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {{ overview ? overview.total_memory_usage.toFixed(1) : '--' }}%
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {{
              overview
                ? `${(overview.used_memory_mb / 1024).toFixed(1)} / ${(overview.total_memory_mb / 1024).toFixed(1)} GB`
                : '--'
            }}
          </p>
          <div class="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getMemoryBarColor(overview?.total_memory_usage ?? 0)"
              :style="{ width: `${overview?.total_memory_usage ?? 0}%` }"
              role="progressbar"
              :aria-valuenow="overview?.total_memory_usage ?? 0"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Process Count Card -->
    <div class="overview-card" tabindex="0" role="article" aria-label="Process Count">
      <div class="flex items-center justify-between mb-3">
        <div
          class="overview-icon bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </div>
        <span class="text-xs text-slate-400 dark:text-slate-500">
          {{ t('overview.processes') }}
        </span>
      </div>
      <div>
        <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {{ overview?.process_count ?? '--' }}
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {{ t('overview.activeProcesses') }}
        </p>
      </div>
    </div>

    <!-- Monitor Status Card -->
    <div class="overview-card" tabindex="0" role="article" aria-label="Monitor Status">
      <div class="flex items-center justify-between mb-3">
        <div
          class="overview-icon bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <span class="text-xs text-slate-400 dark:text-slate-500">
          {{ t('overview.monitoring') }}
        </span>
      </div>
      <div>
        <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {{ overview?.monitored_count ?? '--' }}
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {{ t('overview.rulesActive') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMonitorStore } from '@/stores/monitor';
  import type { SystemOverview } from '@/types';

  const { t } = useI18n();
  const store = useMonitorStore();

  const overview = ref<SystemOverview | null>(null);
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  async function refreshOverview() {
    try {
      overview.value = await store.fetchSystemOverview();
    } catch (err) {
      console.error('Failed to fetch system overview:', err);
    }
  }

  function getCpuBarColor(usage: number): string {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-amber-500';
    return 'bg-blue-500';
  }

  function getMemoryBarColor(usage: number): string {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-amber-500';
    return 'bg-purple-500';
  }

  onMounted(() => {
    refreshOverview();
    refreshTimer = setInterval(refreshOverview, 5000);
  });

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });
</script>

<style scoped>
  .overview-card {
    @apply bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm;
    transition:
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .overview-card:hover {
    @apply shadow-md border-slate-300 dark:border-slate-600;
  }

  .overview-card:focus {
    @apply outline-none ring-2 ring-indigo-500/20 border-indigo-300 dark:border-indigo-600;
  }

  .overview-card:focus:not(:focus-visible) {
    @apply ring-0 border-slate-200 dark:border-slate-700;
  }

  .overview-card:focus-visible {
    @apply outline-none ring-2 ring-indigo-500/20 border-indigo-300 dark:border-indigo-600;
  }

  .overview-icon {
    @apply w-10 h-10 rounded-lg flex items-center justify-center;
  }

  /* Progress bar animation */
  [role='progressbar'] {
    transition: width 0.5s ease-out;
  }
</style>
