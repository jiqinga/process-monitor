<template>
  <SettingsCard
    :title="t('settings.notificationConfig')"
    :desc="t('settings.notificationConfigDesc')"
    icon-class="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
    body-class="space-y-6"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    </template>

    <!-- Position picker -->
    <div>
      <label class="settings-label">{{ t('settings.notificationPosition') }}</label>
      <div class="mt-2 flex gap-6 items-start">
        <div class="settings-screen-preview">
          <div class="settings-screen-header">
            <span class="settings-screen-dot"></span>
            <span class="settings-screen-dot"></span>
            <span class="settings-screen-dot"></span>
          </div>
          <div class="settings-screen-body">
            <button
              v-for="pos in positions"
              :key="pos.value"
              type="button"
              class="settings-corner-btn"
              :class="[pos.class, position === pos.value ? 'settings-corner-active' : '']"
              @click="$emit('update:position', pos.value)"
            >
              <div class="settings-corner-inner">
                <svg
                  class="w-2.5 h-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-3">
            <button
              v-for="pos in positions"
              :key="pos.value + '-label'"
              type="button"
              class="settings-pos-label"
              :class="position === pos.value ? 'settings-pos-label-active' : ''"
              @click="$emit('update:position', pos.value)"
            >
              {{ pos.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Duration slider -->
    <div>
      <label class="settings-label">{{ t('settings.notificationDuration') }}</label>
      <div class="mt-2 flex items-center gap-4">
        <div class="flex-1 relative">
          <input
            type="range"
            :value="durationMs / 1000"
            min="1"
            max="30"
            step="1"
            class="settings-slider"
            @input="
              $emit('update:durationMs', Number(($event.target as HTMLInputElement).value) * 1000)
            "
          />
          <div class="settings-slider-track">
            <div
              class="settings-slider-fill"
              :style="{ width: `${((durationMs / 1000 - 1) / 29) * 100}%` }"
            ></div>
          </div>
        </div>
        <div class="settings-duration-display">
          <span class="settings-duration-value">{{ durationMs / 1000 }}</span>
          <span class="settings-duration-unit">{{ t('settings.seconds') }}</span>
        </div>
      </div>
      <div class="flex gap-1.5 mt-3">
        <button
          v-for="preset in durationPresets"
          :key="preset.value"
          type="button"
          class="settings-preset-btn"
          :class="durationMs / 1000 === preset.value ? 'settings-preset-active' : ''"
          @click="$emit('update:durationMs', preset.value * 1000)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- Test button -->
    <div class="mt-4">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200"
        :class="testButtonClass"
        :disabled="testState === 'sending'"
        @click="testNotification"
      >
        <svg
          v-if="testState === 'sending'"
          class="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <svg
          v-else-if="testState === 'success'"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg
          v-else-if="testState === 'error'"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <svg
          v-else
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {{ testButtonLabel }}
      </button>
      <p v-if="testError" class="mt-2 text-xs text-red-500 dark:text-red-400">
        {{ testError }}
      </p>
    </div>
  </SettingsCard>
</template>

<script setup lang="ts">
  import { computed, onUnmounted, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import * as api from '@/api/tauri-commands';
  import { getErrorMessage } from '@/utils/errors';
  import SettingsCard from './SettingsCard.vue';

  type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  type TestState = 'idle' | 'sending' | 'success' | 'error';

  defineProps<{
    position: Position;
    durationMs: number;
  }>();

  defineEmits<{
    (e: 'update:position', value: Position): void;
    (e: 'update:durationMs', value: number): void;
  }>();

  const { t } = useI18n();

  const positions = computed(() => [
    { value: 'top-left' as const, label: t('settings.posTopLeft'), class: 'top-2 left-2' },
    { value: 'top-right' as const, label: t('settings.posTopRight'), class: 'top-2 right-2' },
    { value: 'bottom-left' as const, label: t('settings.posBottomLeft'), class: 'bottom-2 left-2' },
    {
      value: 'bottom-right' as const,
      label: t('settings.posBottomRight'),
      class: 'bottom-2 right-2',
    },
  ]);

  const durationPresets = computed(() => [
    { value: 3, label: `3${t('settings.seconds')}` },
    { value: 5, label: `5${t('settings.seconds')}` },
    { value: 10, label: `10${t('settings.seconds')}` },
    { value: 15, label: `15${t('settings.seconds')}` },
  ]);

  // Test notification state machine.
  const testState = ref<TestState>('idle');
  const testError = ref('');
  let testTimer: ReturnType<typeof setTimeout> | null = null;

  const testButtonClass = computed(() => {
    switch (testState.value) {
      case 'sending':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
      case 'success':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'error':
        return 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';
    }
  });

  const testButtonLabel = computed(() => {
    switch (testState.value) {
      case 'sending':
        return t('settings.testing');
      case 'success':
        return t('settings.testSuccess');
      case 'error':
        return t('settings.testFailed');
      default:
        return t('settings.testNotification');
    }
  });

  async function testNotification() {
    if (testState.value === 'sending') return;

    testState.value = 'sending';
    testError.value = '';
    if (testTimer) clearTimeout(testTimer);

    try {
      await api.showNotificationWindow(
        t('settings.testNotificationTitle'),
        t('settings.testNotificationBody'),
      );
      testState.value = 'success';
    } catch (e: unknown) {
      testState.value = 'error';
      testError.value = getErrorMessage(e);
    }

    testTimer = setTimeout(() => {
      testState.value = 'idle';
      testError.value = '';
    }, 3000);
  }

  onUnmounted(() => {
    if (testTimer) clearTimeout(testTimer);
  });
</script>
