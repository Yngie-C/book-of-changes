import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock KV Namespace ───
// Simulates Cloudflare KV with in-memory Map and TTL support

class MockKV {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Test helpers
  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

// ─── Mock OpenAI ───
// We mock the openai module so tests don't make real API calls

vi.mock('openai', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: '{"interpretation": "테스트 해석", "advice": "테스트 조언"}',
          refusal: null,
        },
        finish_reason: 'stop',
      },
    ],
    usage: { total_tokens: 500 },
  });

  return {
    default: class {
      chat = { completions: { create: mockCreate } };
    },
    __mockCreate: mockCreate,
  };
});

// Import after mocks are set up
import worker from './index';

const VALID_BODY = {
  hexagramNumber: 1,
  highlightedLines: [1, 2],
  userContext: {
    situation: '테스트 상황',
    category: '연애',
  },
};

function makeRequest(
  path: string,
  method: string,
  body: unknown = null,
  headers: Record<string, string> = {},
): Request {
  const url = `https://api.test${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Origin: 'https://test.tossmini.com',
      ...headers,
    },
  };
  if (body !== null) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  return new Request(url, init);
}

const mockKv = new MockKV();

const env = {
  OPENAI_API_KEY: 'test-key',
  ALLOWED_ORIGIN: 'https://*.tossmini.com',
  RATE_LIMIT: mockKv as unknown as KVNamespace,
};

async function fetchHandler(
  path: string,
  method: string,
  body: unknown = null,
  headers: Record<string, string> = {},
): Promise<Response> {
  const request = makeRequest(path, method, body, headers);
  return worker.fetch(request, env);
}

describe('API Auth & Rate Limiting', () => {
  beforeEach(() => {
    mockKv.clear();
    vi.clearAllMocks();
  });

  // ─── AC 3: Unauthenticated requests are rejected ───

  it('rejects /api/interpret without Authorization header (401)', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('인증');
  });

  it('rejects /api/interpret with empty Bearer token (401)', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: 'Bearer ',
      'X-Auth-Method': 'anonymous_key',
    });
    expect(res.status).toBe(401);
  });

  it('rejects /api/interpret with unknown auth method (401)', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: 'Bearer some-token',
      'X-Auth-Method': 'bad_method',
    });
    expect(res.status).toBe(401);
  });

  it('rejects /api/interpret with missing X-Auth-Method header', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: 'Bearer some-token',
    });
    expect(res.status).toBe(401);
  });

  // ─── AC 3: TTL token issuance & verification ───

  it('issues a TTL token via /api/auth/token', async () => {
    const res = await fetchHandler('/api/auth/token', 'POST');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeTruthy();
    expect(typeof data.token).toBe('string');
    expect(data.expiresIn).toBe(300);
  });

  it('accepts a valid TTL token for /api/interpret', async () => {
    // Issue token
    const tokenRes = await fetchHandler('/api/auth/token', 'POST');
    const { token } = await tokenRes.json();

    // Use token
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: `Bearer ${token}`,
      'X-Auth-Method': 'ttl_token',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.interpretation).toBeTruthy();
    expect(data.advice).toBeTruthy();
  });

  it('rejects an invalid/expired TTL token (401)', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: 'Bearer nonexistent-token-12345',
      'X-Auth-Method': 'ttl_token',
    });
    expect(res.status).toBe(401);
  });

  // ─── AC 3: Rate limit keys on authenticated identity ───

  it('anonymous_key rate limit bucket is keyed by token value', async () => {
    // User A with token "device-A"
    const resA = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: 'Bearer device-A',
      'X-Auth-Method': 'anonymous_key',
    });
    expect(resA.status).toBe(200);

    // User B with token "device-B" should get a separate bucket
    const resB = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: 'Bearer device-B',
      'X-Auth-Method': 'anonymous_key',
    });
    expect(resB.status).toBe(200);

    // Verify rate limit KV has separate keys for each device
    const minute = Math.floor(Date.now() / 60000);
    const keyA = `minute:anon:device-A:${minute}`;
    const keyB = `minute:anon:device-B:${minute}`;

    const valA = await mockKv.get(keyA);
    const valB = await mockKv.get(keyB);

    expect(valA).toBe('1');
    expect(valB).toBe('1');
  });

  it('ttl_token rate limit bucket is keyed by token value', async () => {
    // Issue two separate tokens
    const tokenResA = await fetchHandler('/api/auth/token', 'POST');
    const { token: tokenA } = await tokenResA.json();

    const tokenResB = await fetchHandler('/api/auth/token', 'POST');
    const { token: tokenB } = await tokenResB.json();

    // Use both tokens
    const resA = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: `Bearer ${tokenA}`,
      'X-Auth-Method': 'ttl_token',
    });
    expect(resA.status).toBe(200);

    const resB = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: `Bearer ${tokenB}`,
      'X-Auth-Method': 'ttl_token',
    });
    expect(resB.status).toBe(200);

    // Verify separate rate limit buckets
    const minute = Math.floor(Date.now() / 60000);
    const keyA = `minute:ttl:${tokenA}:${minute}`;
    const keyB = `minute:ttl:${tokenB}:${minute}`;

    const valA = await mockKv.get(keyA);
    const valB = await mockKv.get(keyB);

    expect(valA).toBe('1');
    expect(valB).toBe('1');
  });

  it('rate limit blocks after 10 requests from same identity (429)', async () => {
    const headers = {
      Authorization: 'Bearer rate-test-device',
      'X-Auth-Method': 'anonymous_key',
    };

    // First 10 requests should succeed
    for (let i = 0; i < 10; i++) {
      const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headers);
      expect(res.status).toBe(200);
    }

    // 11th request should be rate-limited
    const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headers);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('잦');
  });

  it('rate limit on one identity does not block a different identity', async () => {
    // Exhaust rate limit for device-A
    const headersA = {
      Authorization: 'Bearer device-A-rate',
      'X-Auth-Method': 'anonymous_key',
    };
    for (let i = 0; i < 10; i++) {
      await fetchHandler('/api/interpret', 'POST', VALID_BODY, headersA);
    }
    // device-A is now rate-limited
    const resA = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headersA);
    expect(resA.status).toBe(429);

    // device-B should still be able to make requests
    const headersB = {
      Authorization: 'Bearer device-B-rate',
      'X-Auth-Method': 'anonymous_key',
    };
    const resB = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headersB);
    expect(resB.status).toBe(200);
  });

  it('anonymous_key and ttl_token with same token value get separate buckets', async () => {
    // Issue a TTL token
    const tokenRes = await fetchHandler('/api/auth/token', 'POST');
    const { token } = await tokenRes.json();

    // Use as ttl_token
    const resTtl = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: `Bearer ${token}`,
      'X-Auth-Method': 'ttl_token',
    });
    expect(resTtl.status).toBe(200);

    // Same token value but as anonymous_key — should get separate bucket
    const resAnon = await fetchHandler('/api/interpret', 'POST', VALID_BODY, {
      Authorization: `Bearer ${token}`,
      'X-Auth-Method': 'anonymous_key',
    });
    expect(resAnon.status).toBe(200);

    // Verify different KV keys
    const minute = Math.floor(Date.now() / 60000);
    const ttlKey = `minute:ttl:${token}:${minute}`;
    const anonKey = `minute:anon:${token}:${minute}`;

    expect(await mockKv.get(ttlKey)).toBe('1');
    expect(await mockKv.get(anonKey)).toBe('1');
  });

  // ─── AC 3: Cannot bypass rate limit by spoofing deviceId ───
  // (Rate limit is keyed on the authenticated token, not client-supplied deviceId)

  it('different tokens produce different rate limit keys (no deviceId spoofing bypass)', async () => {
    // Make 9 requests with token-1
    const headers1 = {
      Authorization: 'Bearer token-1',
      'X-Auth-Method': 'anonymous_key',
    };
    for (let i = 0; i < 9; i++) {
      const res = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headers1);
      expect(res.status).toBe(200);
    }

    // 10th with token-1 succeeds
    const res10 = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headers1);
    expect(res10.status).toBe(200);

    // token-2 has its own fresh bucket — not affected by token-1 usage
    const headers2 = {
      Authorization: 'Bearer token-2',
      'X-Auth-Method': 'anonymous_key',
    };
    const res2 = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headers2);
    expect(res2.status).toBe(200);

    // token-1 is now at limit
    const resOver = await fetchHandler('/api/interpret', 'POST', VALID_BODY, headers1);
    expect(resOver.status).toBe(429);
  });

  // ─── Health check & CORS ───

  it('health check /ping returns ok', async () => {
    const res = await fetchHandler('/ping', 'GET');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('CORS preflight returns 204', async () => {
    const res = await fetchHandler('/api/interpret', 'OPTIONS');
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-Auth-Method');
  });

  // ─── Request validation ───

  it('rejects invalid hexagramNumber (400/500)', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', {
      ...VALID_BODY,
      hexagramNumber: 999,
    }, {
      Authorization: 'Bearer valid-device',
      'X-Auth-Method': 'anonymous_key',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects invalid category', async () => {
    const res = await fetchHandler('/api/interpret', 'POST', {
      ...VALID_BODY,
      userContext: { ...VALID_BODY.userContext, category: 'invalid' },
    }, {
      Authorization: 'Bearer valid-device',
      'X-Auth-Method': 'anonymous_key',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});