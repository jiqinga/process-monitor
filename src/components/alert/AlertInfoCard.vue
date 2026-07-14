<template>
  <div class="info-card">
    <div class="info-grid">
      <!-- Process name -->
      <div class="info-item">
        <div class="info-icon-wrapper cpu">
          <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        </div>
        <div class="info-content">
          <span class="info-label">{{ $t('prompt.process') }}</span>
          <span class="info-value process-name">{{ data.process_name }}</span>
        </div>
      </div>

      <!-- PID -->
      <div class="info-item">
        <div class="info-icon-wrapper pid">
          <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
        </div>
        <div class="info-content">
          <span class="info-label">{{ $t('prompt.pid') }}</span>
          <span class="info-value pid">{{ data.pid }}</span>
        </div>
      </div>

      <!-- Metric value -->
      <div class="info-item">
        <div class="info-icon-wrapper metric" :class="severity">
          <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div class="info-content">
          <span class="info-label">
            {{ $t(`metrics.${data.metric.split('(')[0]}`) }}
          </span>
          <span class="info-value metric" :class="severity">
            {{ formattedValue }}
          </span>
        </div>
      </div>

      <!-- Duration -->
      <div class="info-item">
        <div class="info-icon-wrapper duration">
          <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="info-content">
          <span class="info-label">{{ $t('prompt.duration') }}</span>
          <span class="info-value duration">{{ data.duration_secs }}s</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { formatMetricValue, getMetricSeverityClass } from '@/utils/alertFormat';
  import type { ActionPromptPayload } from '@/types';

  const props = defineProps<{
    data: ActionPromptPayload;
  }>();

  const { t } = useI18n();

  const severity = computed(() => getMetricSeverityClass(props.data.value, props.data.metric));
  const formattedValue = computed(() => formatMetricValue(props.data.value, props.data.metric, t));
</script>

<style scoped>
  .info-card {
    background: #f8fafc;
    border-radius: 14px;
    padding: 16px;
    border: 1px solid #e2e8f0;
  }

  :root.dark .info-card {
    background: #1a2332;
    border-color: #334155;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .info-icon-wrapper {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .info-icon-wrapper.cpu {
    background: #eff6ff;
    color: #3b82f6;
  }

  :root.dark .info-icon-wrapper.cpu {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  .info-icon-wrapper.pid {
    background: #f5f3ff;
    color: #8b5cf6;
  }

  :root.dark .info-icon-wrapper.pid {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
  }

  .info-icon-wrapper.metric.severity-critical {
    background: #fef2f2;
    color: #ef4444;
  }

  :root.dark .info-icon-wrapper.metric.severity-critical {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .info-icon-wrapper.metric.severity-warning {
    background: #fffbeb;
    color: #f59e0b;
  }

  :root.dark .info-icon-wrapper.metric.severity-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }

  .info-icon-wrapper.metric.severity-normal {
    background: #f0fdf4;
    color: #22c55e;
  }

  :root.dark .info-icon-wrapper.metric.severity-normal {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }

  .info-icon-wrapper.duration {
    background: #fdf4ff;
    color: #d946ef;
  }

  :root.dark .info-icon-wrapper.duration {
    background: rgba(217, 70, 239, 0.15);
    color: #e879f9;
  }

  .info-icon {
    width: 18px;
    height: 18px;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .info-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-value {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.3;
  }

  :root.dark .info-value {
    color: #e2e8f0;
  }

  .info-value.process-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .info-value.pid {
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 13px;
  }

  .info-value.metric.severity-critical {
    color: #ef4444;
  }

  :root.dark .info-value.metric.severity-critical {
    color: #f87171;
  }

  .info-value.metric.severity-warning {
    color: #f59e0b;
  }

  :root.dark .info-value.metric.severity-warning {
    color: #fbbf24;
  }
</style>
