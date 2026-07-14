<template>
  <div class="footer">
    <div class="countdown-wrapper" role="status" aria-live="polite">
      <div class="countdown-ring">
        <svg class="countdown-svg" viewBox="0 0 36 36">
          <circle class="countdown-track" cx="18" cy="18" r="16" fill="none" stroke-width="3" />
          <circle
            class="countdown-progress"
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke-width="3"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="CIRCUMFERENCE * (1 - countdown / total)"
          />
        </svg>
        <span class="countdown-number">{{ countdown }}</span>
      </div>
      <span class="countdown-text">
        {{ $t('prompt.autoDismiss', { seconds: countdown }) }}
      </span>
    </div>

    <div class="action-buttons">
      <!--
        Default slot lets callers replace the right-hand button cluster.
        Fallback content matches the alert window's "cancel + confirm" pair.
      -->
      <slot name="actions">
        <button class="btn btn-ghost" type="button" @click="$emit('cancel')">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          {{ $t('prompt.no') }}
        </button>
        <button class="btn btn-primary" type="button" @click="$emit('confirm')">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {{ $t('prompt.yes') }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  // Circumference of r=16 circle, used for SVG stroke-dash maths.
  const CIRCUMFERENCE = 100.53;

  withDefaults(
    defineProps<{
      countdown: number;
      total?: number;
    }>(),
    { total: 30 },
  );

  defineEmits<{
    (e: 'confirm'): void;
    (e: 'cancel'): void;
  }>();
</script>

<style scoped>
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  :root.dark .footer {
    border-color: #334155;
  }

  .countdown-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .countdown-ring {
    position: relative;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }

  .countdown-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .countdown-track {
    stroke: #e2e8f0;
  }

  :root.dark .countdown-track {
    stroke: #334155;
  }

  .countdown-progress {
    stroke: #6366f1;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s linear;
  }

  .countdown-number {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #6366f1;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  :root.dark .countdown-number {
    color: #818cf8;
  }

  .countdown-text {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
  }

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

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.4);
  }

  .btn-primary:hover {
    box-shadow: 0 6px 16px -2px rgba(99, 102, 241, 0.5);
    transform: translateY(-1px);
  }

  .btn-primary:active {
    transform: translateY(0) scale(0.97);
  }
</style>
