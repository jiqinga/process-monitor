/**
 * Extract a human-readable message from an unknown error.
 * Tauri commands serialize AppError as a string; native JS errors expose `.message`.
 * Anything else falls back to String(err).
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  try {
    // JSON.stringify returns `undefined` for top-level undefined/function values,
    // which would break the declared `: string` return type — fall through to
    // String(err) ("undefined", "() => …") in that case.
    return JSON.stringify(err) ?? String(err);
  } catch {
    return String(err);
  }
}
