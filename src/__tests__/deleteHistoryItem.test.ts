/**
 * deleteHistoryItem(id) 단위 테스트 — Sub-AC 4.3.1
 *
 * Ontology: DivinationRecord.deleteHistoryItem
 *
 * 검증 범위:
 * 1. 정상 삭제: 존재하는 ID → 기록 제거, true 반환
 * 2. 미존재 ID: false 반환, 저장소 불변
 * 3. 멱등성: 이미 삭제된 ID 재삭제 → false
 * 4. 선택적 삭제: 다른 기록 보존
 * 5. 마지막 기록 삭제: 빈 저장소 전환
 * 6. localStorage 직접 검증: 원시 데이터 확인
 * 7. 엣지 케이스: 빈 문자열, 공백, 초대형 저장소
 * 8. 데이터 무결성: 삭제 후 남은 기록 필드 보존
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveRecord,
  loadRecords,
  getRecordById,
  updateRecord,
  deleteHistoryItem,
  clearRecords,
  getRecordCount,
  getRawPackedData,
  getInMemoryFallbackState,
  deleteRecordFromStorage,
  STORAGE_QUOTA_EXCEEDED_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
  resetStorageAvailability,
} from '@/lib/storage';
import type { DivinationRecord, CreateRecordInput } from '@/data/types';

const STORAGE_KEY = 'book-of-changes:records';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

/**
 * 전체 기록 필드가 채워진 CreateRecordInput을 생성한다.
 * 기록 상세 화면의 모든 데이터를 포함한 시나리오 검증용.
 */
