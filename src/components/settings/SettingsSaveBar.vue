<template>
  <div class="settings-save-bar">
    <div class="flex items-center gap-2 text-sm text-slate-400">
      <template v-if="state === 'saved'">
        <svg
          class="w-4 h-4 text-emerald-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-emerald-600 dark:text-emerald-400 font-medium">
          {{ t('settings.saveSuccess') }}
        </span>
      </template>
      <template v-else-if="state === 'error'">
        <svg
          class="w-4 h-4 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span class="text-red-600 dark:text-red-400 font-medium">
          {{ t('settings.saveFailed') }}
        </span>
      </template>
    </div>
    <button
      class="settings-save-btn"
      :class="state === 'saving' ? 'settings-save-loading' : ''"
      :disabled="state === 'saving'"
      @click="$emit('save')"
    >
      <svg v-if="state === 'saving'" class="settings-spinner" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <svg
        v-else
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {{ state === 'saving' ? t('settings.saving') : t('settings.save') }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';

  export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

  defineProps<{ state: SaveState }>();
  defineEmits<{ (e: 'save'): void }>();

  const { t } = useI18n();
</script>
