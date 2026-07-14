<template>
  <Transition name="toast">
    <div
      v-if="visible"
      ref="cardRef"
      class="toast-root"
      :class="{ 'is-expanded': expanded }"
      @mouseenter="onExpand"
      @mouseleave="onCollapse"
    >
      <!-- 左侧彩色条 -->
      <div class="toast-accent" aria-hidden="true"></div>

      <!-- 图标区 -->
      <div class="toast-icon-area" aria-hidden="true">
        <div class="icon-ring">
          <svg
            class="icon-bell"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="toast-content">
        <div class="toast-title">{{ title }}</div>
        <div class="toast-body">{{ body }}</div>
      </div>

      <!-- 关闭按钮 -->
      <button class="toast-close-btn" :aria-label="'关闭通知'" @click="close">
        <svg
          class="close-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- 底部进度条 -->
      <div class="toast-progress-track">
        <div class="toast-progress-bar" :style="{ animationDuration: durationMs + 'ms' }"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
  import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';

  const title = ref('');
  const body = ref('');
  const durationMs = ref(5000);
  const visible = ref(false);
  const expanded = ref(false);
  const cardRef = ref<HTMLElement | null>(null);

  const BASE_WINDOW_H = 80;
  const EXPANDED_MAX_H = 220;
  const EXPANDED_PADDING = 24;

  let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let fallbackCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let closeAnimTimer: ReturnType<typeof setTimeout> | null = null;
  let unlistenFn: UnlistenFn | null = null;

  function clearTimers() {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    if (fallbackCloseTimer) {
      clearTimeout(fallbackCloseTimer);
      fallbackCloseTimer = null;
    }
    if (closeAnimTimer) {
      clearTimeout(closeAnimTimer);
      closeAnimTimer = null;
    }
  }

  function applyTheme(mode: string) {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }

  async function resizeWindow(height: number) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize } = await import('@tauri-apps/api/dpi');
      const win = getCurrentWindow();
      const size = await win.innerSize();
      const dpr = window.devicePixelRatio || 1;
      await win.setSize(new LogicalSize(size.width / dpr, height));
    } catch {
      // 非 Tauri 环境忽略
    }
  }

  async function onExpand() {
    if (expanded.value) return;
    await resizeWindow(EXPANDED_MAX_H);
    expanded.value = true;
    await nextTick();
    if (cardRef.value) {
      const realH = cardRef.value.scrollHeight + EXPANDED_PADDING;
      if (realH < EXPANDED_MAX_H) {
        resizeWindow(Math.max(BASE_WINDOW_H, realH));
      }
    }
  }

  function onCollapse() {
    expanded.value = false;
    resizeWindow(BASE_WINDOW_H);
  }

  function close() {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    visible.value = false;
    closeAnimTimer = setTimeout(() => {
      closeAnimTimer = null;
      closeWindow();
    }, 320);
  }

  async function showWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().show();
    } catch {
      // 非 Tauri 环境忽略
    }
  }

  async function closeWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().close();
    } catch {
      window.close();
    }
  }

  onMounted(() => {
    document.body.classList.add('transparent-window');

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');

    let hasValidData = false;

    async function showNotification(data: { title: string; body: string; duration_ms?: number }) {
      if (hasValidData) return;
      hasValidData = true;
      title.value = data.title || '';
      body.value = data.body || '';
      durationMs.value = data.duration_ms || 5000;

      await nextTick();
      await showWindow();

      requestAnimationFrame(() => {
        visible.value = true;
      });

      autoCloseTimer = setTimeout(() => {
        autoCloseTimer = null;
        close();
      }, durationMs.value);
    }

    // 方式1: 从 URL 参数解析
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        showNotification(data);
      } catch (e) {
        console.error('Failed to parse notification data from URL:', e);
      }
    }

    // 方式2: 监听事件作为备份
    listen<{ title: string; body: string; duration_ms?: number }>('notification-data', (event) => {
      showNotification(event.payload);
    })
      .then((fn) => {
        unlistenFn = fn;
      })
      .catch((err) => console.error('listen notification-data failed:', err));

    // 如果两种方式都没有数据，延迟关闭窗口
    fallbackCloseTimer = setTimeout(() => {
      fallbackCloseTimer = null;
      if (!hasValidData) {
        closeWindow();
      }
    }, 500);
  });

  onBeforeUnmount(() => {
    clearTimers();
    if (unlistenFn) {
      unlistenFn();
      unlistenFn = null;
    }
  });
