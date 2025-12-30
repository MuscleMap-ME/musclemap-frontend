import { describe, expect, it } from 'vitest';
import { extractErrorMessage } from '@musclemap/shared';

describe('shared error utils (frontend)', () => {
  it('prefers provided fallback when API payload lacks message', () => {
    const message = extractErrorMessage({ error: { code: 'AUTH_FAILED' } }, 'Login failed (401)');
    expect(message).toBe('Login failed (401)');
  });
});
