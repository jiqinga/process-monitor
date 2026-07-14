<template>
  <SettingsCard
    :title="t('settings.pagination')"
    :desc="t('settings.paginationDesc')"
    icon-class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
    body-class="space-y-5"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    </template>

    <div>
      <label class="settings-label">{{ t('settings.rulesPageSize') }}</label>
      <select
        :value="rulesPageSize"
        class="select-base w-32 mt-2"
        @change="$emit('update:rulesPageSize', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
      </select>
    </div>
    <div>
      <label class="settings-label">{{ t('settings.logsPageSize') }}</label>
      <select
        :value="logsPageSize"
        class="select-base w-32 mt-2"
        @change="$emit('update:logsPageSize', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
      </select>
    </div>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import SettingsCard from './SettingsCard.vue';

  const PAGE_SIZES = [10, 20, 50, 100] as const;

  defineProps<{
    rulesPageSize: number;
    logsPageSize: number;
  }>();

  defineEmits<{
    (e: 'update:rulesPageSize', value: number): void;
    (e: 'update:logsPageSize', value: number): void;
  }>();

  const { t } = useI18n();
</script>
