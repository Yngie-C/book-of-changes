import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSdkDeviceId,
  requestTtlToken,
  getAuthToken,
  _resetTtlTokenCache,
  AiError,
} from '@/lib/ai';

// ─── Mock setup ───

// Track the current mock implementation of getDeviceId from the SDK
let mockGetDeviceId: (() => string | undefined) | null = null;

// Mock the @apps-in-toss/web-framework module so dynamic import returns our mock
vi.mock('@apps-in-toss/web-framework', () => {
  return {
    // When the code does `const { getDeviceId } = await import('@apps-in-toss/web-framework')`
    // this getter returns whatever mockGetDeviceId currently is
    get getDeviceId() {
      if (mockGetDeviceId === null) {
        throw new Error('getDeviceId is not available');
      }
      return mockGetDeviceId;
    },
  };
});

// Store original fetch to restore after tests
const originalFetch = globalThis.fetch;

/**
 * Helper: mock global fetch to respond to /api/auth/token requests.
 * Returns a spy so tests can inspect call counts.
 */
function mockFetchForTtlToken(
  response: { ok: boolean; body: unknown } = {
    ok: true,
    body: { token: 'test-ttl-token-abc123', expiresIn: 300 },
  },
) {
  const spy = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/auth/token')) {
      return {
        ok: response.ok,
        status: response.ok ? 200 : 500,
        json: async () => response.body,
      } as Response;
    }
    // For other endpoints (e.g., /api/interpret), return a generic response
    return {
      ok: true,
      status: 200,
      json: async () => ({ interpretation: 'test', advice: 'test advice' }),
    } as Response;
  });
  globalThis.fetch = spy as unknown as typeof globalThis.fetch;
  return spy;
}

describe('AI Auth — getSdkDeviceId', () => {
  beforeEach(() => {
    mockGetDeviceId = null;
    _resetTtlTokenCache();
  });

  it('returns a valid device ID when SDK getDeviceId returns a string', async () => {
    mockGetDeviceId = () => 'device-abc-123';
    const id = await getSdkDeviceId();
    expect(id).toBe('device-abc-123');
  });

  it('returns undefined when SDK getDeviceId returns empty string', async () => {
    mockGetDeviceId = () => '';
    const id = await getSdkDeviceId();
    expect(id).toBeUndefined();
  });

  it('returns undefined when getDeviceId is not available (throws)', async () => {
    // Simulate SDK not having getDeviceId — mockGetDeviceId stays null,
    // so the getter throws, which the code catches and returns undefined
    mockGetDeviceId = null;
    const id = await getSdkDeviceId();
    expect(id).toBeUndefined();
  });
});

describe('AI Auth — requestTtlToken (fallback path)', () => {
  beforeEach(() => {
    mockGetDeviceId = null;
    _resetTtlTokenCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches a TTL token from the API auth endpoint', async () => {
    const fetchSpy = mockFetchForTtlToken();
    const token = await requestTtlToken();
    expect(token).toBe('test-ttl-token-abc123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // Verify the correct endpoint was called
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/auth/token');
  });

  it('returns undefined when the API responds with an error', async () => {
    mockFetchForTtlToken({ ok: false, body: { error: 'server error' } });
    const token = await requestTtlToken();
    expect(token).toBeUndefined();
  });

  it('returns undefined when the response body has no token field', async () => {
    mockFetchForTtlToken({ ok: true, body: { noToken: true } });
    const token = await requestTtlToken();
    expect(token).toBeUndefined();
  });

  it('returns undefined when fetch throws a network error', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network'))) as unknown as typeof globalThis.fetch;
    const token = await requestTtlToken();
    expect(token).toBeUndefined();
  });
});

