import { describe, it, expect, beforeEach } from 'vitest';
import {
  handleDeleteResponse,
  DeleteRollbackError,
} from '@/lib/handleDeleteResponse';
import type { ApiDeleteSuccess, ApiDeleteError } from '@/lib/deleteRecordApi';
import type { DivinationRecord } from '@/data/types';
import {
  saveRecord,
  loadRecords,
  deleteRecordFromStorage,
  clearRecords,
  getRecordCount,
  resetStorageAvailability,
} from '@/lib/storage';
import type { CreateRecordInput } from '@/data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

function makeRecord(overrides?: Partial<DivinationRecord>): DivinationRecord {
  const now = new Date().toISOString();
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: now,
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '',
    userQuestion: '',
    freeMemo: '',
    lastViewedAt: null,
    pinnedAt: null,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSuccessResponse(): ApiDeleteSuccess {
  return { success: true };
}

function makeErrorResponse(overrides?: Partial<ApiDeleteError>): ApiDeleteError {
  return {
    success: false,
    status: 500,
    message: '일시적인 서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요',
    ...overrides,
  };
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  clearRecords();
  resetStorageAvailability();
});

// ═════════════════════════════════════════════════════════════════════════════
// 성공 응답 처리
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDeleteResponse — 성공 응답', () => {
  it('success: true인 응답을 그대로 반환한다', () => {
    const record = makeRecord();
    const response = makeSuccessResponse();

    const result = handleDeleteResponse(response, record);

    expect(result).toBe(response);
    expect(result.success).toBe(true);
  });

  it('성공 응답 시 localStorage에 아무 영향도 주지 않는다', () => {
    // 먼저 기록을 저장
    const saved = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const recordCountBefore = getRecordCount();

    const response = makeSuccessResponse();
    handleDeleteResponse(response, saved);

    // 성공 응답은 저장소를 건드리지 않음
    expect(getRecordCount()).toBe(recordCountBefore);
    expect(loadRecords()[0].id).toBe(saved.id);
  });

  it('성공 응답은 DeleteRollbackError를 throw하지 않는다', () => {
    const record = makeRecord();

    expect(() => {
      handleDeleteResponse(makeSuccessResponse(), record);
    }).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 실패 응답 — 롤백
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDeleteResponse — 실패 응답 (롤백)', () => {
  it('success: false인 응답 시 DeleteRollbackError를 throw한다', () => {
    const record = makeRecord();
    const errorResponse = makeErrorResponse({ status: 500 });

    expect(() => {
      handleDeleteResponse(errorResponse, record);
    }).toThrow(DeleteRollbackError);
  });

  it('throw된 DeleteRollbackError가 originalError를 포함한다', () => {
    const record = makeRecord();
    const errorResponse = makeErrorResponse({
      status: 404,
      message: '해당 기록을 찾을 수 없습니다',
    });

    try {
      handleDeleteResponse(errorResponse, record);
      // 여기 도달하면 실패
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(DeleteRollbackError);
      const rollbackError = error as DeleteRollbackError;
      expect(rollbackError.originalError).toBe(errorResponse);
      expect(rollbackError.originalError.status).toBe(404);
      expect(rollbackError.originalError.message).toBe('해당 기록을 찾을 수 없습니다');
      expect(rollbackError.message).toContain('기록 삭제에 실패하여 복구했습니다');
      expect(rollbackError.message).toContain('해당 기록을 찾을 수 없습니다');
    }
  });

  it('롤백 시 localStorage에 기록이 재삽입된다', () => {
    const record = makeRecord({
      id: 'test-rollback-id',
      mainHexagram: '5. 수(需)',
      freeMemo: '롤백 테스트 메모',
    });

    // 기록이 localStorage에 없는 상태에서 실패 응답 처리
    expect(getRecordCount()).toBe(0);

    const errorResponse = makeErrorResponse({ status: 503 });

    try {
      handleDeleteResponse(errorResponse, record);
    } catch {
      // 롤백 후 기록이 localStorage에 존재해야 함
      const records = loadRecords();
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('test-rollback-id');
      expect(records[0].mainHexagram).toBe('5. 수(需)');
      expect(records[0].freeMemo).toBe('롤백 테스트 메모');
      // 원본 필드가 보존되어야 함 (새 ID 생성 안 함)
      expect(records[0].id).toBe(record.id);
      expect(records[0].createdAt).toBe(record.createdAt);
    }
  });

  it('이미 localStorage에서 삭제된 기록도 롤백으로 복구된다', () => {
    // 실제 삭제 플로우 시뮬레이션:
    // 1. 기록 저장
    const saved = saveRecord(
      makeInput({
        mainHexagram: '8. 비(比)',
        changingLines: [1, 4, 6],
      }),
    );

    // 2. localStorage에서 삭제 (optimistic delete)
    const deleted = deleteRecordFromStorage(saved.id);
    expect(deleted).toBe(true);
    expect(getRecordCount()).toBe(0);

    // 3. 서버 삭제 실패 → 롤백
    const errorResponse = makeErrorResponse({ status: 500 });

    try {
      handleDeleteResponse(errorResponse, saved);
    } catch {
      const records = loadRecords();
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe(saved.id);
      expect(records[0].mainHexagram).toBe('8. 비(比)');
      expect(records[0].changingLines).toEqual([1, 4, 6]);
    }
  });

  it('롤백된 기록은 원본 timestamp, createdAt, updatedAt을 유지한다', () => {
    const record = makeRecord({
      timestamp: '2026-01-15T12:00:00.000Z',
      createdAt: '2026-01-15T12:00:00.000Z',
      updatedAt: '2026-01-15T12:30:00.000Z',
    });

    const errorResponse = makeErrorResponse({ status: 500 });

    try {
      handleDeleteResponse(errorResponse, record);
    } catch {
      const records = loadRecords();
      expect(records[0].timestamp).toBe('2026-01-15T12:00:00.000Z');
      expect(records[0].createdAt).toBe('2026-01-15T12:00:00.000Z');
      expect(records[0].updatedAt).toBe('2026-01-15T12:30:00.000Z');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 다양한 실패 유형
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDeleteResponse — 다양한 실패 유형', () => {
  it('404 Not Found 응답도 롤백을 수행한다', () => {
    const record = makeRecord({ id: 'test-404' });
    const errorResponse = makeErrorResponse({
      status: 404,
      message: '해당 기록을 찾을 수 없습니다',
    });

    expect(() => {
      handleDeleteResponse(errorResponse, record);
    }).toThrow(DeleteRollbackError);

    // 롤백 확인
    const records = loadRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('test-404');
  });

  it('네트워크 오류(status: 0)도 롤백을 수행한다', () => {
    const record = makeRecord({ id: 'test-network-error' });
    const errorResponse = makeErrorResponse({
      status: 0,
      message: '네트워크 연결을 확인해 주세요',
    });

    expect(() => {
      handleDeleteResponse(errorResponse, record);
    }).toThrow(DeleteRollbackError);

    // 롤백 확인
    const records = loadRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('test-network-error');
  });

  it('타임아웃 오류(status: 0)도 롤백을 수행한다', () => {
    const record = makeRecord({ id: 'test-timeout' });
    const errorResponse = makeErrorResponse({
      status: 0,
      message: '요청 시간이 초과되었습니다. 네트워크 상태를 확인해 주세요',
    });

    expect(() => {
      handleDeleteResponse(errorResponse, record);
    }).toThrow(DeleteRollbackError);

    expect(loadRecords()).toHaveLength(1);
  });

  it('모든 오류 유형에서 DeleteRollbackError를 throw한다', () => {
    const errorStatuses = [0, 400, 401, 403, 404, 409, 429, 500, 502, 503];

    for (const status of errorStatuses) {
      const response: ApiDeleteError = {
        success: false,
        status,
        message: `오류 코드 ${status}`,
      };
      const record = makeRecord({ id: `test-status-${status}` });

      try {
        handleDeleteResponse(response, record);
        // throw가 없으면 실패
        expect(false).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(DeleteRollbackError);
        const rollbackError = error as DeleteRollbackError;
        expect(rollbackError.originalError.status).toBe(status);
      }

      // 정리
      clearRecords();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 타입 내로잉 (런타임 검증)
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDeleteResponse — 타입 내로잉', () => {
  it('성공 응답 시 반환값의 success가 true로 좁혀진다', () => {
    const result = handleDeleteResponse(makeSuccessResponse(), makeRecord());

    // success 타입 가드 확인
    if (result.success) {
      // TypeScript는 result를 ApiDeleteSuccess로 좁힘
      expect(result.success).toBe(true);
    }
  });

  it('DeleteRollbackError를 instanceof로 감지할 수 있다', () => {
    const record = makeRecord();
    const errorResponse = makeErrorResponse({ status: 500 });

    try {
      handleDeleteResponse(errorResponse, record);
    } catch (error) {
      if (error instanceof DeleteRollbackError) {
        // originalError에 접근 가능 (ApiDeleteError 타입)
        expect(error.originalError.success).toBe(false);
        expect(typeof error.originalError.status).toBe('number');
        expect(typeof error.originalError.message).toBe('string');
      } else {
        expect(false).toBe(true);
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 엣지 케이스
// ═════════════════════════════════════════════════════════════════════════════

describe('handleDeleteResponse — 엣지 케이스', () => {
  it('빈 record도 롤백으로 정상 재삽입된다', () => {
    const record = makeRecord({
      id: 'edge-empty',
      mainHexagram: '',
      changingLines: [],
    });

    const errorResponse = makeErrorResponse({ status: 500 });

    try {
      handleDeleteResponse(errorResponse, record);
    } catch {
      const records = loadRecords();
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('edge-empty');
      expect(records[0].mainHexagram).toBe('');
      expect(records[0].changingLines).toEqual([]);
    }
  });

  it('AI 해석과 사용자 질문이 포함된 레코드도 정상 롤백된다', () => {
    const record = makeRecord({
      id: 'edge-full',
      mainHexagram: '10. 리(履)',
      changingHexagram: '5. 수(需)',
      changingLines: [1, 3, 5],
      aiInterpretation: '오늘은 새로운 도전을 시작하기 좋은 날입니다.',
      userQuestion: '이직운이 궁금해요',
      freeMemo: '중요한 점괘',
      lastViewedAt: '2026-06-01T09:00:00.000Z',
      viewCount: 3,
    });

    const errorResponse = makeErrorResponse({ status: 500 });

    try {
      handleDeleteResponse(errorResponse, record);
    } catch {
      const records = loadRecords();
      expect(records).toHaveLength(1);
      const restored = records[0];
      expect(restored.mainHexagram).toBe('10. 리(履)');
      expect(restored.changingHexagram).toBe('5. 수(需)');
      expect(restored.changingLines).toEqual([1, 3, 5]);
      expect(restored.aiInterpretation).toBe('오늘은 새로운 도전을 시작하기 좋은 날입니다.');
      expect(restored.userQuestion).toBe('이직운이 궁금해요');
      expect(restored.freeMemo).toBe('중요한 점괘');
      expect(restored.lastViewedAt).toBe('2026-06-01T09:00:00.000Z');
      expect(restored.viewCount).toBe(3);
    }
  });

  it('연속으로 여러 레코드를 롤백할 수 있다', () => {
    const record1 = makeRecord({ id: 'multi-1', mainHexagram: '1. 건(乾)' });
    const record2 = makeRecord({ id: 'multi-2', mainHexagram: '2. 곤(坤)' });
    const record3 = makeRecord({ id: 'multi-3', mainHexagram: '3. 둔(屯)' });

    const errorResponse = makeErrorResponse({ status: 500 });

    // 3개 모두 롤백
    for (const record of [record1, record2, record3]) {
      try {
        handleDeleteResponse(errorResponse, record);
      } catch {
        // 롤백 정상
      }
    }

    const records = loadRecords();
    expect(records).toHaveLength(3);
    // 가장 마지막에 롤백된 것이 맨 앞에 옴 (reinsertRecord는 앞에 삽입)
    expect(records[0].id).toBe('multi-3');
    expect(records[1].id).toBe('multi-2');
    expect(records[2].id).toBe('multi-1');
  });

  it('MAX_RECORDS(50)를 초과해도 롤백이 정상 동작한다', () => {
    // 50개 저장
    for (let i = 0; i < 50; i++) {
      saveRecord(makeInput({ mainHexagram: `${i + 1}. test` }));
    }

    // 51번째 레코드 롤백 시도
    const overflowRecord = makeRecord({
      id: 'overflow-record',
      mainHexagram: '51. overflow',
    });
    const errorResponse = makeErrorResponse({ status: 500 });

    try {
      handleDeleteResponse(errorResponse, overflowRecord);
    } catch {
      const records = loadRecords();
      // 50개 유지 (가장 오래된 것 하나가 밀려남)
      expect(records).toHaveLength(50);
      expect(records[0].id).toBe('overflow-record');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DeleteRollbackError 클래스
// ═════════════════════════════════════════════════════════════════════════════

describe('DeleteRollbackError', () => {
  it('Error의 서브클래스이다', () => {
    const error = new DeleteRollbackError(
      makeErrorResponse({ status: 500 }),
    );
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DeleteRollbackError);
  });

  it('name 속성이 "DeleteRollbackError"이다', () => {
    const error = new DeleteRollbackError(
      makeErrorResponse({ status: 500 }),
    );
    expect(error.name).toBe('DeleteRollbackError');
  });

  it('message에 원본 오류 메시지가 포함된다', () => {
    const error = new DeleteRollbackError(
      makeErrorResponse({
        status: 403,
        message: '삭제 권한이 없습니다',
      }),
    );
    expect(error.message).toContain('기록 삭제에 실패하여 복구했습니다');
    expect(error.message).toContain('삭제 권한이 없습니다');
  });

  it('originalError로 원본 ApiDeleteError에 접근할 수 있다', () => {
    const original = makeErrorResponse({
      status: 429,
      message: '요청이 너무 많습니다',
    });
    const error = new DeleteRollbackError(original);

    expect(error.originalError).toBe(original);
    expect(error.originalError.success).toBe(false);
    expect(error.originalError.status).toBe(429);
  });
});
