/**
 * 점괘 기록 삭제 응답 처리기
 *
 * deleteRecordViaApi()의 반환값(ApiDeleteResult)을 받아:
 * - 성공 시: 응답을 그대로 반환
 * - 실패 시: localStorage에 기록을 재삽입(롤백)하고 DeleteRollbackError를 throw
 *
 * 사용 예시:
 * ```ts
 * try {
 *   const apiResult = await deleteRecordViaApi(record.id);
 *   handleDeleteResponse(apiResult, record);
 * } catch (error) {
 *   if (error instanceof DeleteRollbackError) {
 *     // 롤백 완료, 사용자에게 실패 알림
 *   }
 * }
 * ```
 */

import type { DivinationRecord } from '@/data/types';
import type { ApiDeleteResult, ApiDeleteError } from './deleteRecordApi';
import { reinsertRecord } from './storage';

// ─── Error Types ─────────────────────────────────────────────────────────────

/**
 * 삭제 롤백 전용 에러 클래스.
 *
 * 서버 삭제 실패 후 localStorage 롤백이 완료되었음을 나타낸다.
 * originalError 필드를 통해 원본 ApiDeleteError 정보에 접근할 수 있다.
 */
export class DeleteRollbackError extends Error {
  /** 롤백을 트리거한 원본 ApiDeleteError */
  public readonly originalError: ApiDeleteError;

  constructor(originalError: ApiDeleteError) {
    super(
      `기록 삭제에 실패하여 복구했습니다: ${originalError.message}`,
    );
    this.name = 'DeleteRollbackError';
    this.originalError = originalError;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 삭제 API 응답을 처리하고, 실패 시 localStorage 롤백을 수행한다.
 *
 * @param response - deleteRecordViaApi()의 반환값 (tagged union)
 * @param record  - 삭제하려던 원본 DivinationRecord (롤백 시 재삽입용)
 * @returns 성공 시 ApiDeleteResult를 그대로 반환
 * @throws {DeleteRollbackError} 롤백 완료 시 (원본 ApiDeleteError 정보 포함)
 *
 * @example
 * ```ts
 * const apiResult = await deleteRecordViaApi(record.id);
 * // 성공 시 그대로 결과 반환, 실패 시 롤백 후 DeleteRollbackError throw
 * handleDeleteResponse(apiResult, record);
 * ```
 */
export function handleDeleteResponse(
  response: ApiDeleteResult,
  record: DivinationRecord,
): ApiDeleteResult {
  if (response.success) {
    // 성공: 응답 그대로 반환
    return response;
  }

  // 실패: success가 false인 상태 — ApiDeleteError로 안전하게 단언
  const errorResult = response as ApiDeleteError;

  // 실패: localStorage에 기록 재삽입 (롤백)
  try {
    reinsertRecord(record);
  } catch (_reinsertError) {
    // 재삽입 자체도 실패한 경우 — 원본 API 오류를 우선 전파
    // (reinsert 실패는 QuotaExceeded 또는 StorageUnavailable 상황)
    throw new DeleteRollbackError(errorResult);
  }

  // 롤백 성공 → DeleteRollbackError throw (호출자가 롤백 발생을 감지할 수 있게)
  throw new DeleteRollbackError(errorResult);
}