describe('AI Auth — TTL token cache (token expiry handling)', () => {
  beforeEach(() => {
    mockGetDeviceId = null;
    _resetTtlTokenCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('caches the TTL token and does not re-fetch on subsequent calls within the refresh window', async () => {
    const fetchSpy = mockFetchForTtlToken();
    // First call: should hit the API
    const token1 = await requestTtlToken();
    expect(token1).toBe('test-ttl-token-abc123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call: should use cache, not fetch again
    const token2 = await requestTtlToken();
    expect(token2).toBe('test-ttl-token-abc123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('re-fetches the TTL token after the cache expires (past the refresh window)', async () => {
    const fetchSpy = mockFetchForTtlToken();
    // First call: caches the token
    const token1 = await requestTtlToken();
    expect(token1).toBe('test-ttl-token-abc123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance Date.now past the 4-minute cache window (TTL_TOKEN_REFRESH_MS = 4 * 60 * 1000)
    const realDateNow = Date.now;
    Date.now = () => realDateNow() + 5 * 60 * 1000; // 5 minutes later

    try {
      // Second call: cache expired, should fetch again
      const token2 = await requestTtlToken();
      expect(token2).toBe('test-ttl-token-abc123');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realDateNow;
    }
  });
});

describe('AI Auth — getAuthToken (integration of both paths)', () => {
  beforeEach(() => {
    mockGetDeviceId = null;
    _resetTtlTokenCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('prefers SDK device ID when available and returns anonymous_key method', async () => {
    mockGetDeviceId = () => 'stable-device-id-xyz';
    const fetchSpy = mockFetchForTtlToken(); // should NOT be called

    const auth = await getAuthToken();
    expect(auth).not.toBeNull();
    expect(auth!.token).toBe('stable-device-id-xyz');
    expect(auth!.method).toBe('anonymous_key');

    // Verify the TTL fallback was NOT called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to TTL token when SDK device ID is unavailable', async () => {
    mockGetDeviceId = null; // SDK not available
    mockFetchForTtlToken(); // TTL fallback will be used

    const auth = await getAuthToken();
    expect(auth).not.toBeNull();
    expect(auth!.token).toBe('test-ttl-token-abc123');
    expect(auth!.method).toBe('ttl_token');
  });

  it('returns null when both SDK device ID and TTL token fail', async () => {
    mockGetDeviceId = null;
    // Make fetch fail for the TTL endpoint
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network'))) as unknown as typeof globalThis.fetch;

    const auth = await getAuthToken();
    expect(auth).toBeNull();
  });

  it('returns null when SDK returns empty string and TTL token endpoint returns error', async () => {
    mockGetDeviceId = () => ''; // SDK returns empty → treated as unavailable
    mockFetchForTtlToken({ ok: false, body: { error: 'fail' } });

    const auth = await getAuthToken();
    expect(auth).toBeNull();
  });
});

describe('AI Auth — requestAiInterpretation uses auth headers', () => {
  beforeEach(() => {
    mockGetDeviceId = null;
    _resetTtlTokenCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends Authorization and X-Auth-Method headers with SDK device ID', async () => {
    mockGetDeviceId = () => 'device-auth-123';
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ interpretation: '해석', advice: '조언' }),
      } as Response;
    });
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const { requestAiInterpretation } = await import('@/lib/ai');
    await requestAiInterpretation({
      hexagramNumber: 1,
      highlightedLines: [],
      situation: '테스트 상황',
      category: '연애',
    });

    expect(fetchSpy).toHaveBeenCalled();
    const callInit = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = callInit.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer device-auth-123');
    expect(headers['X-Auth-Method']).toBe('anonymous_key');
  });

  it('sends Authorization with ttl_token method when using fallback', async () => {
    mockGetDeviceId = null; // SDK unavailable

    let ttlTokenRequested = false;
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/token')) {
        ttlTokenRequested = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'fallback-ttl-token', expiresIn: 300 }),
        } as Response;
      }
      // /api/interpret endpoint
      return {
        ok: true,
        status: 200,
        json: async () => ({ interpretation: '해석', advice: '조언' }),
      } as Response;
    });
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const { requestAiInterpretation } = await import('@/lib/ai');
    await requestAiInterpretation({
      hexagramNumber: 1,
      highlightedLines: [],
      situation: '테스트 상황',
      category: '취업',
    });

    expect(ttlTokenRequested).toBe(true);
    // Find the interpret call (second fetch call)
    const interpretCall = fetchSpy.mock.calls.find(
      (call) => {
        const url = typeof call[0] === 'string' ? call[0] : call[0].toString();
        return url.includes('/api/interpret');
      },
    );
    expect(interpretCall).toBeDefined();
    const headers = (interpretCall![1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer fallback-ttl-token');
    expect(headers['X-Auth-Method']).toBe('ttl_token');
  });

  it('proceeds without auth headers when both paths fail (graceful degradation)', async () => {
    mockGetDeviceId = null;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/token')) {
        // TTL endpoint fails
        return { ok: false, status: 500, json: async () => ({ error: 'fail' }) } as Response;
      }
      // interpret endpoint — should still be called (server may accept unauthenticated)
      return {
        ok: true,
        status: 200,
        json: async () => ({ interpretation: '해석', advice: '조언' }),
      } as Response;
    }) as unknown as typeof globalThis.fetch;

    const { requestAiInterpretation } = await import('@/lib/ai');
    const result = await requestAiInterpretation({
      hexagramNumber: 1,
      highlightedLines: [],
      situation: '테스트',
      category: '재물',
    });

    // Should still get a result (graceful degradation — no auth header sent)
    expect(result.interpretation).toBe('해석');
    expect(result.advice).toBe('조언');
  });
});

describe('AI Auth — AiError type', () => {
  it('creates AiError with correct type and message', () => {
    const error = new AiError('rate-limited', '너무 많은 요청');
    expect(error.type).toBe('rate-limited');
    expect(error.message).toBe('너무 많은 요청');
    expect(error.name).toBe('AiError');
    expect(error instanceof Error).toBe(true);
  });

  it('supports all error types', () => {
    const types = ['timeout', 'network', 'server', 'rate-limited', 'invalid-response'] as const;
    for (const type of types) {
      const error = new AiError(type, `test ${type}`);
      expect(error.type).toBe(type);
    }
  });
});