function makeFullInput(): CreateRecordInput {
  return {
    mainHexagram: '22. 비(賁)',
    changingHexagram: '36. 명이(明夷)',
    changingLines: [1, 3, 5],
    aiInterpretation:
      '지금은 외형보다 내실을 다질 때입니다. 겉치레를 버리고 진실된 태도로 임하세요.',
    userQuestion: '올해 사업 방향이 궁금합니다',
  };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  clearRecords();
  vi.restoreAllMocks();
  resetStorageAvailability();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. 정상 삭제 (Happy Path)
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 정상 삭제', () => {
  it('존재하는 ID로 호출하면 true를 반환하고 기록이 제거된다', () => {
    const record = saveRecord(makeInput());
    expect(getRecordCount()).toBe(1);

    const result = deleteHistoryItem(record.id);

    expect(result).toBe(true);
    expect(getRecordCount()).toBe(0);
    expect(loadRecords()).toEqual([]);
  });

  it('삭제 후 getRecordById로 조회하면 undefined를 반환한다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '5. 수(需)' }));
    expect(getRecordById(record.id)).toBeTruthy();

    deleteHistoryItem(record.id);

    expect(getRecordById(record.id)).toBeUndefined();
  });

  it('삭제 후 getRecordCount가 감소한다', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const toDelete = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    expect(getRecordCount()).toBe(3);
    deleteHistoryItem(toDelete.id);
    expect(getRecordCount()).toBe(2);
  });

  it('모든 필드가 채워진 기록도 정상 삭제된다', () => {
    const record = saveRecord(makeFullInput());

    // 사전 검증: 모든 필드 존재
    const before = getRecordById(record.id)!;
    expect(before.aiInterpretation).toBeTruthy();
    expect(before.userQuestion).toBeTruthy();
    expect(before.changingHexagram).toBeTruthy();
    expect(before.changingLines).toHaveLength(3);

    // 삭제
    deleteHistoryItem(record.id);

    // 사후 검증
    expect(getRecordById(record.id)).toBeUndefined();
    expect(getRecordCount()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. 미존재 ID 처리
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 미존재 ID', () => {
  it('존재하지 않는 ID에 대해 false를 반환한다', () => {
    const result = deleteHistoryItem('non-existent-id');
    expect(result).toBe(false);
  });

  it('미존재 ID 호출 시 저장소는 변경되지 않는다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '10. 리(履)' }));
    expect(getRecordCount()).toBe(1);

    deleteHistoryItem('non-existent-id');
    // 저장소 불변
    expect(getRecordCount()).toBe(1);
    expect(getRecordById(record.id)!.id).toBe(record.id);
  });

  it('빈 저장소에서도 false를 반환하고 예외가 발생하지 않는다', () => {
    expect(getRecordCount()).toBe(0);
    expect(() => deleteHistoryItem('any-id')).not.toThrow();
    expect(deleteHistoryItem('any-id')).toBe(false);
    expect(getRecordCount()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. 멱등성 (Idempotence)
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 멱등성', () => {
  it('동일한 ID를 두 번 삭제하면 첫 번째는 true, 두 번째는 false를 반환한다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '8. 비(比)' }));

    expect(deleteHistoryItem(record.id)).toBe(true);
    expect(deleteHistoryItem(record.id)).toBe(false);
  });

  it('세 번 연속 삭제해도 false를 유지하고 저장소는 비어 있다', () => {
    const record = saveRecord(makeInput());
    deleteHistoryItem(record.id);
    expect(deleteHistoryItem(record.id)).toBe(false);
    expect(deleteHistoryItem(record.id)).toBe(false);
    expect(getRecordCount()).toBe(0);
  });

  it('멱등적 삭제가 다른 기록에 영향을 주지 않는다', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    // r1을 삭제하고 다시 시도
    deleteHistoryItem(r1.id);
    deleteHistoryItem(r1.id); // 멱등 — 아무 영향 없음

    // r2는 여전히 존재
    expect(getRecordCount()).toBe(1);
    expect(getRecordById(r2.id)!.mainHexagram).toBe('2. 곤(坤)');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. 선택적 삭제 (다른 기록 보존)
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 선택적 삭제', () => {
  it('여러 기록 중 하나만 삭제하면 나머지는 그대로 보존된다', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    deleteHistoryItem(r2.id);

    const remaining = loadRecords();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((r) => r.id).sort()).toEqual([r1.id, r3.id].sort());
  });

  it('삭제 후 나머지 기록의 모든 필드가 보존된다', () => {
    const toKeep = saveRecord(makeFullInput());
    const toDelete = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    deleteHistoryItem(toDelete.id);

    // getRecordById는 viewCount를 증가시키므로 loadRecords로 직접 확인
    const kept = loadRecords().find((r) => r.id === toKeep.id)!;
    expect(kept.mainHexagram).toBe('22. 비(賁)');
    expect(kept.changingHexagram).toBe('36. 명이(明夷)');
    expect(kept.changingLines).toEqual([1, 3, 5]);
    expect(kept.aiInterpretation).toBe(
      '지금은 외형보다 내실을 다질 때입니다. 겉치레를 버리고 진실된 태도로 임하세요.',
    );
    expect(kept.userQuestion).toBe('올해 사업 방향이 궁금합니다');
    expect(kept.freeMemo).toBe('');
    expect(kept.viewCount).toBe(0);
    expect(kept.lastViewedAt).toBeNull();
    // timestamp, createdAt, updatedAt도 원본 유지
    expect(kept.timestamp).toBe(toKeep.timestamp);
    expect(kept.createdAt).toBe(toKeep.createdAt);
    expect(kept.updatedAt).toBe(toKeep.updatedAt);
  });

  it('첫 번째 기록 삭제 시 나머지 순서가 유지된다 (최신순)', () => {
    // 저장 순서: r1 → r2 → r3 → r4
    // 저장 결과 (최신순): r4, r3, r2, r1
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const r4 = saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));

    // 가장 오래된 r1 삭제
    deleteHistoryItem(r1.id);

    const remaining = loadRecords();
    expect(remaining).toHaveLength(3);
    expect(remaining[0].id).toBe(r4.id); // 최신
    expect(remaining[1].id).toBe(r3.id);
    expect(remaining[2].id).toBe(r2.id); // 그 다음
  });

  it('마지막(가장 최신) 기록 삭제 시 나머지 순서가 유지된다', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const r4 = saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));

    // 가장 최신인 r4 삭제
    deleteHistoryItem(r4.id);

    const remaining = loadRecords();
    expect(remaining).toHaveLength(3);
    expect(remaining[0].id).toBe(r3.id); // 이제 가장 최신
    expect(remaining[1].id).toBe(r2.id);
    expect(remaining[2].id).toBe(r1.id);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. 마지막 기록 삭제
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 마지막 기록 삭제', () => {
  it('단 하나의 기록을 삭제하면 저장소가 빈 배열 상태가 된다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '64. 미제(未濟)' }));
    expect(getRecordCount()).toBe(1);

    expect(deleteHistoryItem(record.id)).toBe(true);
    expect(getRecordCount()).toBe(0);
    expect(loadRecords()).toEqual([]);
  });

  it('마지막 기록 삭제 후 localStorage에 빈 records 배열이 기록된다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '63. 기제(旣濟)' }));
    deleteHistoryItem(record.id);

    const packed = getRawPackedData();
    expect(packed).not.toBeNull();
    expect(packed!.records).toEqual([]);
    expect(packed!.schemaVersion).toBe(1);
  });

  it('마지막 기록 삭제 후 loadRecords가 빈 배열을 반환한다', () => {
    const record = saveRecord(makeInput());
    deleteHistoryItem(record.id);

    const loaded = loadRecords();
    expect(loaded).toEqual([]);
    expect(Array.isArray(loaded)).toBe(true);
    expect(loaded).toHaveLength(0);
  });

  it('마지막 기록 삭제 후 getRecordCount가 0을 반환한다', () => {
    const record = saveRecord(makeInput());
    deleteHistoryItem(record.id);

    expect(getRecordCount()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. localStorage 직접 검증
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — localStorage 직접 검증', () => {
  it('삭제 후 localStorage에서 해당 ID가 제거된다', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    deleteHistoryItem(r2.id);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw!);
    const persisted = parsed.records ?? parsed;
    const persistedIds = persisted.map((r: DivinationRecord) => r.id);

    expect(persistedIds).toContain(r3.id);
    expect(persistedIds).toContain(r1.id);
    expect(persistedIds).not.toContain(r2.id);
  });

  it('삭제 후 localStorage records 배열 길이가 1 감소한다', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const toDelete = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const before = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(before.records ?? before).toHaveLength(3);

    deleteHistoryItem(toDelete.id);

    const after = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(after.records ?? after).toHaveLength(2);
  });

  it('삭제 후 나머지 기록의 필드는 변경되지 않는다', () => {
    const full = saveRecord(makeFullInput());
    const simple = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    deleteHistoryItem(simple.id);

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    const records = parsed.records ?? parsed;
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(full.id);

    // 모든 필드가 원본과 동일한지 검증
    const persisted = records[0];
    expect(persisted.mainHexagram).toBe(full.mainHexagram);
    expect(persisted.changingHexagram).toBe(full.changingHexagram);
    expect(persisted.changingLines).toEqual(full.changingLines);
    expect(persisted.aiInterpretation).toBe(full.aiInterpretation);
    expect(persisted.userQuestion).toBe(full.userQuestion);
    expect(persisted.freeMemo).toBe(full.freeMemo);
    expect(persisted.viewCount).toBe(full.viewCount);
    expect(persisted.lastViewedAt).toBe(full.lastViewedAt);
    expect(persisted.timestamp).toBe(full.timestamp);
    expect(persisted.createdAt).toBe(full.createdAt);
    expect(persisted.updatedAt).toBe(full.updatedAt);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. 엣지 케이스
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 엣지 케이스', () => {
  it('빈 문자열 ID에 대해 false를 반환하고 저장소는 불변이다', () => {
    saveRecord(makeInput({ mainHexagram: '10. 리(履)' }));
    expect(deleteHistoryItem('')).toBe(false);
    expect(getRecordCount()).toBe(1);
  });

  it('공백만 있는 ID에 대해 false를 반환한다', () => {
    saveRecord(makeInput({ mainHexagram: '15. 겸(謙)' }));
    expect(deleteHistoryItem('   ')).toBe(false);
    expect(deleteHistoryItem('\t')).toBe(false);
    expect(deleteHistoryItem('\n')).toBe(false);
    expect(getRecordCount()).toBe(1);
  });

  it('MAX_RECORDS(50) 경계에서 삭제가 정상 동작한다', () => {
    // 50개 저장
    for (let i = 0; i < 50; i++) {
      saveRecord(makeInput({ mainHexagram: `${i + 1}. test` }));
    }
    expect(getRecordCount()).toBe(50);

    // 중간 레코드 찾아서 삭제
    const records = loadRecords();
    const target = records[24]; // 25번째 위치
    expect(deleteHistoryItem(target.id)).toBe(true);
    expect(getRecordCount()).toBe(49);
  });

  it('50개 저장 후 하나 삭제하고 새 레코드를 추가해도 정상 동작한다', () => {
    for (let i = 0; i < 50; i++) {
      saveRecord(makeInput({ mainHexagram: `${i + 1}. test` }));
    }

    const records = loadRecords();
    const toDelete = records[49]; // 가장 오래된 레코드
    deleteHistoryItem(toDelete.id);

    // 새 레코드 추가 — 50개 유지 (하나가 비었으므로 기존 49 + 1 = 50)
    const newRecord = saveRecord(makeInput({ mainHexagram: '51. new' }));
    expect(getRecordCount()).toBe(50);
    expect(loadRecords()[0].id).toBe(newRecord.id);
  });

  it('변효(元)가 없는 기록도 정상 삭제된다', () => {
    const record = saveRecord(
      makeInput({
        mainHexagram: '2. 곤(坤)',
        changingLines: [], // 변효 없음
        changingHexagram: null,
      }),
    );

    deleteHistoryItem(record.id);
    expect(getRecordCount()).toBe(0);
  });

  it('변효가 6개 모두 있는 기록도 정상 삭제된다', () => {
    const record = saveRecord(
      makeInput({
        mainHexagram: '1. 건(乾)',
        changingLines: [1, 2, 3, 4, 5, 6], // 6효 모두 변함
        changingHexagram: '2. 곤(坤)',
      }),
    );

    deleteHistoryItem(record.id);
    expect(getRecordCount()).toBe(0);
  });

  it('자유 메모가 있는 기록도 정상 삭제된다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    updateRecord(record.id, { freeMemo: '중요한 기록 — 다시 확인 필요' });

    const before = getRecordById(record.id)!;
    expect(before.freeMemo).toBe('중요한 기록 — 다시 확인 필요');

    deleteHistoryItem(record.id);
    expect(getRecordCount()).toBe(0);
    expect(getRecordById(record.id)).toBeUndefined();
  });

  it('조회수(viewCount)가 높은 기록도 정상 삭제된다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    // 여러 번 조회
    getRecordById(record.id); // 1
    getRecordById(record.id); // 2
    getRecordById(record.id); // 3

    const before = getRecordById(record.id)!;
    expect(before.viewCount).toBeGreaterThanOrEqual(3);
    expect(before.lastViewedAt).toBeTruthy();

    deleteHistoryItem(record.id);
    expect(getRecordCount()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. deleteHistoryItem === deleteRecordFromStorage 동등성
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — deleteRecordFromStorage 동등성', () => {
  it('deleteHistoryItem은 deleteRecordFromStorage과 동일한 함수 참조를 가진다', () => {
    expect(deleteHistoryItem).toBe(deleteRecordFromStorage);
  });

  it('deleteHistoryItem으로 삭제한 기록은 deleteRecordFromStorage로도 이미 삭제된 상태다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    deleteHistoryItem(record.id);

    // deleteRecordFromStorage로도 이미 삭제됨
    expect(deleteRecordFromStorage(record.id)).toBe(false);
    expect(getRecordCount()).toBe(0);
  });

  it('deleteRecordFromStorage로 삭제한 기록은 deleteHistoryItem으로도 이미 삭제된 상태다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    deleteRecordFromStorage(record.id);

    // deleteHistoryItem으로도 이미 삭제됨
    expect(deleteHistoryItem(record.id)).toBe(false);
    expect(getRecordCount()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. QuotaExceededError 환경에서의 동작
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — QuotaExceededError 환경', () => {
  it('QuotaExceededError 발생 시 STORAGE_QUOTA_EXCEEDED_MESSAGE 예외를 throw한다', () => {
    const record = saveRecord(makeInput({ mainHexagram: '55. 풍(豊)' }));

    // setItem을 QuotaExceededError로 mock
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException(
        'Failed to execute setItem on Storage: Setting the value exceeded the quota.',
        'QuotaExceededError',
      );
    });

    expect(() => deleteHistoryItem(record.id)).toThrow(
      STORAGE_QUOTA_EXCEEDED_MESSAGE,
    );

    spy.mockRestore();
  });

  it('QuotaExceededError 발생 시 인메모리 폴백에 삭제 상태가 반영된다', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException(
        'Failed to execute setItem on Storage: Setting the value exceeded the quota.',
        'QuotaExceededError',
      );
    });

    expect(() => deleteHistoryItem(r1.id)).toThrow(
      STORAGE_QUOTA_EXCEEDED_MESSAGE,
    );

    // 인메모리 폴백이 활성화되고 r1은 삭제됨, r2는 남음
    const state = getInMemoryFallbackState();
    expect(state.active).toBe(true);
    expect(state.recordCount).toBe(1); // r2 only

    const records = loadRecords(); // 폴백에서 읽음
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(r2.id);

    spy.mockRestore();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. Storage Unavailable 환경에서의 동작
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — Storage Unavailable 환경', () => {
  it('localStorage 접근 불가 시 STORAGE_UNAVAILABLE_MESSAGE를 throw하고 폴백에 저장된다', () => {
    // 먼저 기록 저장 (아직 storage 사용 가능)
    const r1 = saveRecord(makeInput({ mainHexagram: '22. 비(賁)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '36. 명이(明夷)' }));

    // availability 테스트용 키는 통과시키고 실제 STORAGE_KEY 쓰기만 실패시킨다
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, _value: string) => {
        if (key === STORAGE_KEY) {
          throw new DOMException('Access denied', 'SecurityError');
        }
        // availability check 키는 통과
        return undefined;
      },
    );

    resetStorageAvailability(); // 캐시 초기화

    expect(() => deleteHistoryItem(r1.id)).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

    // 폴백 확인
    const state = getInMemoryFallbackState();
    expect(state.active).toBe(true);
    expect(state.recordCount).toBe(1); // r2만 남음

    const records = loadRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(r2.id);

    spy.mockRestore();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. 연속 삭제 (Bulk Delete)
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteHistoryItem — 연속 삭제', () => {
  it('여러 기록을 순차적으로 삭제할 수 있다', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const r4 = saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));
    const r5 = saveRecord(makeInput({ mainHexagram: '5. 수(需)' }));

    expect(getRecordCount()).toBe(5);

    // 하나씩 모두 삭제
    expect(deleteHistoryItem(r1.id)).toBe(true);
    expect(getRecordCount()).toBe(4);

    expect(deleteHistoryItem(r3.id)).toBe(true);
    expect(getRecordCount()).toBe(3);

    expect(deleteHistoryItem(r5.id)).toBe(true);
    expect(getRecordCount()).toBe(2);

    expect(deleteHistoryItem(r2.id)).toBe(true);
    expect(getRecordCount()).toBe(1);

    expect(deleteHistoryItem(r4.id)).toBe(true);
    expect(getRecordCount()).toBe(0);

    // 모두 삭제된 상태
    expect(loadRecords()).toEqual([]);
  });

  it('10개 기록을 순차 삭제해도 정상 동작한다', () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const record = saveRecord(
        makeInput({ mainHexagram: `${i + 1}. test` }),
      );
      ids.push(record.id);
    }

    expect(getRecordCount()).toBe(10);

    // 모든 ID 삭제
    for (const id of ids) {
      expect(deleteHistoryItem(id)).toBe(true);
    }

    expect(getRecordCount()).toBe(0);
    expect(loadRecords()).toEqual([]);
  });
});
