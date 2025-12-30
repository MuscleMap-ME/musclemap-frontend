import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../utils/api';

const createResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
});

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('validates wallet responses with defaults', async () => {
    fetch.mockResolvedValue(createResponse({ wallet: { balance: 42 } }));

    const wallet = await api.wallet.balance();

    expect(wallet.wallet.balance).toBe(42);
    expect(wallet.wallet.currency).toBeDefined();
  });

  it('surfaces API errors with message context', async () => {
    fetch.mockResolvedValue(createResponse({ error: 'Invalid credentials' }, false, 400));

    await expect(api.auth.login('test@example.com', 'bad')).rejects.toThrow('Invalid credentials');
  });
});
