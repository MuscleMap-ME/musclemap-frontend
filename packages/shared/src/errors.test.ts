import { describe, expect, it } from 'vitest';
import { DEFAULT_ERROR_MESSAGE, extractErrorMessage, safeStringify } from './errors';

describe('safeStringify', () => {
  it('handles circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    expect(safeStringify(obj)).toContain('[Circular]');
  });

  it('respects maxLen', () => {
    const long = 'x'.repeat(5000);
    const result = safeStringify({ long }, 1000);
    expect(result.length).toBeLessThanOrEqual(1001); // includes ellipsis
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('extractErrorMessage', () => {
  it('returns strings as-is', () => {
    expect(extractErrorMessage('Hello')).toBe('Hello');
  });

  it('handles Error objects', () => {
    expect(extractErrorMessage(new Error('Boom'))).toBe('Boom');
  });

  it('prevents "[object Object]" from leaking', () => {
    // When Error is constructed with a non-string, JS coerces to "[object Object]"
    const e = new Error({ message: 'nope' } as any);
    expect(extractErrorMessage(e)).not.toBe('[object Object]');
  });

  it('extracts nested API shapes', () => {
    expect(extractErrorMessage({ error: { message: 'Invalid email or password' } }))
      .toBe('Invalid email or password');
    expect(extractErrorMessage({ message: 'Nope' })).toBe('Nope');
    expect(extractErrorMessage({ data: { error: 'Bad' } })).toBe('Bad');
  });

  it('honors provided fallback for API responses', () => {
    const res = extractErrorMessage({ error: { code: 'AUTH_FAILED' } }, 'Login failed (401)');
    expect(res).toBe('Login failed (401)');
  });

  it('falls back safely', () => {
    expect(extractErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(extractErrorMessage({}, 'Fallback')).toBe('Fallback');
    expect(extractErrorMessage(undefined)).toBe(DEFAULT_ERROR_MESSAGE);
  });
});
