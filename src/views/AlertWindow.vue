<template>
  <Transition name="card-pop" appear>
    <div v-if="mounted" class="alert-root">
      <!-- Top accent bar -->
      <div class="top-accent">
        <div class="accent-glow"></div>
      </div>

      <!-- Custom title bar (drag region) -->
      <div data-tauri-drag-region class="header">
        <div class="header-left">
          <div class="header-icon-wrapper">
            <div class="pulse-ring"></div>
            <div class="header-icon">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <div class="header-text">
            <h3 class="header-title">{{ $t('prompt.title') }}</h3>
            <p class="header-subtitle">{{ $t('prompt.subtitle') }}</p>
          </div>
        </div>
        <button class="close-btn" :aria-label="$t('prompt.close')" @click="closeWindow">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="body">
        <template v-if="alertData">
          <AlertInfoCard :data="alertData" />
          <AlertActionList :actions="alertData.available_actions" />
          <AlertFooter
            :countdown="countdown"
            :total="COUNTDOWN_SECONDS"
            @confirm="executeAllActions"
            @cancel="cancel"
          />
        </template>

        <div v-else class="loading-state">
          <div class="loading-spinner"></div>
          <p class="loading-text">{{ $t('common.loading') }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import * as api from '@/api/tauri-commands';
  import { useAlertCountdown } from '@/composables/useAlertCountdown';
  import AlertInfoCard from '@/components/alert/AlertInfoCard.vue';
  import AlertActionList from '@/components/alert/AlertActionList.vue';
  import AlertFooter from '@/components/alert/AlertFooter.vue';
  import type { ActionPromptPayload } from '@/types';

  const COUNTDOWN_SECONDS = 30;

  const { locale } = useI18n();
  const alertData = ref<ActionPromptPayload | null>(null);
  const mounted = ref(false);

  const {
    countdown,
    start: startCountdown,
    stop: stopCountdown,
  } = useAlertCountdown(COUNTDOWN_SECONDS, () => void cancel());

  onMounted(() => {
    document.body.classList.add('transparent-window');

    const savedLang = localStorage.getItem('language') || 'zh-CN';
    locale.value = savedLang;

    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark =
      savedTheme === 'dark' ||
      (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);

    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');

    if (dataParam) {
      try {
        alertData.value = JSON.parse(decodeURIComponent(dataParam));
        startCountdown();
      } catch (e) {
        console.error('Failed to parse alert data:', e);
      }
    }

    requestAnimationFrame(() => {
      mounted.value = true;
    });
  });

  async function executeAllActions() {
    if (!alertData.value) return;
    stopCountdown();

    try {
      await api.executeAllActions(alertData.value.rule_id);
    } catch (e) {
      console.error('Failed to execute actions:', e);
    }

    await closeWindow();
  }

  async function cancel() {
    if (!alertData.value) return;
    stopCountdown();

    try {
      await api.cancelAction(alertData.value.rule_id);
    } catch (e) {
      console.error('Failed to cancel action:', e);
    }

    await closeWindow();
  }

  async function closeWindow() {
    try {
      const win = getCurrentWindow();
      await win.close();
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  }
</script>

<style scoped>
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.4);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .card-pop-enter-active {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .card-pop-enter-from {
    opacity: 0;
    transform: scale(0.92) translateY(-8px);
  }

  /* Root = the window itself */
  .alert-root {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  :root.dark .alert-root {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  }

  /* Top accent */
  .top-accent {
    position: relative;
    height: 3px;
    z-index: 2;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
    overflow: hidden;
  }

  .accent-glow {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  /* Header */
  .header {
    position: relative;
    z-index: 1;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%);
  }

  :root.dark .header {
    background: linear-gradient(135deg, #991b1b 0%, #9a3412 50%, #92400e 100%);
  }

  .header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
    pointer-events: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
  }

  .header-icon-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    animation: pulse 2s ease-in-out infinite;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
  }

  .icon {
    width: 24px;
    height: 24px;
    color: white;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .header-title {
    font-size: 18px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .header-subtitle {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 500;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  .close-btn:active {
    transform: scale(0.95);
  }

  .close-icon {
    width: 16px;
    height: 16px;
    color: white;
  }

  /* Body */
  .body {
    position: relative;
    z-index: 1;
    padding: 20px 24px 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    background: #ffffff;
  }

  :root.dark .body {
    background: #1e293b;
  }

  /* Loading state */
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  :root.dark .loading-spinner {
    border-color: #334155;
    border-top-color: #818cf8;
  }

  .loading-text {
    font-size: 14px;
    color: #94a3b8;
    font-weight: 500;
  }
</style>
