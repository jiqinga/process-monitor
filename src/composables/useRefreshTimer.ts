import { onUnmounted, ref, type Ref } from 'vue';

export interface UseRefreshTimerOptions {
  /** Run the callback immediately on start. Defaults to true. */
  immediate?: boolean;
  /** Start the timer when the composable is created. Defaults to true. */
  autoStart?: boolean;
}

export interface UseRefreshTimerHandle {
  /** True while the timer is currently scheduled. */
  isActive: Ref<boolean>;
  /** Start (or restart) the timer. Idempotent. */
  start: () => void;
  /** Stop the timer. Idempotent. */
  stop: () => void;
  /** Invoke the callback once immediately without affecting the schedule. */
  runNow: () => void;
}

/**
 * Manage a `setInterval` with automatic cleanup on component unmount.
 * Errors thrown synchronously or returned as rejected promises are caught
 * and logged so a single bad tick cannot tear down the timer.
 */
export function useRefreshTimer(
  callback: () => void | Promise<void>,
  intervalMs: number,
  options: UseRefreshTimerOptions = {},
): UseRefreshTimerHandle {
  const { immediate = true, autoStart = true } = options;
  const isActive = ref(false);
  let handle: ReturnType<typeof setInterval> | null = null;

  function safeRun(): void {
    try {
      const result = callback();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch((err) => {
          console.error('[useRefreshTimer] callback rejected:', err);
        });
      }
    } catch (err) {
      console.error('[useRefreshTimer] callback threw:', err);
    }
  }

  function start(): void {
    if (handle !== null) return;
    isActive.value = true;
    if (immediate) safeRun();
    handle = setInterval(safeRun, intervalMs);
  }

  function stop(): void {
    if (handle === null) return;
    clearInterval(handle);
    handle = null;
    isActive.value = false;
  }

  function runNow(): void {
    safeRun();
  }

  if (autoStart) start();

  onUnmounted(stop);

  return { isActive, start, stop, runNow };
}
