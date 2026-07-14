import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { useRefreshTimer, type UseRefreshTimerHandle } from '../useRefreshTimer';

/**
 * Mount a host component that invokes useRefreshTimer inside its setup body
 * and exposes the handle on the wrapper. Required so `onUnmounted` runs.
 */
function mountWithTimer(
  callback: () => void | Promise<void>,
  intervalMs: number,
  options?: Parameters<typeof useRefreshTimer>[2],
) {
  let handle!: UseRefreshTimerHandle;
  const Host = defineComponent({
    setup() {
      handle = useRefreshTimer(callback, intervalMs, options);
      return () => h('div');
    },
  });
  const wrapper = mount(Host);
  return {
    wrapper,
    get handle() {
      return handle;
    },
  };
}

describe('useRefreshTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('autoStart / immediate option matrix', () => {
    it('default: autoStart=true + immediate=true → callback fires synchronously on mount', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(handle.isActive.value).toBe(true);
      wrapper.unmount();
    });

    it('autoStart=false → callback does not fire and isActive stays false', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { autoStart: false });
      expect(cb).not.toHaveBeenCalled();
      expect(handle.isActive.value).toBe(false);

      vi.advanceTimersByTime(5000);
      expect(cb).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('immediate=false → callback waits until the first interval', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { immediate: false });
      expect(cb).not.toHaveBeenCalled();
      expect(handle.isActive.value).toBe(true);

      vi.advanceTimersByTime(999);
      expect(cb).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(cb).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });
  });

  describe('tick scheduling', () => {
    it('fires once per intervalMs after start', () => {
      const cb = vi.fn();
      const { wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(3);
      wrapper.unmount();
    });
  });

  describe('start / stop are idempotent', () => {
    it('start() while already running is a no-op (does not double-fire or reset)', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      vi.advanceTimersByTime(500); // 500 ms into the interval
      handle.start(); // should not restart the clock
      vi.advanceTimersByTime(500); // reach 1000 ms total → first tick

      expect(cb).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });

    it('stop() while not running is a no-op', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { autoStart: false });

      expect(() => handle.stop()).not.toThrow();
      expect(handle.isActive.value).toBe(false);
      wrapper.unmount();
    });

    it('stop() halts further ticks', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(1);

      handle.stop();
      expect(handle.isActive.value).toBe(false);
      vi.advanceTimersByTime(10_000);
      expect(cb).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });

    it('start() after stop() re-arms the timer', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      vi.advanceTimersByTime(1000); // tick 1
      handle.stop();
      handle.start(); // immediate=true would have fired here, but we set immediate=false
      vi.advanceTimersByTime(1000); // tick 2
      expect(cb).toHaveBeenCalledTimes(2);
      wrapper.unmount();
    });
  });

  describe('runNow', () => {
    it('invokes the callback once without disturbing the schedule', () => {
      const cb = vi.fn();
      const { handle, wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      handle.runNow();
      expect(cb).toHaveBeenCalledTimes(1);

      // Schedule should still tick at exactly 1000 ms after mount, not from runNow
      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(2);
      wrapper.unmount();
    });
  });

  describe('error isolation — a bad tick must not kill the timer', () => {
    it('synchronous throw is logged but the next tick still fires', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cb = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('boom');
        })
        .mockImplementation(() => undefined);
      const { wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      vi.advanceTimersByTime(1000); // throws, gets caught
      expect(err).toHaveBeenCalledWith('[useRefreshTimer] callback threw:', expect.any(Error));

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(2);
      wrapper.unmount();
    });

    it('async rejection is logged but the next tick still fires', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cb = vi
        .fn()
        .mockImplementationOnce(() => Promise.reject(new Error('async boom')))
        .mockImplementation(() => Promise.resolve());
      const { wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      vi.advanceTimersByTime(1000);
      // Let microtasks drain so the .catch handler runs
      await Promise.resolve();
      await Promise.resolve();

      expect(err).toHaveBeenCalledWith('[useRefreshTimer] callback rejected:', expect.any(Error));

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(2);
      wrapper.unmount();
    });
  });

  describe('lifecycle integration', () => {
    it('unmount stops the timer and prevents further ticks', () => {
      const cb = vi.fn();
      const { wrapper } = mountWithTimer(cb, 1000, { immediate: false });

      wrapper.unmount();
      vi.advanceTimersByTime(10_000);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
