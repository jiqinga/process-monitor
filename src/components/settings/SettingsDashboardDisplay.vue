<template>
  <SettingsCard
    :title="t('settings.dashboardDisplay')"
    :desc="t('settings.dashboardDisplayDesc')"
    icon-class="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
    body-class="space-y-5"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    </template>

    <!-- Page Size -->
    <div>
      <label class="settings-label">{{ t('settings.dashboardPageSize') }}</label>
      <div class="flex items-center gap-3 mt-2">
        <select
          :value="pageSize"
          class="select-base w-32"
          @change="$emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
    </div>

    <!-- Sort field + order -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="settings-label">{{ t('settings.dashboardSortField') }}</label>
        <select
          :value="sortField"
          class="select-base mt-2 w-full"
          @change="$emit('update:sortField', ($event.target as HTMLSelectElement).value)"
        >
          <option value="pid">{{ t('dashboard.pid') }}</option>
          <option value="name">{{ t('dashboard.name') }}</option>
          <option value="cpu">{{ t('dashboard.cpu') }}</option>
          <option value="memory">{{ t('dashboard.memory') }}</option>
          <option value="status">{{ t('dashboard.status') }}</option>
        </select>
      </div>
      <div>
        <label class="settings-label">{{ t('settings.dashboardSortOrder') }}</label>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            class="settings-preset-btn text-center"
            :class="sortOrder === 'asc' ? 'settings-preset-active' : ''"
            @click="$emit('update:sortOrder', 'asc')"
          >
            {{ t('settings.sortAsc') }}
          </button>
          <button
            type="button"
            class="settings-preset-btn text-center"
            :class="sortOrder === 'desc' ? 'settings-preset-active' : ''"
            @click="$emit('update:sortOrder', 'desc')"
          >
            {{ t('settings.sortDesc') }}
          </button>
        </div>
      </div>
    </div>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import SettingsCard from './SettingsCard.vue';

  const PAGE_SIZES = [10, 20, 50, 100] as const;

  defineProps<{
    pageSize: number;
    sortField: string;
    sortOrder: string;
  }>();

  defineEmits<{
    (e: 'update:pageSize', value: number): void;
    (e: 'update:sortField', value: string): void;
    (e: 'update:sortOrder', value: string): void;
  }>();

  const { t } = useI18n();
</script>
