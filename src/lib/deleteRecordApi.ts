/**
 * 점괘 기록 서버 삭제 API 클라이언트
 *
 * deleteRecordViaApi(recordId)는 서버에 HTTP DELETE 요청을 전송하고
 * 응답 상태에 따라 성공/실패를 구분하여 반환한다.
 *
 * 클라이언트 측 localStorage 삭제(storage.deleteRecordFromStorage)와
 * 서버 측 동기화는 별도로 관리되며, 이 모듈은 서버 측 삭제만 담당한다.
 *
 * 반환 타입은 tagged union을 사용하여 호출자가 타입 내로잉으로
 * 성공/실패를 안전하게 분기할 수 있도록 설계한다.
 */

/** DELETE 요청 기본 타임아웃 (10초) */
const DELETE_TIMEOUT_MS = 10_000;

/**
 * API 기본 URL — 하드코딩 (Toss WebView에는 process 전역 객체가 없음).
 * 테스트 환경(jsdom)에서는 vi.stubGlobal으로 fetch를 mock하여 테스트.
 */
const API_BASE_URL = 'https://book-of-changes-api.viki-meadow.workers.dev';

function getApiBaseUrl(): string {
  return API_BASE_URL;
}

// ─── Types ──────────────────────────────────────────────────────────────────

/** 성공적인 삭제 응답 */
export interface ApiDeleteSuccess {
  success: true;
}

/** 서버/네트워크 오류로 인한 삭제 실패 응답 */
export interface ApiDeleteError {
  success: false;
  /** HTTP 상태 코드. 네트워크/타임아웃 오류 시 0 */
  status: number;
  /** 사용자 친화적 오류 메시지 */
  message: string;
}

/** deleteRecordViaApi의 반환 타입: tagged union */
export type ApiDeleteResult = ApiDeleteSuccess | ApiDeleteError;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 주어진 recordId에 대해 서버에 HTTP DELETE 요청을 전송한다.
 *
 * @param recordId - 삭제할 점괘 기록의 UUID
 * @returns 정상 삭제(200) 시 { success: true }
 *          서버 오류(4xx/5xx) 시 { success: false, status, message }
 *          네트워크/타임아웃 오류 시 { success: false, status: 0, message }
 *
 * @example
 * ```ts
 * const result = await deleteRecordViaApi('uuid-1234');
 * if (result.success) {
 *   // 서버에서 삭제 성공 → 클라이언트 localStorage도 삭제
 * } else if (result.status === 404) {
 *   // 서버에 이미 없는 기록 → 클라이언트만 삭제해도 무방
 * } else {
 *   // 네트워크/서버 오류 → 오프라인 큐에 추가 후 재시도
 * }
 * ```
 */
export async function deleteRecordViaApi(
  recordId: string,
): Promise<ApiDeleteResult> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      success: false,
      status: 0,
      message: 'API URL이 설정되지 않았습니다',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DELETE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/records/${encodeURIComponent(recordId)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      },
    );

    // 200 OK → 성공
    if (response.status === 200) {
      return { success: true };
    }

    // 4xx → 클라이언트 오류 (404 Not Found 등)
    if (response.status >= 400 && response.status < 500) {
      let message: string;
      try {
        const body = await response.json();
        message =
          typeof body.error === 'string'
            ? body.error
            : '서버에서 기록을 찾을 수 없습니다';
      } catch {
        message = getClientErrorMessage(response.status);
      }
      return { success: false, status: response.status, message };
    }

    // 5xx → 서버 오류
    if (response.status >= 500) {
      return {
        success: false,
        status: response.status,
        message: '일시적인 서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요',
      };
    }

    // 예상치 못한 2xx (200이 아닌) 또는 3xx
    return {
      success: false,
      status: response.status,
      message: `예상치 못한 응답 상태: ${response.status}`,
    };
  } catch (error) {
    // AbortError → 타임아웃
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        status: 0,
        message: '요청 시간이 초과되었습니다. 네트워크 상태를 확인해 주세요',
      };
    }

    // TypeError 등 네트워크 오류 (fetch 자체 실패)
    return {
      success: false,
      status: 0,
      message: '네트워크 연결을 확인해 주세요',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * HTTP 상태 코드에 대응하는 사용자 친화적 오류 메시지를 반환한다.
 * 서버가 JSON 응답을 반환하지 않은 경우의 폴백으로 사용된다.
 */
function getClientErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '잘못된 요청입니다';
    case 401:
      return '인증이 필요합니다';
    case 403:
      return '삭제 권한이 없습니다';
    case 404:
      return '해당 기록을 찾을 수 없습니다';
    case 405:
      return '지원하지 않는 요청 방식입니다';
    case 409:
      return '충돌이 발생했습니다. 다시 시도해 주세요';
    case 429:
      return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요';
    default:
      return `요청 처리 중 오류가 발생했습니다 (${status})`;
  }
}
