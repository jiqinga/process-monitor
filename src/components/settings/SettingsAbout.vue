<template>
  <SettingsCard
    :title="t('settings.about')"
    :desc="t('settings.aboutDesc')"
    icon-class="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </template>

    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
      {{ t('settings.creditsChart') }}
    </p>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import SettingsCard from './SettingsCard.vue';

  const { t } = useI18n();
</script>
