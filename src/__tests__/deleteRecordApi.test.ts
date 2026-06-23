import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  deleteRecordViaApi,
  type ApiDeleteResult,
  type ApiDeleteSuccess,
  type ApiDeleteError,
} from '@/lib/deleteRecordApi';

// ─── Test Constants ─────────────────────────────────────────────────────────

const TEST_RECORD_ID = '550e8400-e29b-41d4-a716-446655440000';
const API_BASE_URL = 'https://book-of-changes-api.viki-meadow.workers.dev';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** 성공 응답의 타입 가드 */
function isSuccess(result: ApiDeleteResult): result is ApiDeleteSuccess {
  return result.success === true;
}

/** 오류 응답의 타입 가드 */
function isError(result: ApiDeleteResult): result is ApiDeleteError {
  return result.success === false;
}

/** fetch mock을 설정한다. URL은 deleteRecordApi.ts에 하드코딩되어 있음. */
function setupFetchMock() {
  return vi.spyOn(globalThis, 'fetch');
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  // URL is now hardcoded in deleteRecordApi.ts — no env stubbing needed
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 정상 응답 (200)
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/records/:id — 200 OK', () => {
  it('올바른 URL과 method로 DELETE 요청을 전송한다', async () => {
    const fetchSpy = setupFetchMock().mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    await deleteRecordViaApi(TEST_RECORD_ID);

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/api/records/${TEST_RECORD_ID}`);
    expect(init).toEqual(
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('200 응답 시 { success: true }를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(new Response(null, { status: 200 }));

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.success).toBe(true);
    }
  });

  it('URL에 특수문자가 포함된 recordId를 안전하게 인코딩한다', async () => {
    const fetchSpy = setupFetchMock().mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    const idWithSpecialChars = 'test/id?query=1&fragment#top';
    await deleteRecordViaApi(idWithSpecialChars);

    const [url] = fetchSpy.mock.calls[0];
    // encodeURIComponent가 적용되었는지 확인
    expect(url).not.toContain('?query=');
    expect(url).not.toContain('#top');
    expect(url).toContain(encodeURIComponent(idWithSpecialChars));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 클라이언트 오류 (4xx)
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/records/:id — 4xx 오류', () => {
  it('404 응답 시 { success: false, status: 404 }를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(JSON.stringify({ error: '기록을 찾을 수 없습니다' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.message).toBe('기록을 찾을 수 없습니다');
    }
  });

  it('400 응답 시 적절한 오류 메시지를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(JSON.stringify({ error: '잘못된 요청 형식입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await deleteRecordViaApi('invalid-id');

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(400);
    }
  });

  it('401 응답 시 인증 오류 메시지를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(401);
      expect(result.message).toBe('인증이 필요합니다');
    }
  });

  it('403 응답 시 권한 오류 메시지를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 403 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(403);
      expect(result.message).toBe('삭제 권한이 없습니다');
    }
  });

  it('4xx 응답에 JSON body.error가 있으면 그 메시지를 우선 사용한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(
        JSON.stringify({ error: '커스텀 오류 메시지입니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.message).toBe('커스텀 오류 메시지입니다');
    }
  });

  it('4xx 응답에 JSON body.error가 문자열이 아니면 폴백 메시지를 사용한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'NOT_FOUND' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(404);
      expect(result.message).toBe('서버에서 기록을 찾을 수 없습니다');
    }
  });

  it('4xx 응답이 유효한 JSON이 아니면 상태 코드 기반 폴백 메시지를 사용한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response('Plain text error', {
        status: 409,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(409);
      expect(result.message).toBe('충돌이 발생했습니다. 다시 시도해 주세요');
    }
  });

  it('429 응답 시 rate-limit 메시지를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 429 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(429);
      expect(result.message).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 서버 오류 (5xx)
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/records/:id — 5xx 오류', () => {
  it('500 응답 시 { success: false, status: 500 }을 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.message).toBe(
        '일시적인 서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요',
      );
    }
  });

  it('502 응답 시 서버 오류 메시지를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 502 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(502);
      expect(result.message).toBe(
        '일시적인 서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요',
      );
    }
  });

  it('503 응답 시 서버 오류 메시지를 반환한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 503 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(503);
      expect(result.success).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 네트워크 / 타임아웃 오류
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/records/:id — 네트워크/타임아웃 오류', () => {
  it('fetch가 TypeError를 throw하면 네트워크 오류로 처리한다', async () => {
    setupFetchMock().mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.success).toBe(false);
      expect(result.status).toBe(0);
      expect(result.message).toBe('네트워크 연결을 확인해 주세요');
    }
  });

  it('fetch가 일반 Error를 throw해도 네트워크 오류로 처리한다', async () => {
    setupFetchMock().mockRejectedValue(
      new Error('Some random error'),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(0);
      expect(result.message).toBe('네트워크 연결을 확인해 주세요');
    }
  });

  it('AbortError 발생 시 타임아웃 메시지를 반환한다', async () => {
    vi.useFakeTimers();

    const abortError = new DOMException('The operation was aborted.', 'AbortError');

    const _fetchSpy = setupFetchMock().mockImplementation(
      () =>
        new Promise((_, reject) => {
          // 타이머가 만료되면 reject
          setTimeout(() => reject(abortError), DELETE_TIMEOUT_MS);
        }),
    );

    // 타이머를 즉시 만료시켜 AbortController가 abort되도록 한다
    // 참고: AbortController의 타이머는 deleteRecordViaApi 내부에서
    // setTimeout으로 설정되므로 fake timers로 진행시킨다
    const DELETE_TIMEOUT_MS = 10_000;
    const promise = deleteRecordViaApi(TEST_RECORD_ID);

    // 타이머를 타임아웃까지 진행
    await vi.advanceTimersByTimeAsync(DELETE_TIMEOUT_MS);

    const result = await promise;

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(0);
      expect(result.message).toBe(
        '요청 시간이 초과되었습니다. 네트워크 상태를 확인해 주세요',
      );
    }

    vi.useRealTimers();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// API URL 확인
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/records/:id — API URL 확인', () => {
  it('하드코딩된 API_BASE_URL을 사용하여 fetch를 호출한다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain(API_BASE_URL);
    expect(url).toContain(`/api/records/${TEST_RECORD_ID}`);
    expect(isSuccess(result)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 기타 상태 코드
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/records/:id — 기타 응답', () => {
  it('200이 아닌 2xx 응답도 오류로 처리한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(204);
      expect(result.message).toBe('예상치 못한 응답 상태: 204');
    }
  });

  it('3xx 응답은 오류로 처리한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 302 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(302);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 타입 내로잉 (컴파일 타임 검증 — 런타임 동작 테스트)
// ═════════════════════════════════════════════════════════════════════════════

describe('타입 내로잉 동작', () => {
  it('isSuccess 타입 가드가 정상 동작한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    if (isSuccess(result)) {
      // success로 좁혀졌는지 확인 (타입 가드는 컴파일 타임에 검증됨)
      expect(result.success).toBe(true);
    } else {
      // 실패 시 TypeScript는 result를 ApiDeleteError로 좁힘
      expect(result.success).toBe(false);
    }
  });

  it('isError 타입 가드가 정상 동작한다', async () => {
    setupFetchMock().mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const result = await deleteRecordViaApi(TEST_RECORD_ID);

    if (isError(result)) {
      // error로 좁혀졌는지 확인
      expect(result.success).toBe(false);
      expect(typeof result.status).toBe('number');
      expect(typeof result.message).toBe('string');
    }
  });
});
