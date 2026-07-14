import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../errors';

describe('getErrorMessage', () => {
  it('returns message from a real Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns subclass Error message', () => {
    class CustomError extends Error {
      constructor() {
        super('custom failure');
        this.name = 'CustomError';
      }
    }
    expect(getErrorMessage(new CustomError())).toBe('custom failure');
  });

  it('returns the raw string', () => {
    // Tauri commands serialize AppError as a plain string — this is the hot path.
    expect(getErrorMessage('Failed to terminate process 42: access denied')).toBe(
      'Failed to terminate process 42: access denied',
    );
  });

  it('reads .message from a plain object with a string message field', () => {
    expect(getErrorMessage({ message: 'duck-typed' })).toBe('duck-typed');
  });

  it('falls back to JSON for objects without a usable message', () => {
    expect(getErrorMessage({ code: 500, detail: 'internal' })).toBe(
      JSON.stringify({ code: 500, detail: 'internal' }),
    );
  });

  it('ignores a non-string .message field', () => {
    // Object has `message` but it isn't a string → JSON fallback, not the field
    expect(getErrorMessage({ message: 123 })).toBe('{"message":123}');
  });

  it('handles null without crashing', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('handles undefined without crashing', () => {
    expect(getErrorMessage(undefined)).toBe(String(undefined));
  });

  it('handles number primitives', () => {
    expect(getErrorMessage(42)).toBe('42');
  });

  it('handles circular references via the String fallback', () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    // JSON.stringify throws on cycles → catch path → String(err)
    expect(getErrorMessage(a)).toBe(String(a));
  });
});
