<template>
  <div class="actions-section">
    <h4 class="section-title">
      <svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          :d="selectable ? CLICK_ICON_PATH : LIST_ICON_PATH"
        />
      </svg>
      {{ $t(selectable ? 'prompt.chooseAction' : 'prompt.actionsToExecute') }}
    </h4>

    <div
      class="actions-list"
      :role="selectable ? 'group' : undefined"
      :aria-label="selectable ? $t('prompt.chooseAction') : undefined"
    >
      <!-- Selectable mode: <button>s, emit select on click/Enter/Space -->
      <template v-if="selectable">
        <button
          v-for="(action, idx) in actions"
          :ref="(el) => bindFirstRef(el as Element | null, idx)"
          :key="action.index"
          class="action-item action-item--clickable"
          type="button"
          :aria-label="$t('prompt.executeAction') + ': ' + action.label"
          :style="{ animationDelay: `${idx * 80}ms` }"
          @click="$emit('select', action.index)"
          @keydown.enter="$emit('select', action.index)"
          @keydown.space.prevent="$emit('select', action.index)"
        >
          <span class="action-badge">{{ idx + 1 }}</span>
          <span class="action-label">{{ getActionLabel(action, t) }}</span>
          <svg
            class="action-arrow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </template>

      <!-- Read-only mode: <div>s -->
      <template v-else>
        <div
          v-for="(action, idx) in actions"
          :key="action.index"
          class="action-item"
          :style="{ animationDelay: `${idx * 80}ms` }"
        >
          <span class="action-badge">{{ idx + 1 }}</span>
          <span class="action-label">{{ getActionLabel(action, t) }}</span>
          <svg class="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { getActionLabel } from '@/utils/alertFormat';
  import type { ActionDetail } from '@/types';

  // SVG path data for section title icon (clipboard vs cursor).
  const LIST_ICON_PATH =
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
  const CLICK_ICON_PATH =
    'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';

  withDefaults(
    defineProps<{
      actions: ActionDetail[];
      /** When true, render as clickable buttons and emit `select(index)`. */
      selectable?: boolean;
    }>(),
    { selectable: false },
  );

  defineEmits<{
    (e: 'select', index: number): void;
  }>();

  const { t } = useI18n();

  /** First action element, exposed so the parent can call `.focus()`. */
  const firstActionEl = ref<HTMLButtonElement | null>(null);

  function bindFirstRef(el: Element | null, idx: number) {
    if (idx === 0) {
      firstActionEl.value = el as HTMLButtonElement | null;
    }
  }

  defineExpose({ firstActionEl });
</script>

<style scoped>
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
    letter-spacing: -0.01em;
  }

  :root.dark .section-title {
    color: #94a3b8;
  }

  .section-icon {
    width: 16px;
    height: 16px;
    color: #6366f1;
  }

  :root.dark .section-icon {
    color: #818cf8;
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    animation: slideUp 0.3s ease-out both;
    transition: all 0.2s ease;
    /* Reset button defaults when rendered as <button>. */
    width: 100%;
    font: inherit;
    color: inherit;
    text-align: left;
  }

  :root.dark .action-item {
    background: #1a2332;
    border-color: #334155;
  }

  .action-item--clickable {
    cursor: pointer;
    padding: 12px 14px;
    border-radius: 12px;
  }

  .action-item--clickable:hover {
    border-color: #6366f1;
    background: #eef2ff;
    transform: translateX(4px);
    box-shadow: 0 2px 8px -2px rgba(99, 102, 241, 0.2);
  }

  :root.dark .action-item--clickable:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
    box-shadow: 0 2px 8px -2px rgba(99, 102, 241, 0.15);
  }

  .action-item--clickable:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  .action-item--clickable:active {
    transform: translateX(2px) scale(0.99);
  }

  /* Read-only hover (subtle highlight only). */
  .action-item:not(.action-item--clickable):hover {
    border-color: #6366f1;
    background: #eef2ff;
    transform: translateX(4px);
  }

  :root.dark .action-item:not(.action-item--clickable):hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .action-badge {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .action-item--clickable .action-badge {
    width: 26px;
    height: 26px;
  }

  .action-label {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-item--clickable .action-label {
    font-weight: 600;
  }

  :root.dark .action-label {
    color: #cbd5e1;
  }

  .action-arrow {
    width: 16px;
    height: 16px;
    color: #94a3b8;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .action-item--clickable .action-arrow {
    width: 18px;
    height: 18px;
  }

  .action-item:hover .action-arrow {
    transform: translateX(3px);
    color: #6366f1;
  }
</style>
