<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20"
      >
        <svg
          class="w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
          {{ t('settings.title') }}
        </h2>
        <p class="text-sm text-slate-400">{{ t('settings.subtitle') }}</p>
      </div>
    </div>

    <SettingsAutostart :enabled="autostartEnabled" @toggle="handleToggleAutostart" />

    <SettingsTheme />

    <SettingsDashboardDisplay
      v-model:page-size="localSettings.dashboard_page_size"
      v-model:sort-field="localSettings.dashboard_sort_field"
      v-model:sort-order="localSettings.dashboard_sort_order"
    />

    <SettingsPagination
      v-model:rules-page-size="localSettings.rules_page_size"
      v-model:logs-page-size="localSettings.logs_page_size"
    />

    <SettingsLogRetention v-model:days="localSettings.log_retention_days" />

    <SettingsNotification
      v-model:position="localSettings.notification_position"
      v-model:duration-ms="localSettings.notification_duration_ms"
    />

    <SettingsAbout />

    <SettingsSaveBar :state="saveState" @save="handleSave" />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMonitorStore } from '@/stores/monitor';
  import type { AppSettings } from '@/types';
  import SettingsAutostart from './settings/SettingsAutostart.vue';
  import SettingsTheme from './settings/SettingsTheme.vue';
  import SettingsDashboardDisplay from './settings/SettingsDashboardDisplay.vue';
  import SettingsPagination from './settings/SettingsPagination.vue';
  import SettingsLogRetention from './settings/SettingsLogRetention.vue';
  import SettingsNotification from './settings/SettingsNotification.vue';
  import SettingsAbout from './settings/SettingsAbout.vue';
  import SettingsSaveBar, { type SaveState } from './settings/SettingsSaveBar.vue';

  const { t } = useI18n();
  const store = useMonitorStore();

  const localSettings = ref<AppSettings>({
    log_retention_days: 30,
    notification_position: 'bottom-right',
    notification_duration_ms: 5000,
    dashboard_page_size: 20,
    rules_page_size: 20,
    logs_page_size: 20,
    dashboard_sort_field: 'cpu',
    dashboard_sort_order: 'desc',
  });

  const autostartEnabled = ref(false);

  const saveState = ref<SaveState>('idle');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  onMounted(async () => {
    await store.fetchSettings();
    localSettings.value = { ...store.settings };
    autostartEnabled.value = await store.getAutostartEnabled();
  });

  onUnmounted(() => {
    if (saveTimer) clearTimeout(saveTimer);
  });

  async function handleToggleAutostart() {
    const newValue = !autostartEnabled.value;
    await store.setAutostartEnabled(newValue);
    autostartEnabled.value = newValue;
  }

  async function handleSave() {
    if (saveState.value === 'saving') return;

    saveState.value = 'saving';
    if (saveTimer) clearTimeout(saveTimer);

    try {
      await store.saveSettings(localSettings.value);
      saveState.value = 'saved';
    } catch {
      saveState.value = 'error';
    }

    saveTimer = setTimeout(() => {
      saveState.value = 'idle';
    }, 2500);
  }
</script>
