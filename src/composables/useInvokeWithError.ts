import { ref, type Ref } from 'vue';
import { getErrorMessage } from '@/utils/errors';

export interface UseInvokeWithErrorHandle<T> {
  /** True while the wrapped call is in flight. */
  loading: Ref<boolean>;
  /** Last error message; cleared on each new `run`. */
  error: Ref<string>;
  /** Last successful result. */
  data: Ref<T | null>;
  /**
   * Execute the wrapped call. On failure: records the message and returns
   * `undefined`; never throws. The caller can branch on the returned value.
   */
  run: (...args: unknown[]) => Promise<T | undefined>;
  /** Reset loading / error / data to their initial state. */
  reset: () => void;
}

/**
 * Wrap any async operation (typically a Tauri command) with a standard
 * { loading, error, data, run } state machine. Eliminates the repeating
 * try/catch + error-string normalization scattered across components.
 *
 * Example:
 *   const save = useInvokeWithError(api.saveRule);
 *   await save.run(rule);
 *   if (save.error.value) { ... }
 */
export function useInvokeWithError<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args: any[]) => Promise<T>,
): UseInvokeWithErrorHandle<T> {
  const loading = ref(false);
  const error = ref('');
  const data = ref<T | null>(null) as Ref<T | null>;

  async function run(...args: unknown[]): Promise<T | undefined> {
    loading.value = true;
    error.value = '';
    try {
      const result = await fn(...args);
      data.value = result;
      return result;
    } catch (e: unknown) {
      error.value = getErrorMessage(e);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    loading.value = false;
    error.value = '';
    data.value = null;
  }

  return { loading, error, data, run, reset };
}
