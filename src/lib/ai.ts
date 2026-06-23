/**
 * AI 맞춤 해석 API 클라이언트
 */

// Hardcoded Workers URL — Toss WebView has no process.env global,
// so the URL cannot be injected via environment variables.
// Deploy with: cd api && wrangler deploy (uses wrangler.toml name = "book-of-changes-api")
const API_BASE_URL = 'https://book-of-changes-api.viki-meadow.workers.dev';

export type AiErrorType = 'timeout' | 'network' | 'server' | 'rate-limited' | 'invalid-response';

export class AiError extends Error {
  constructor(
    public readonly type: AiErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface AiRequestParams {
  hexagramNumber: number;
  changingHexagramNumber?: number | null;
  highlightedLines: number[];
  situation: string;
  category: string;
}

export interface AiInterpretation {
  interpretation: string;
  advice: string;
}

// ─── Auth Token Management ───

export type AuthMethod = 'anonymous_key' | 'ttl_token';

interface AuthToken {
  token: string;
  method: AuthMethod;
}

// Cache for the TTL fallback token (in-memory, 4-minute refresh window)
let cachedTtlToken: { token: string; expiresAt: number } | null = null;
const TTL_TOKEN_REFRESH_MS = 4 * 60 * 1000; // refresh before 5-min expiry

/**
 * Reset the TTL token cache. Exported for unit testing only.
 * @internal
 */
export function _resetTtlTokenCache(): void {
  cachedTtlToken = null;
}

/**
 * Try to get the Toss SDK device identifier (stable per-device ID).
 * getDeviceId() is synchronous and available in SDK 2.4.1+.
 * Returns undefined in non-Toss environments where the bridge is not available.
 */
export async function getSdkDeviceId(): Promise<string | undefined> {
  try {
    const { getDeviceId } = await import('@apps-in-toss/web-framework');
    const id = getDeviceId();
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
    return undefined;
  } catch {
    // getDeviceId not available (not in Toss app or SDK too old)
    return undefined;
  }
}

/**
 * Request a short-TTL token from the Workers API.
 * The server stores the token in KV with a 5-minute expiry.
 */
export async function requestTtlToken(): Promise<string | undefined> {
  // Return cached token if still valid
  if (cachedTtlToken && Date.now() < cachedTtlToken.expiresAt) {
    return cachedTtlToken.token;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return undefined;

    const data = await response.json();
    if (!data.token || typeof data.token !== 'string') return undefined;

    cachedTtlToken = {
      token: data.token,
      expiresAt: Date.now() + TTL_TOKEN_REFRESH_MS,
    };
    return data.token;
  } catch {
    return undefined;
  }
}

/**
 * Acquire an auth token, preferring the Toss SDK device ID.
 * Falls back to a Workers-issued short-TTL token when the SDK device ID is unavailable.
 * Both paths produce a valid authenticated identifier for API requests.
 */
export async function getAuthToken(): Promise<AuthToken | null> {
  // Primary: Toss SDK device ID (stable, per-device, hard to spoof)
  const sdkDeviceId = await getSdkDeviceId();
  if (sdkDeviceId) {
    return { token: sdkDeviceId, method: 'anonymous_key' };
  }

  // Fallback: Workers-issued short-TTL token
  const ttlToken = await requestTtlToken();
  if (ttlToken) {
    return { token: ttlToken, method: 'ttl_token' };
  }

  return null;
}

export async function requestAiInterpretation(
  params: AiRequestParams,
  signal?: AbortSignal,
): Promise<AiInterpretation> {
  if (!API_BASE_URL) {
    throw new AiError('server', 'AI API URL이 설정되지 않았습니다');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  // 외부 signal과 내부 timeout 결합
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const auth = await getAuthToken();

    const body = {
      hexagramNumber: params.hexagramNumber,
      ...(params.changingHexagramNumber ? { changingHexagramNumber: params.changingHexagramNumber } : {}),
      highlightedLines: params.highlightedLines,
      userContext: {
        situation: params.situation,
        category: params.category,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth) {
      headers['Authorization'] = `Bearer ${auth.token}`;
      headers['X-Auth-Method'] = auth.method;
    }

    const response = await fetch(`${API_BASE_URL}/api/interpret`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new AiError('rate-limited', '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요');
    }

    if (!response.ok) {
      throw new AiError('server', '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요');
    }

    const data = await response.json();

    if (!data.interpretation || !data.advice) {
      throw new AiError('invalid-response', '응답 형식이 올바르지 않습니다');
    }

    return {
      interpretation: data.interpretation,
      advice: data.advice,
    };
  } catch (error) {
    if (error instanceof AiError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AiError('timeout', '분석에 시간이 걸리고 있어요. 다시 시도해 주세요');
    }

    throw new AiError('network', '네트워크 연결을 확인해 주세요');
  } finally {
    clearTimeout(timeoutId);
  }
}
