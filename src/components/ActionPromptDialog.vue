<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="prompt"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        @click.self="cancel"
        @keydown.esc="cancel"
      >
        <div class="modal-card" role="document">
          <!-- Top accent -->
          <div class="top-accent">
            <div class="accent-glow"></div>
          </div>

          <!-- Header -->
          <div class="modal-header">
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
                <h3 id="dialog-title" class="header-title">{{ $t('prompt.title') }}</h3>
                <p id="dialog-description" class="header-subtitle">
                  {{ $t('prompt.subtitle') }}
                </p>
              </div>
            </div>
            <button
              class="close-btn"
              type="button"
              :aria-label="$t('prompt.close')"
              @click="cancel"
            >
              <svg
                class="close-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
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
          <div class="modal-body">
            <AlertInfoCard :data="prompt" />
            <AlertActionList
              ref="actionListRef"
              :actions="prompt.available_actions"
              selectable
              @select="selectAction"
            />
            <AlertFooter :countdown="countdown" :total="COUNTDOWN_SECONDS">
              <template #actions>
                <button
                  class="btn btn-ghost"
                  type="button"
                  :aria-label="$t('prompt.ignore')"
                  @click="cancel"
                >
                  <svg
                    class="btn-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {{ $t('prompt.ignore') }}
                </button>
              </template>
            </AlertFooter>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue';
  import { useMonitorStore } from '@/stores/monitor';
  import { useAlertCountdown } from '@/composables/useAlertCountdown';
  import AlertInfoCard from '@/components/alert/AlertInfoCard.vue';
  import AlertActionList from '@/components/alert/AlertActionList.vue';
  import AlertFooter from '@/components/alert/AlertFooter.vue';

  const COUNTDOWN_SECONDS = 30;

  const store = useMonitorStore();
  const prompt = computed(() => store.actionPrompt);
  const actionListRef = ref<InstanceType<typeof AlertActionList> | null>(null);

  const {
    countdown,
    start: startCountdown,
    stop: stopCountdown,
  } = useAlertCountdown(COUNTDOWN_SECONDS, () => cancel());

  watch(prompt, (val) => {
    stopCountdown();
    if (!val) return;
    startCountdown();
    nextTick(() => {
      actionListRef.value?.firstActionEl?.focus();
    });
  });

  function selectAction(index: number) {
    if (prompt.value) {
      store.executeAction(prompt.value.rule_id, index);
    }
    stopCountdown();
  }

  function cancel() {
    if (prompt.value) {
      store.cancelAction(prompt.value.rule_id);
    }
    stopCountdown();
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

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  .modal-fade-enter-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .modal-fade-enter-active .modal-card {
    transition:
      transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .modal-fade-leave-active {
    transition: opacity 0.2s cubic-bezier(0.4, 0, 1, 1);
  }
  .modal-fade-leave-active .modal-card {
    transition:
      transform 0.2s cubic-bezier(0.4, 0, 1, 1),
      opacity 0.2s cubic-bezier(0.4, 0, 1, 1);
  }
  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }
  .modal-fade-enter-from .modal-card {
    transform: scale(0.92) translateY(-8px);
    opacity: 0;
  }
  .modal-fade-leave-to .modal-card {
    transform: scale(0.97) translateY(4px);
    opacity: 0;
  }

  /* Overlay */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }

  /* Card container */
  .modal-card {
    width: 100%;
    max-width: 600px;
    max-height: 98vh;
    display: flex;
    flex-direction: column;
    border-radius: 20px;
    overflow: hidden;
    background: #ffffff;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 20px 50px -12px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  :root.dark .modal-card {
    background: #1e293b;
  }

  /* Top accent */
  .top-accent {
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
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

  /* Header */
  .modal-header {
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%);
    position: relative;
    flex-shrink: 0;
  }

  :root.dark .modal-header {
    background: linear-gradient(135deg, #991b1b 0%, #9a3412 50%, #92400e 100%);
  }

  .modal-header::before {
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
  .modal-body {
    padding: 20px 24px 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }

  /* Slot button (ignore) */
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn:active {
    transform: scale(0.97);
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  .btn-ghost {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .btn-ghost:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }

  :root.dark .btn-ghost {
    background: #1e293b;
    color: #94a3b8;
    border-color: #475556;
  }

  :root.dark .btn-ghost:hover {
    background: #334155;
    border-color: #64748b;
  }
</style>
