<template>
  <SettingsCard
    :title="t('settings.logRetention')"
    :desc="t('settings.logRetentionHint')"
    icon-class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    </template>

    <label class="settings-label">{{ t('settings.logRetentionDays') }}</label>
    <div class="flex items-center gap-4">
      <div class="settings-stepper">
        <button
          type="button"
          class="settings-stepper-btn"
          :disabled="days <= MIN_DAYS"
          @click="$emit('update:days', Math.max(MIN_DAYS, days - 1))"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" d="M5 12h14" />
          </svg>
        </button>
        <input
          :value="days"
          type="number"
          :min="MIN_DAYS"
          :max="MAX_DAYS"
          class="settings-stepper-input"
          @input="onInput"
        />
        <button
          type="button"
          class="settings-stepper-btn"
          :disabled="days >= MAX_DAYS"
          @click="$emit('update:days', Math.min(MAX_DAYS, days + 1))"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <span class="text-sm text-slate-400 font-medium">{{ t('settings.days') }}</span>
      <div class="flex gap-1.5 ml-auto">
        <button
          v-for="preset in PRESETS"
          :key="preset"
          type="button"
          class="settings-preset-btn"
          :class="days === preset ? 'settings-preset-active' : ''"
          @click="$emit('update:days', preset)"
        >
          {{ preset }}
        </button>
      </div>
    </div>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import SettingsCard from './SettingsCard.vue';

  const MIN_DAYS = 1;
  const MAX_DAYS = 365;
  const PRESETS = [7, 14, 30, 90] as const;

  defineProps<{ days: number }>();

  const emit = defineEmits<{
    (e: 'update:days', value: number): void;
  }>();

  const { t } = useI18n();

  function onInput(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      emit('update:days', Math.max(MIN_DAYS, Math.min(MAX_DAYS, value)));
    }
  }
</script>
