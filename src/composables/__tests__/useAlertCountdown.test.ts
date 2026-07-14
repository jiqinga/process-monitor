import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { useAlertCountdown, type UseAlertCountdownHandle } from '../useAlertCountdown';

/**
 * Mount a host component whose setup body invokes `useAlertCountdown` and
 * exposes the handle on the wrapper instance. Required because `onUnmounted`
 * only works inside a real component lifecycle.
 */
function mountWithCountdown(initial: number, onExpire: () => void) {
  let handle!: UseAlertCountdownHandle;
  const Host = defineComponent({
    setup() {
      handle = useAlertCountdown(initial, onExpire);
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

describe('useAlertCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the initial seconds value', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(5, onExpire);
    expect(handle.countdown.value).toBe(5);
    wrapper.unmount();
  });

  it('does not tick until start() is called', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(3, onExpire);

    vi.advanceTimersByTime(5000);
    expect(handle.countdown.value).toBe(3);
    expect(onExpire).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('decrements once per second after start()', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(3, onExpire);

    handle.start();
    expect(handle.countdown.value).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(handle.countdown.value).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(handle.countdown.value).toBe(1);

    expect(onExpire).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('calls onExpire exactly once when reaching 0', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(2, onExpire);

    handle.start();
    vi.advanceTimersByTime(3000); // overshoot — should not call again
    expect(onExpire).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('does not keep firing after expiry even if timers continue advancing', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(1, onExpire);

    handle.start();
    vi.advanceTimersByTime(10_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('start() is idempotent — restarts from the initial value', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(5, onExpire);

    handle.start();
    vi.advanceTimersByTime(2000);
    expect(handle.countdown.value).toBe(3);

    handle.start();
    expect(handle.countdown.value).toBe(5);

    vi.advanceTimersByTime(1000);
    expect(handle.countdown.value).toBe(4);
    expect(onExpire).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('stop() halts decrement without firing onExpire', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(3, onExpire);

    handle.start();
    vi.advanceTimersByTime(1000);
    expect(handle.countdown.value).toBe(2);

    handle.stop();
    vi.advanceTimersByTime(5000);
    expect(handle.countdown.value).toBe(2);
    expect(onExpire).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('unmount stops the interval and never calls onExpire', () => {
    const onExpire = vi.fn();
    const { handle, wrapper } = mountWithCountdown(3, onExpire);

    handle.start();
    wrapper.unmount();

    vi.advanceTimersByTime(10_000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
