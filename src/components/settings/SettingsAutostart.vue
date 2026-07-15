<template>
  <SettingsCard
    :title="t('settings.autostart')"
    :desc="t('settings.autostartDesc')"
    icon-class="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </template>

    <div class="flex items-center justify-between">
      <div>
        <label class="settings-label">{{ t('settings.autostartEnabled') }}</label>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {{ t('settings.autostartHint') }}
        </p>
      </div>
      <button
        type="button"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        :class="enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'"
        @click="$emit('toggle')"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
          :class="enabled ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <div
      class="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60"
      :class="{ 'opacity-50': !enabled }"
    >
      <div>
        <label class="settings-label">{{ t('settings.startMinimizedEnabled') }}</label>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {{ t('settings.startMinimizedHint') }}
        </p>
      </div>
      <button
        type="button"
        :disabled="!enabled"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed"
        :class="startMinimized && enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'"
        @click="$emit('update:startMinimized', !startMinimized)"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
          :class="startMinimized ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import SettingsCard from './SettingsCard.vue';

  defineProps<{ enabled: boolean; startMinimized: boolean }>();
  defineEmits<{ (e: 'toggle'): void; (e: 'update:startMinimized', value: boolean): void }>();

  const { t } = useI18n();
</script>
