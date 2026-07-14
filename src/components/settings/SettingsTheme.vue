<template>
  <SettingsCard
    :title="t('settings.appearance')"
    :desc="t('settings.appearanceDesc')"
    icon-class="bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    </template>

    <div class="grid grid-cols-3 gap-3">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="relative flex flex-col items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 transition-all duration-200"
        :class="
          store.theme === opt.value
            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600'
        "
        @click="store.setTheme(opt.value)"
      >
        <svg
          class="w-5 h-5"
          :class="
            store.theme === opt.value ? opt.activeColor : 'text-slate-400 dark:text-slate-500'
          "
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" :d="opt.iconPath" />
        </svg>
        <span
          class="text-[11px] font-semibold"
          :class="
            store.theme === opt.value
              ? 'text-indigo-700 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-400'
          "
        >
          {{ opt.label }}
        </span>
      </button>
    </div>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMonitorStore } from '@/stores/monitor';
  import type { ThemeMode } from '@/types';
  import SettingsCard from './SettingsCard.vue';

  const { t } = useI18n();
  const store = useMonitorStore();

  // SVG path data for each theme button.
  const ICON_SUN =
    'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
  const ICON_MOON =
    'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z';
  const ICON_SYSTEM =
    'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';

  const options = computed<
    Array<{ value: ThemeMode; label: string; iconPath: string; activeColor: string }>
  >(() => [
    {
      value: 'light',
      label: t('settings.themeLight'),
      iconPath: ICON_SUN,
      activeColor: 'text-amber-500',
    },
    {
      value: 'dark',
      label: t('settings.themeDark'),
      iconPath: ICON_MOON,
      activeColor: 'text-indigo-500',
    },
    {
      value: 'system',
      label: t('settings.themeSystem'),
      iconPath: ICON_SYSTEM,
      activeColor: 'text-indigo-500',
    },
  ]);
</script>
