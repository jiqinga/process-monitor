import { onUnmounted, ref, type Ref } from 'vue';

export interface UseAlertCountdownHandle {
  /** Current seconds remaining. */
  countdown: Ref<number>;
  /** Start ticking. Idempotent: re-calling restarts from the initial value. */
  start: () => void;
  /** Stop ticking without firing `onExpire`. */
  stop: () => void;
}

/**
 * Countdown from `initialSeconds` to 0, calling `onExpire` exactly once when
 * it hits 0. Cleans up on unmount; safe to call from a setup() body.
 */
export function useAlertCountdown(
  initialSeconds: number,
  onExpire: () => void,
): UseAlertCountdownHandle {
  const countdown = ref(initialSeconds);
  let timer: ReturnType<typeof setInterval> | null = null;

  function clear(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start(): void {
    clear();
    countdown.value = initialSeconds;
    timer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) {
        clear();
        onExpire();
      }
    }, 1000);
  }

  function stop(): void {
    clear();
  }

  onUnmounted(stop);

  return { countdown, start, stop };
}