</script>

<style scoped>
  /* ========== 入场/退场动画 ========== */
  .toast-enter-active {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .toast-leave-active {
    transition: all 0.28s cubic-bezier(0.4, 0, 1, 1);
  }
  .toast-enter-from {
    opacity: 0;
    transform: translateX(100%) scale(0.92);
  }
  .toast-leave-to {
    opacity: 0;
    transform: translateX(40px) scale(0.96);
  }

  /* ========== 根元素 = 窗口本身 ========== */
  .toast-root {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 14px 0 0;
    background: #ffffff;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    font-family:
      'Inter',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      'Helvetica Neue',
      sans-serif;
  }

  :global(.dark) .toast-root {
    background: linear-gradient(135deg, #1e293b 0%, #1a2332 100%);
  }

  /* ========== 展开态 ========== */
  .toast-root.is-expanded {
    overflow: visible;
    align-items: flex-start;
    height: auto;
    min-height: 100%;
  }

  .toast-root.is-expanded .toast-title,
  .toast-root.is-expanded .toast-body {
    white-space: normal;
    word-break: break-all;
    overflow: visible;
    text-overflow: unset;
  }

  /* ========== 左侧彩色条 ========== */
  .toast-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3.5px;
    background: linear-gradient(180deg, #6366f1 0%, #a855f7 100%);
  }

  /* ========== 图标区 ========== */
  .toast-icon-area {
    flex-shrink: 0;
    padding-left: 18px;
  }

  .icon-ring {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: linear-gradient(135deg, #eef2ff 0%, #e8e0ff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.dark) .icon-ring {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%);
  }

  .icon-bell {
    width: 18px;
    height: 18px;
    color: #6366f1;
  }

  :global(.dark) .icon-bell {
    color: #a5b4fc;
  }

  /* ========== 文本内容 ========== */
  .toast-content {
    flex: 1;
    min-width: 0;
    padding-right: 4px;
  }

  .toast-title {
    font-size: 13px;
    font-weight: 650;
    color: #1e293b;
    line-height: 1.35;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
  }

  .toast-body {
    font-size: 12px;
    font-weight: 400;
    color: #64748b;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.dark) .toast-title {
    color: #f1f5f9;
  }
  :global(.dark) .toast-body {
    color: #94a3b8;
  }

  /* ========== 关闭按钮 ========== */
  .toast-close-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .toast-close-btn:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .toast-close-btn:active {
    background: #e2e8f0;
    transform: scale(0.93);
  }

  :global(.dark) .toast-close-btn {
    color: #64748b;
  }
  :global(.dark) .toast-close-btn:hover {
    background: rgba(51, 65, 85, 0.6);
    color: #94a3b8;
  }
  :global(.dark) .toast-close-btn:active {
    background: rgba(51, 65, 85, 0.8);
  }

  .close-icon {
    width: 14px;
    height: 14px;
  }

  /* ========== 底部进度条 ========== */
  .toast-progress-track {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2.5px;
    background: rgba(226, 232, 240, 0.5);
    overflow: hidden;
  }

  :global(.dark) .toast-progress-track {
    background: rgba(51, 65, 85, 0.4);
  }

  .toast-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
    background-size: 200% 100%;
    animation:
      progressShrink linear forwards,
      progressShimmer 2s ease-in-out infinite;
    transform-origin: left;
  }

  @keyframes progressShrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  @keyframes progressShimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
</style>
