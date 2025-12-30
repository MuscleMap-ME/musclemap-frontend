import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './errors';

describe('extractErrorMessage', () => {
  it('returns strings as-is', () => {
    expect(extractErrorMessage('Hello')).toBe('Hello');
  });

  it('handles Error objects', () => {
    expect(extractErrorMessage(new Error('Boom'))).toBe('Boom');
  });

  it('prevents "[object Object]" from leaking', () => {
    // When Error is constructed with a non-string, JS coerces to "[object Object]"
    const e = new Error({ message: 'nope' });
    expect(extractErrorMessage(e)).not.toBe('[object Object]');
  });

  it('extracts nested API shapes', () => {
    expect(extractErrorMessage({ error: { message: 'Invalid email or password' } }))
      .toBe('Invalid email or password');
    expect(extractErrorMessage({ message: 'Nope' })).toBe('Nope');
    expect(extractErrorMessage({ data: { error: 'Bad' } })).toBe('Bad');
  });

  it('falls back safely', () => {
    expect(extractErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(extractErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
