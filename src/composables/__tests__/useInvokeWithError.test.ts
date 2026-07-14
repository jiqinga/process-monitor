import { describe, expect, it, vi } from 'vitest';
import { useInvokeWithError } from '../useInvokeWithError';

describe('useInvokeWithError', () => {
  it('initial state is idle / empty / null', () => {
    const handle = useInvokeWithError(async () => 'unused');
    expect(handle.loading.value).toBe(false);
    expect(handle.error.value).toBe('');
    expect(handle.data.value).toBeNull();
  });

  it('on success: returns the resolved value and records it in data', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 42 });
    const handle = useInvokeWithError<{ id: number }>(fn);

    const result = await handle.run('arg1', 7);

    expect(fn).toHaveBeenCalledWith('arg1', 7);
    expect(result).toEqual({ id: 42 });
    expect(handle.data.value).toEqual({ id: 42 });
    expect(handle.error.value).toBe('');
    expect(handle.loading.value).toBe(false);
  });

  it('on failure: returns undefined and stores the error message — never throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network down'));
    const handle = useInvokeWithError<unknown>(fn);

    const result = await handle.run();

    expect(result).toBeUndefined();
    expect(handle.error.value).toBe('network down');
    expect(handle.data.value).toBeNull();
    expect(handle.loading.value).toBe(false);
  });

  it('failure with a string rejection normalizes via getErrorMessage', async () => {
    const fn = vi.fn().mockRejectedValue('Failed to terminate process 42: access denied');
    const handle = useInvokeWithError<unknown>(fn);

    await handle.run();

    expect(handle.error.value).toBe('Failed to terminate process 42: access denied');
  });

  it('subsequent run() clears the previous error before invocation', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('first')).mockResolvedValueOnce('ok');
    const handle = useInvokeWithError<string>(fn);

    await handle.run();
    expect(handle.error.value).toBe('first');

    await handle.run();
    expect(handle.error.value).toBe('');
    expect(handle.data.value).toBe('ok');
  });

  it('loading is true while the promise is pending and false after', async () => {
    let resolveFn: ((v: string) => void) | null = null;
    const fn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const handle = useInvokeWithError<string>(fn);

    const pending = handle.run();
    // Microtask ordering: we yield once so the try/loading.value=true runs.
    await Promise.resolve();
    expect(handle.loading.value).toBe(true);

    expect(resolveFn).not.toBeNull();
    (resolveFn as ((v: string) => void) | null)?.('done');
    await pending;
    expect(handle.loading.value).toBe(false);
    expect(handle.data.value).toBe('done');
  });

  it('reset() restores initial state after an error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    const handle = useInvokeWithError<number>(fn);
    await handle.run();
    expect(handle.error.value).not.toBe('');

    handle.reset();
    expect(handle.loading.value).toBe(false);
    expect(handle.error.value).toBe('');
    expect(handle.data.value).toBeNull();
  });

  it('reset() restores initial state after success', async () => {
    const fn = vi.fn().mockResolvedValue(7);
    const handle = useInvokeWithError<number>(fn);
    await handle.run();
    expect(handle.data.value).toBe(7);

    handle.reset();
    expect(handle.data.value).toBeNull();
  });
});
