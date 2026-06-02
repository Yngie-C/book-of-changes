import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveRecord,
  loadRecords,
  getRecordById,
  updateRecord,
  sortByTimestampDesc,
  saveOrUpdateMemo,
  getMemo,
  getMemos,
  deleteRecord,
  deleteRecordFromStorage,
  clearRecords,
  getRecordCount,
  getStorageUsage,
  getRawPackedData,
  getInMemoryFallbackState,
  recoverFromFallback,
  queryRecordsFromStorage,
  STORAGE_QUOTA_EXCEEDED_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
  isStorageQuotaError,
  isStorageUnavailableError,
  isLocalStorageAvailable,
  resetStorageAvailability,
  duplicateCheck,
} from '@/lib/storage';
import type { DivinationRecord, CreateRecordInput } from '@/data/types';

const STORAGE_KEY = 'book-of-changes:records';

// ─── QuotaExceededError Simulation Helpers ──────────────────────────────────

/**
 * localStorage.setItem을 mock하여 QuotaExceededError를 발생시킨다.
 * jsdom에서는 네이티브 QuotaExceededError를 트리거할 수 없으므로 모의한다.
 * 반환값의 restore()를 호출하여 원래 상태로 복원한다.
 */
function mockQuotaExceeded() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    const err = new DOMException(
      'Failed to execute setItem on Storage: Setting the value exceeded the quota.',
      'QuotaExceededError',
    );
    throw err;
  });
}

function mockTypeError() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new TypeError('Some other error');
  });
}

function mockGetItemError() {
  return vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
}

function mockStorageSetItemUnavailable() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    const err = new DOMException(
      'Failed to read the localStorage property from Window: Access is denied for this document.',
      'SecurityError',
    );
    throw err;
  });
}

function mockStorageRemoveItemUnavailable() {
  return vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    const err = new DOMException(
      'Failed to read the localStorage property from Window: Access is denied for this document.',
      'SecurityError',
    );
    throw err;
  });
}

beforeEach(() => {
  clearRecords();
  vi.restoreAllMocks();
  resetStorageAvailability();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

function getRawRecords(): DivinationRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return parsed.records ?? parsed;
}

// ─── saveRecord ────────────────────────────────────────────────────────────

describe('saveRecord', () => {
  it('saves a record to localStorage', () => {
    saveRecord(makeInput());
    expect(getRawRecords()).toHaveLength(1);
  });

  it('returns a DivinationRecord with auto-generated fields', () => {
    const record = saveRecord(
      makeInput({
        mainHexagram: '2. 곤(坤)',
        changingHexagram: '3. 둔(屯)',
        changingLines: [1, 2, 3],
        aiInterpretation: '매우 좋은 운세입니다.',
        userQuestion: '취업운이 궁금해요',
      }),
    );

    expect(record.id).toBeTruthy();
    expect(record.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(record.timestamp).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBeTruthy();
    expect(record.mainHexagram).toBe('2. 곤(坤)');
    expect(record.changingHexagram).toBe('3. 둔(屯)');
    expect(record.changingLines).toEqual([1, 2, 3]);
    expect(record.aiInterpretation).toBe('매우 좋은 운세입니다.');
    expect(record.userQuestion).toBe('취업운이 궁금해요');
    expect(record.freeMemo).toBe('');
    expect(record.lastViewedAt).toBeNull();
    expect(record.viewCount).toBe(0);
    expect(record.timestamp).toBe(record.createdAt);
    expect(record.timestamp).toBe(record.updatedAt);
  });

  it('defaults optional fields when not provided', () => {
    const record = saveRecord(makeInput());
    expect(record.changingHexagram).toBeNull();
    expect(record.aiInterpretation).toBe('');
    expect(record.userQuestion).toBe('');
  });

  it('stores newest record first (reverse chronological)', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const records = getRawRecords();
    expect(records).toHaveLength(2);
    expect(records[0].mainHexagram).toBe('2. 곤(坤)');
    expect(records[1].mainHexagram).toBe('1. 건(乾)');
  });

  it('caps records at 50 (MAX_RECORDS)', () => {
    for (let i = 0; i < 60; i++) {
      saveRecord(makeInput({ mainHexagram: `${i}. test` }));
    }
    expect(getRawRecords()).toHaveLength(50);
    expect(getRawRecords()[0].mainHexagram).toBe('59. test');
    expect(getRawRecords()[49].mainHexagram).toBe('10. test');
  });

  it('generates unique IDs for each record', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(saveRecord(makeInput()).id);
    }
    expect(ids.size).toBe(10);
  });
});

// ─── loadRecords ───────────────────────────────────────────────────────────

describe('loadRecords', () => {
  it('returns empty array when no records exist', () => {
    expect(loadRecords()).toEqual([]);
  });

  it('returns all records in order', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const records = loadRecords();
    expect(records).toHaveLength(2);
    expect(records[0].mainHexagram).toBe('2. 곤(坤)');
    expect(records[1].mainHexagram).toBe('1. 건(乾)');
  });

  it('returns new array references (no accidental mutation)', () => {
    saveRecord(makeInput());
    const a = loadRecords();
    const b = loadRecords();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('returns empty array when localStorage data is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid json');
    expect(loadRecords()).toEqual([]);
  });

  it('returns empty array when stored data is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: 'value' }));
    expect(loadRecords()).toEqual([]);
  });
});

// ─── getRecordById ─────────────────────────────────────────────────────────

describe('getRecordById', () => {
  it('returns the record matching the given id', () => {
    const record = saveRecord(makeInput({ mainHexagram: '5. 수(需)' }));
    const found = getRecordById(record.id);
    expect(found).toBeTruthy();
    expect(found!.id).toBe(record.id);
    expect(found!.mainHexagram).toBe('5. 수(需)');
  });

  it('returns undefined for non-existent id', () => {
    expect(getRecordById('non-existent-id')).toBeUndefined();
  });

  it('increments viewCount on each call', () => {
    const record = saveRecord(makeInput());
    expect(getRecordById(record.id)!.viewCount).toBe(1);
    expect(getRecordById(record.id)!.viewCount).toBe(2);
    expect(getRecordById(record.id)!.viewCount).toBe(3);
  });

  it('updates lastViewedAt on each call', () => {
    const record = saveRecord(makeInput());
    const first = getRecordById(record.id)!;
    const firstView = first.lastViewedAt!;

    const second = getRecordById(record.id)!;
    const secondView = second.lastViewedAt!;

    expect(firstView).toBeTruthy();
    expect(secondView).toBeTruthy();
    expect(new Date(secondView).getTime()).toBeGreaterThanOrEqual(
      new Date(firstView).getTime(),
    );
  });

  it('updates updatedAt on view', () => {
    const record = saveRecord(makeInput());
    const originalUpdatedAt = record.updatedAt;
    const found = getRecordById(record.id)!;
    expect(new Date(found.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime(),
    );
  });
});

// ─── updateRecord ──────────────────────────────────────────────────────────

describe('updateRecord', () => {
  it('updates freeMemo on an existing record', () => {
    const record = saveRecord(makeInput());
    const updated = updateRecord(record.id, { freeMemo: '중요한 메모입니다' });
    expect(updated!.freeMemo).toBe('중요한 메모입니다');
  });

  it('returns undefined for non-existent id', () => {
    expect(updateRecord('non-existent', { freeMemo: 'test' })).toBeUndefined();
  });

  it('persists the memo change', () => {
    const record = saveRecord(makeInput());
    updateRecord(record.id, { freeMemo: 'updated!' });
    const found = getRecordById(record.id)!;
    expect(found.freeMemo).toBe('updated!');
  });

  it('updates updatedAt on memo change', () => {
    const record = saveRecord(makeInput());
    const original = record.updatedAt;
    const updated = updateRecord(record.id, { freeMemo: 'new memo' })!;
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(original).getTime(),
    );
  });

  it('accepts empty string as memo', () => {
    const record = saveRecord(makeInput());
    updateRecord(record.id, { freeMemo: 'first' });
    const updated = updateRecord(record.id, { freeMemo: '' });
    expect(updated!.freeMemo).toBe('');
  });
});

// ─── saveOrUpdateMemo (pure function) ───────────────────────────────────────

describe('saveOrUpdateMemo', () => {
  const baseRecord = (overrides?: Partial<DivinationRecord>): DivinationRecord => ({
    id: 'test-id-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '',
    userQuestion: '',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('updates freeMemo on matching record', () => {
    const records = [baseRecord({ freeMemo: '' })];
    const result = saveOrUpdateMemo(records, 'test-id-001', '오늘의 점괘 메모');
    expect(result[0].freeMemo).toBe('오늘의 점괘 메모');
  });

  it('updates updatedAt timestamp on matching record', () => {
    const records = [baseRecord({ updatedAt: '2026-01-01T00:00:00.000Z' })];
    const before = new Date();
    const result = saveOrUpdateMemo(records, 'test-id-001', '메모');
    const updatedAt = new Date(result[0].updatedAt);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('replaces existing memo completely (not appending)', () => {
    const records = [baseRecord({ freeMemo: '이전 메모 내용' })];
    const result = saveOrUpdateMemo(records, 'test-id-001', '새로운 메모');
    expect(result[0].freeMemo).toBe('새로운 메모');
  });

  it('allows empty string to clear memo', () => {
    const records = [baseRecord({ freeMemo: '삭제할 메모' })];
    const result = saveOrUpdateMemo(records, 'test-id-001', '');
    expect(result[0].freeMemo).toBe('');
  });

  it('returns original array when id does not match (identity check)', () => {
    const records = [baseRecord()];
    const result = saveOrUpdateMemo(records, 'non-existent-id', '메모');
    expect(result).toBe(records);
  });

  it('returns original array when id does not match (value check)', () => {
    const records = [baseRecord()];
    const result = saveOrUpdateMemo(records, 'non-existent-id', '메모');
    expect(result[0].freeMemo).toBe('');
    expect(result[0].updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('does not mutate the original array', () => {
    const records = [baseRecord({ freeMemo: '원본 메모' })];
    const originalSnapshot = [...records];
    saveOrUpdateMemo(records, 'test-id-001', '수정된 메모');
    expect(records[0].freeMemo).toBe('원본 메모');
    expect(records[0].updatedAt).toBe(originalSnapshot[0].updatedAt);
  });

  it('does not affect other records when updating one', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: '메모 A' }),
      baseRecord({ id: 'id-b', freeMemo: '메모 B' }),
      baseRecord({ id: 'id-c', freeMemo: '메모 C' }),
    ];
    const result = saveOrUpdateMemo(records, 'id-b', '수정된 메모 B');
    expect(result[0].freeMemo).toBe('메모 A');
    expect(result[1].freeMemo).toBe('수정된 메모 B');
    expect(result[2].freeMemo).toBe('메모 C');
    expect(result).not.toBe(records);
  });

  it('works with empty records array (no-op)', () => {
    const records: DivinationRecord[] = [];
    const result = saveOrUpdateMemo(records, 'any-id', '메모');
    expect(result).toBe(records);
    expect(result).toHaveLength(0);
  });

  it('preserves all other fields unchanged', () => {
    const records = [
      baseRecord({
        id: 'full-record',
        mainHexagram: '2. 곤(坤)',
        changingHexagram: '3. 둔(屯)',
        changingLines: [1, 2, 3],
        aiInterpretation: '좋은 운세입니다',
        userQuestion: '취업운',
        viewCount: 5,
        lastViewedAt: '2026-05-01T12:00:00.000Z',
      }),
    ];
    const result = saveOrUpdateMemo(records, 'full-record', '새 메모');
    const updated = result[0];
    expect(updated.id).toBe('full-record');
    expect(updated.mainHexagram).toBe('2. 곤(坤)');
    expect(updated.changingHexagram).toBe('3. 둔(屯)');
    expect(updated.changingLines).toEqual([1, 2, 3]);
    expect(updated.aiInterpretation).toBe('좋은 운세입니다');
    expect(updated.userQuestion).toBe('취업운');
    expect(updated.viewCount).toBe(5);
    expect(updated.lastViewedAt).toBe('2026-05-01T12:00:00.000Z');
    expect(updated.timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(updated.freeMemo).toBe('새 메모');
  });
});

// ─── getMemo (pure function) ────────────────────────────────────────────────

describe('getMemo', () => {
  const baseRecord = (overrides?: Partial<DivinationRecord>): DivinationRecord => ({
    id: 'test-id-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '',
    userQuestion: '',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('returns the memo string when record has freeMemo', () => {
    const records = [baseRecord({ freeMemo: '오늘의 점괘 메모' })];
    expect(getMemo(records, 'test-id-001')).toBe('오늘의 점괘 메모');
  });

  it('returns null when record exists but freeMemo is empty string', () => {
    const records = [baseRecord({ freeMemo: '' })];
    expect(getMemo(records, 'test-id-001')).toBeNull();
  });

  it('returns null when freeMemo is undefined (field missing)', () => {
    const records = [baseRecord({ freeMemo: undefined })];
    expect(getMemo(records, 'test-id-001')).toBeNull();
  });

  it('returns null when id does not match any record', () => {
    const records = [baseRecord({ freeMemo: '있는 메모' })];
    expect(getMemo(records, 'non-existent-id')).toBeNull();
  });

  it('returns null for empty records array', () => {
    const records: DivinationRecord[] = [];
    expect(getMemo(records, 'any-id')).toBeNull();
  });

  it('returns memo from the correct record in a multi-record array', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: '메모 A' }),
      baseRecord({ id: 'id-b', freeMemo: '메모 B' }),
      baseRecord({ id: 'id-c', freeMemo: '' }),
    ];
    expect(getMemo(records, 'id-b')).toBe('메모 B');
  });

  it('does not mutate the original records array', () => {
    const records = [baseRecord({ freeMemo: '원본' })];
    const snapshot = JSON.stringify(records);
    getMemo(records, 'test-id-001');
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it('is a pure function — same input returns same output', () => {
    const records = [baseRecord({ freeMemo: '일관된 메모' })];
    expect(getMemo(records, 'test-id-001')).toBe('일관된 메모');
    expect(getMemo(records, 'test-id-001')).toBe('일관된 메모');
    expect(getMemo(records, 'test-id-001')).toBe('일관된 메모');
  });
});

// ─── getMemos (pure function) ───────────────────────────────────────────────

describe('getMemos', () => {
  const baseRecord = (overrides?: Partial<DivinationRecord>): DivinationRecord => ({
    id: 'test-id-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '',
    userQuestion: '',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('returns empty array when no records exist', () => {
    const records: DivinationRecord[] = [];
    expect(getMemos(records)).toEqual([]);
  });

  it('returns empty array when all records have empty freeMemo', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: '' }),
      baseRecord({ id: 'id-b', freeMemo: '' }),
      baseRecord({ id: 'id-c', freeMemo: '' }),
    ];
    expect(getMemos(records)).toEqual([]);
  });

  it('returns empty array when all freeMemos are undefined', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: undefined }),
      baseRecord({ id: 'id-b', freeMemo: undefined }),
    ];
    expect(getMemos(records)).toEqual([]);
  });

  it('returns only records with non-empty freeMemo', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: '메모 A' }),
      baseRecord({ id: 'id-b', freeMemo: '' }),
      baseRecord({ id: 'id-c', freeMemo: '메모 C' }),
      baseRecord({ id: 'id-d', freeMemo: '' }),
    ];
    expect(getMemos(records)).toEqual([
      { id: 'id-a', memo: '메모 A' },
      { id: 'id-c', memo: '메모 C' },
    ]);
  });

  it('preserves record order from input array', () => {
    const records = [
      baseRecord({ id: 'id-2', freeMemo: '두 번째' }),
      baseRecord({ id: 'id-1', freeMemo: '첫 번째' }),
      baseRecord({ id: 'id-3', freeMemo: '세 번째' }),
    ];
    const result = getMemos(records);
    expect(result[0].id).toBe('id-2');
    expect(result[1].id).toBe('id-1');
    expect(result[2].id).toBe('id-3');
  });

  it('does not mutate the original records array', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: '메모 A' }),
      baseRecord({ id: 'id-b', freeMemo: '' }),
    ];
    const snapshot = JSON.stringify(records);
    getMemos(records);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it('is a pure function — same input returns same output', () => {
    const records = [baseRecord({ id: 'id-1', freeMemo: '일관된 메모' })];
    expect(getMemos(records)).toEqual([{ id: 'id-1', memo: '일관된 메모' }]);
    expect(getMemos(records)).toEqual([{ id: 'id-1', memo: '일관된 메모' }]);
    expect(getMemos(records)).toEqual([{ id: 'id-1', memo: '일관된 메모' }]);
  });

  it('returns id-memo pairs with correct types', () => {
    const records = [baseRecord({ id: 'my-id-123', freeMemo: '타입 테스트' })];
    const result = getMemos(records);
    expect(typeof result[0].id).toBe('string');
    expect(typeof result[0].memo).toBe('string');
  });

  it('handles single record with memo', () => {
    const records = [baseRecord({ id: 'single', freeMemo: '하나만' })];
    expect(getMemos(records)).toEqual([{ id: 'single', memo: '하나만' }]);
  });

  it('handles mixed undefined and empty string freeMemos', () => {
    const records = [
      baseRecord({ id: 'id-a', freeMemo: undefined }),
      baseRecord({ id: 'id-b', freeMemo: '' }),
      baseRecord({ id: 'id-c', freeMemo: '진짜 메모' }),
    ];
    expect(getMemos(records)).toEqual([{ id: 'id-c', memo: '진짜 메모' }]);
  });
});

// ─── sortByTimestampDesc (pure function) ────────────────────────────────────

describe('sortByTimestampDesc', () => {
  const baseRecord = (overrides?: Partial<DivinationRecord>): DivinationRecord => ({
    id: 'test-id-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '',
    userQuestion: '',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('returns empty array for empty input', () => {
    const result = sortByTimestampDesc([]);
    expect(result).toEqual([]);
    expect(result).not.toBe([]); // new array reference
    expect(result).toHaveLength(0);
  });

  it('returns single element as-is (new array reference)', () => {
    const records = [baseRecord({ id: 'only', timestamp: '2026-06-01T00:00:00.000Z' })];
    const result = sortByTimestampDesc(records);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only');
    expect(result).not.toBe(records);
  });

  it('sorts by timestamp descending (newest first)', () => {
    const records = [
      baseRecord({ id: 'oldest', timestamp: '2025-01-01T00:00:00.000Z' }),
      baseRecord({ id: 'newest', timestamp: '2026-06-15T12:00:00.000Z' }),
      baseRecord({ id: 'middle', timestamp: '2026-03-20T08:30:00.000Z' }),
    ];
    const result = sortByTimestampDesc(records);
    expect(result[0].id).toBe('newest');
    expect(result[1].id).toBe('middle');
    expect(result[2].id).toBe('oldest');
  });

  it('preserves already-sorted order', () => {
    const records = [
      baseRecord({ id: 'newest', timestamp: '2026-12-31T23:59:59.000Z' }),
      baseRecord({ id: 'older', timestamp: '2026-01-01T00:00:00.000Z' }),
      baseRecord({ id: 'oldest', timestamp: '2025-01-01T00:00:00.000Z' }),
    ];
    const result = sortByTimestampDesc(records);
    expect(result[0].id).toBe('newest');
    expect(result[1].id).toBe('older');
    expect(result[2].id).toBe('oldest');
  });

  it('reverses ascending order input', () => {
    const records = [
      baseRecord({ id: 'oldest', timestamp: '2025-01-01T00:00:00.000Z' }),
      baseRecord({ id: 'middle', timestamp: '2025-06-15T00:00:00.000Z' }),
      baseRecord({ id: 'newest', timestamp: '2026-01-01T00:00:00.000Z' }),
    ];
    const result = sortByTimestampDesc(records);
    expect(result[0].id).toBe('newest');
    expect(result[1].id).toBe('middle');
    expect(result[2].id).toBe('oldest');
  });

  it('does not mutate the original array', () => {
    const records = [
      baseRecord({ id: 'a', timestamp: '2025-01-01T00:00:00.000Z' }),
      baseRecord({ id: 'b', timestamp: '2026-01-01T00:00:00.000Z' }),
    ];
    const snapshot = JSON.stringify(records);
    sortByTimestampDesc(records);
    expect(JSON.stringify(records)).toBe(snapshot);
    expect(records[0].id).toBe('a');
    expect(records[1].id).toBe('b');
  });

  it('is a pure function — same input returns same output', () => {
    const records = [
      baseRecord({ id: 'z', timestamp: '2025-01-01T00:00:00.000Z' }),
      baseRecord({ id: 'a', timestamp: '2026-01-01T00:00:00.000Z' }),
    ];
    const first = sortByTimestampDesc(records);
    const second = sortByTimestampDesc(records);
    const third = sortByTimestampDesc(records);
    expect(first).toEqual(second);
    expect(second).toEqual(third);
    // Repeated calls produce equivalent but distinct references
    expect(first).not.toBe(second);
    expect(second).not.toBe(third);
  });

  it('is stable — equal timestamps preserve original order', () => {
    const sameTime = '2026-06-01T12:00:00.000Z';
    const records = [
      baseRecord({ id: 'first', timestamp: sameTime }),
      baseRecord({ id: 'second', timestamp: sameTime }),
      baseRecord({ id: 'third', timestamp: sameTime }),
    ];
    const result = sortByTimestampDesc(records);
    expect(result[0].id).toBe('first');
    expect(result[1].id).toBe('second');
    expect(result[2].id).toBe('third');
  });

  it('handles sub-second precision ordering', () => {
    const records = [
      baseRecord({ id: 'latest', timestamp: '2026-06-01T12:00:00.999Z' }),
      baseRecord({ id: 'earliest', timestamp: '2026-06-01T12:00:00.001Z' }),
      baseRecord({ id: 'middle', timestamp: '2026-06-01T12:00:00.500Z' }),
    ];
    const result = sortByTimestampDesc(records);
    expect(result[0].id).toBe('latest');
    expect(result[1].id).toBe('middle');
    expect(result[2].id).toBe('earliest');
  });

  it('handles dates spanning different years correctly', () => {
    const records = [
      baseRecord({ id: 'y2024', timestamp: '2024-12-31T23:59:59.000Z' }),
      baseRecord({ id: 'y2025', timestamp: '2025-01-01T00:00:00.000Z' }),
      baseRecord({ id: 'y2026', timestamp: '2026-01-01T00:00:00.000Z' }),
    ];
    const result = sortByTimestampDesc(records);
    expect(result[0].id).toBe('y2026');
    expect(result[1].id).toBe('y2025');
    expect(result[2].id).toBe('y2024');
  });

  it('returns new array reference even when input is empty', () => {
    const records: DivinationRecord[] = [];
    const result = sortByTimestampDesc(records);
    expect(result).not.toBe(records);
  });
});

// ─── deleteRecord ──────────────────────────────────────────────────────────

describe('deleteRecord', () => {
  it('removes a record by id', () => {
    const record = saveRecord(makeInput());
    expect(loadRecords()).toHaveLength(1);

    const result = deleteRecord(record.id);
    expect(result).toBe(true);
    expect(loadRecords()).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    expect(deleteRecord('non-existent')).toBe(false);
  });

  it('only removes the specified record, leaving others intact', () => {
    const first = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const second = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    deleteRecord(first.id);

    const remaining = loadRecords();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
  });

  it('handles delete from empty storage (no records saved)', () => {
    expect(loadRecords()).toHaveLength(0);
    expect(deleteRecord('non-existent-in-empty')).toBe(false);
    expect(loadRecords()).toHaveLength(0);
  });

  it('is idempotent — deleting an already-deleted record returns false', () => {
    const record = saveRecord(makeInput({ mainHexagram: '5. 수(需)' }));
    expect(deleteRecord(record.id)).toBe(true);
    expect(deleteRecord(record.id)).toBe(false);
  });

  it('deletes the last remaining record successfully', () => {
    const record = saveRecord(makeInput({ mainHexagram: '64. 미제(未濟)' }));
    expect(loadRecords()).toHaveLength(1);
    expect(deleteRecord(record.id)).toBe(true);
    expect(loadRecords()).toHaveLength(0);
    // deleteRecord writes the remaining (empty) array back as packed data
    const packed = getRawPackedData();
    expect(packed).not.toBeNull();
    expect(packed!.records).toEqual([]);
  });

  it('preserves data integrity of records not deleted', () => {
    const r1 = saveRecord(
      makeInput({
        mainHexagram: '1. 건(乾)',
        aiInterpretation: '천운이 따르는 날',
        userQuestion: '오늘 운세 궁금해요',
      }),
    );
    const r2 = saveRecord(
      makeInput({
        mainHexagram: '2. 곤(坤)',
        aiInterpretation: '받아들이는 자세가 중요합니다',
        userQuestion: '이번주는 어때요?',
      }),
    );
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    // Delete r2
    expect(deleteRecord(r2.id)).toBe(true);

    // r1 and r3 should be intact
    const remaining = loadRecords();
    expect(remaining).toHaveLength(2);
    expect(remaining[0].id).toBe(r3.id);
    expect(remaining[1].id).toBe(r1.id);

    // r1's data should be intact
    const r1Reloaded = getRecordById(r1.id)!;
    expect(r1Reloaded.mainHexagram).toBe('1. 건(乾)');
    expect(r1Reloaded.aiInterpretation).toBe('천운이 따르는 날');
    expect(r1Reloaded.userQuestion).toBe('오늘 운세 궁금해요');

    // r3 should be intact
    const r3Reloaded = getRecordById(r3.id)!;
    expect(r3Reloaded.mainHexagram).toBe('3. 둔(屯)');

    // r2 should be gone
    expect(getRecordById(r2.id)).toBeUndefined();
  });

  it('deleteRecordFromStorage is equivalent to deleteRecord', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    // Use the new function name
    expect(deleteRecordFromStorage(r1.id)).toBe(true);
    expect(loadRecords()).toHaveLength(1);
    expect(loadRecords()[0].id).toBe(r2.id);

    // deleteRecord alias also works (backward compat)
    expect(deleteRecord(r2.id)).toBe(true);
    expect(loadRecords()).toHaveLength(0);
  });

  it('returns false for empty string id', () => {
    saveRecord(makeInput({ mainHexagram: '10. 리(履)' }));
    expect(deleteRecord('')).toBe(false);
    expect(loadRecords()).toHaveLength(1);
  });

  it('returns false for whitespace-only id', () => {
    saveRecord(makeInput({ mainHexagram: '15. 겸(謙)' }));
    expect(deleteRecord('   ')).toBe(false);
    expect(loadRecords()).toHaveLength(1);
  });

  it('verifies localStorage is updated after delete', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    deleteRecord(r1.id);

    // Direct localStorage verification
    const raw = localStorage.getItem('book-of-changes:records');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    const persistedRecords = parsed.records ?? parsed;
    expect(persistedRecords).toHaveLength(1);
    expect(persistedRecords[0].id).toBe(r2.id);
  });
});

// ─── clearRecords ──────────────────────────────────────────────────────────

describe('clearRecords', () => {
  it('removes all records', () => {
    saveRecord(makeInput());
    saveRecord(makeInput());
    expect(loadRecords()).toHaveLength(2);

    clearRecords();
    expect(loadRecords()).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('is idempotent — safe to call on empty storage', () => {
    expect(() => clearRecords()).not.toThrow();
    expect(loadRecords()).toEqual([]);
  });
});

// ─── getRecordCount ────────────────────────────────────────────────────────

describe('getRecordCount', () => {
  it('returns 0 when empty', () => {
    expect(getRecordCount()).toBe(0);
  });

  it('returns correct count', () => {
    saveRecord(makeInput());
    saveRecord(makeInput());
    saveRecord(makeInput());
    expect(getRecordCount()).toBe(3);
  });
});

// ─── getRawPackedData ──────────────────────────────────────────────────────

describe('getRawPackedData', () => {
  it('returns null when no data has been saved', () => {
    expect(getRawPackedData()).toBeNull();
  });

  it('returns PackedData with schemaVersion and records after saving', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const raw = getRawPackedData();
    expect(raw).not.toBeNull();
    expect(raw!.schemaVersion).toBe(1);
    expect(raw!.records).toHaveLength(2);
    expect(raw!.records[0].mainHexagram).toBe('2. 곤(坤)');
    expect(raw!.records[1].mainHexagram).toBe('1. 건(乾)');
  });

  it('returns null when localStorage contains corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid json');
    expect(getRawPackedData()).toBeNull();
  });

  it('returns null when localStorage is empty string', () => {
    localStorage.setItem(STORAGE_KEY, '');
    expect(getRawPackedData()).toBeNull();
  });

  it('returns raw parsed object as-is without migration or recovery', () => {
    // Simulate v0 (bare array) stored directly
    const v0Data = [
      {
        id: 'abc-123',
        timestamp: '2025-01-01T00:00:00.000Z',
        mainHexagram: '1. 건(乾)',
        changingLines: [],
        viewCount: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v0Data));

    const raw = getRawPackedData();
    // Returns the array as-is (treated as PackedData cast)
    expect(raw).not.toBeNull();
    expect(Array.isArray(raw)).toBe(true);
    expect((raw as unknown as unknown[]).length).toBe(1);
  });

  it('returns null after clearRecords', () => {
    saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    expect(getRawPackedData()).not.toBeNull();

    clearRecords();
    expect(getRawPackedData()).toBeNull();
  });

  it('reflects changes immediately after write operations', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    expect(getRawPackedData()!.records).toHaveLength(1);

    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    expect(getRawPackedData()!.records).toHaveLength(2);

    deleteRecord(r1.id);
    expect(getRawPackedData()!.records).toHaveLength(1);
    expect(getRawPackedData()!.records[0].mainHexagram).toBe('2. 곤(坤)');
  });

  it('returns null when localStorage is unavailable (mocked)', () => {
    const spy = mockStorageSetItemUnavailable();
    resetStorageAvailability();

    // getRawPackedData checks availability, sees unavailable, returns null
    expect(getRawPackedData()).toBeNull();

    spy.mockRestore();
  });
});

// ─── getStorageUsage ───────────────────────────────────────────────────────

describe('getStorageUsage', () => {
  it('returns 0 when empty', () => {
    expect(getStorageUsage()).toBe(0);
  });

  it('returns positive value after saving', () => {
    saveRecord(makeInput());
    expect(getStorageUsage()).toBeGreaterThan(0);
  });

  it('increases as more records are added', () => {
    saveRecord(makeInput());
    const usage1 = getStorageUsage();

    saveRecord(makeInput());
    const usage2 = getStorageUsage();

    expect(usage2).toBeGreaterThan(usage1);
  });
});

// ─── Cross-API Integration Tests ───────────────────────────────────────────

describe('integration', () => {
  it('full CRUD lifecycle: create → read → update → delete', () => {
    const created = saveRecord(makeInput({ mainHexagram: '30. 이(離)' }));
    expect(getRecordCount()).toBe(1);

    const read = getRecordById(created.id)!;
    expect(read.mainHexagram).toBe('30. 이(離)');
    expect(read.viewCount).toBe(1);

    const updated = updateRecord(created.id, { freeMemo: '메모 추가' })!;
    expect(updated.freeMemo).toBe('메모 추가');

    const reloaded = loadRecords()[0];
    expect(reloaded.freeMemo).toBe('메모 추가');
    expect(reloaded.viewCount).toBe(1);

    expect(deleteRecord(created.id)).toBe(true);
    expect(getRecordCount()).toBe(0);
  });
});

// ─── QuotaExceededError Handling ────────────────────────────────────────────

describe('QuotaExceededError handling', () => {
  describe('writeAll throws on QuotaExceededError (no silent deletion)', () => {
    it('throws error with user-friendly message instead of silently deleting records', () => {
      saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
      saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
      saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

      expect(getRecordCount()).toBe(3);

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' })),
      ).toThrow(
        'localStorage 저장 공간이 부족합니다. 일부 기록을 삭제한 후 다시 시도해 주세요.',
      );

      // Verify existing records were NOT silently deleted
      const fallbackState = getInMemoryFallbackState();
      expect(fallbackState.active).toBe(true);
      expect(fallbackState.recordCount).toBe(4); // original 3 + 1 new (in memory)

      spy.mockRestore();
    });

    it('does NOT silently trim oldest record on quota exceeded', () => {
      saveRecord(makeInput({ mainHexagram: '10. 리(履)' }));
      saveRecord(makeInput({ mainHexagram: '11. 태(泰)' }));

      expect(loadRecords()).toHaveLength(2);

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '12. 비(否)' })),
      ).toThrow();

      // The in-memory fallback should have all 3 records preserved
      const fallbackState = getInMemoryFallbackState();
      expect(fallbackState.active).toBe(true);
      expect(fallbackState.recordCount).toBe(3);

      // Don't restore spy yet. Make localStorage.getItem throw so readAll()
      // enters the catch path and returns from in-memory fallback.
      const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      const recordsViaFallback = loadRecords();
      expect(recordsViaFallback).toHaveLength(3);

      getSpy.mockRestore();
      spy.mockRestore();
      clearRecords(); // clean up fallback state
    });
  });

  describe('in-memory fallback preserves data', () => {
    it('getInMemoryFallbackState returns inactive when no error occurred', () => {
      saveRecord(makeInput());
      const state = getInMemoryFallbackState();
      expect(state.active).toBe(false);
      expect(state.recordCount).toBe(0);
    });

    it('getInMemoryFallbackState returns active with correct count after QuotaExceededError', () => {
      saveRecord(makeInput({ mainHexagram: '20. 관(觀)' }));

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '21. 서합(噬嗑)' })),
      ).toThrow();

      const state = getInMemoryFallbackState();
      expect(state.active).toBe(true);
      expect(state.recordCount).toBe(2);

      spy.mockRestore();
    });

    it('in-memory fallback clears on successful subsequent write', () => {
      // Pre-warm storage availability check before mocking setItem
      isLocalStorageAvailable();

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '30. 이(離)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);
      expect(getInMemoryFallbackState().recordCount).toBe(1);

      spy.mockRestore();

      // After restoring localStorage, successful save clears fallback
      saveRecord(makeInput({ mainHexagram: '31. 함(咸)' }));
      expect(getInMemoryFallbackState().active).toBe(false);
    });
  });

  describe('loadRecords reads from fallback when localStorage is inaccessible', () => {
    it('returns records from in-memory fallback when localStorage read fails', () => {
      saveRecord(makeInput({ mainHexagram: '40. 해(解)' }));

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '41. 손(損)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);

      // Don't restore setItem spy. Make getItem throw so readAll()
      // returns from in-memory fallback.
      const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const records = loadRecords();
      expect(records).toHaveLength(2);
      expect(records[0].mainHexagram).toBe('41. 손(損)');
      expect(records[1].mainHexagram).toBe('40. 해(解)');

      getSpy.mockRestore();
      spy.mockRestore();
      clearRecords(); // clean up fallback state
    });
  });

  describe('recoverFromFallback', () => {
    it('returns false when no fallback is active', () => {
      expect(recoverFromFallback()).toBe(false);
    });

    it('recovers records from fallback to localStorage when space is available', () => {
      saveRecord(makeInput({ mainHexagram: '50. 정(鼎)' }));

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '51. 진(震)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);
      expect(getInMemoryFallbackState().recordCount).toBe(2);

      spy.mockRestore();

      const recovered = recoverFromFallback();
      expect(recovered).toBe(true);
      expect(getInMemoryFallbackState().active).toBe(false);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();

      const records = loadRecords();
      expect(records).toHaveLength(2);
    });

    it('returns false if recovery fails (quota still exceeded)', () => {
      saveRecord(makeInput({ mainHexagram: '60. 절(節)' }));

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '61. 중부(中孚)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);

      // Don't restore — localStorage is still "full"
      const recovered = recoverFromFallback();
      expect(recovered).toBe(false);

      // Fallback should still be active (data preserved)
      expect(getInMemoryFallbackState().active).toBe(true);
      expect(getInMemoryFallbackState().recordCount).toBe(2);

      spy.mockRestore();
    });
  });

  describe('clearRecords clears fallback', () => {
    it('clears both localStorage and in-memory fallback', () => {
      saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);

      spy.mockRestore();

      clearRecords();
      expect(getInMemoryFallbackState().active).toBe(false);
      expect(loadRecords()).toEqual([]);
    });
  });

  describe('data integrity during QuotaExceededError', () => {
    it('preserves all field values of records in fallback', () => {
      const first = saveRecord(
        makeInput({
          mainHexagram: '1. 건(乾)',
          changingHexagram: '2. 곤(坤)',
          changingLines: [1, 3, 5],
          aiInterpretation: '아주 좋은 날',
          userQuestion: '오늘 운세가 궁금해요',
        }),
      );

      const spy = mockQuotaExceeded();

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);
      expect(getInMemoryFallbackState().recordCount).toBe(2);

      spy.mockRestore();

      // Recover and verify integrity
      recoverFromFallback();
      const recovered = getRecordById(first.id)!;
      expect(recovered.mainHexagram).toBe('1. 건(乾)');
      expect(recovered.changingHexagram).toBe('2. 곤(坤)');
      expect(recovered.changingLines).toEqual([1, 3, 5]);
      expect(recovered.aiInterpretation).toBe('아주 좋은 날');
      expect(recovered.userQuestion).toBe('오늘 운세가 궁금해요');
      expect(recovered.freeMemo).toBe('');
      expect(recovered.viewCount).toBe(1); // getRecordById increments viewCount
    });
  });

  describe('error propagation', () => {
    it('throws QuotaExceededError message for saveRecord', () => {
      saveRecord(makeInput());

      const spy = mockQuotaExceeded();

      expect(() => saveRecord(makeInput())).toThrow(
        'localStorage 저장 공간이 부족합니다. 일부 기록을 삭제한 후 다시 시도해 주세요.',
      );

      spy.mockRestore();
    });

    it('throws QuotaExceededError message for updateRecord', () => {
      const record = saveRecord(makeInput());

      const spy = mockQuotaExceeded();

      expect(() => updateRecord(record.id, { freeMemo: 'test' })).toThrow(
        'localStorage 저장 공간이 부족합니다. 일부 기록을 삭제한 후 다시 시도해 주세요.',
      );

      spy.mockRestore();
    });

    it('throws QuotaExceededError message for deleteRecord', () => {
      const record = saveRecord(makeInput());

      const spy = mockQuotaExceeded();

      expect(() => deleteRecord(record.id)).toThrow(
        'localStorage 저장 공간이 부족합니다. 일부 기록을 삭제한 후 다시 시도해 주세요.',
      );

      spy.mockRestore();
    });

    it('throws QuotaExceededError message for getRecordById (view update)', () => {
      const record = saveRecord(makeInput());

      const spy = mockQuotaExceeded();

      expect(() => getRecordById(record.id)).toThrow(
        'localStorage 저장 공간이 부족합니다. 일부 기록을 삭제한 후 다시 시도해 주세요.',
      );

      spy.mockRestore();
    });

    it('non-QuotaExceededError exceptions are caught and surfaced as STORAGE_UNAVAILABLE_MESSAGE', () => {
      saveRecord(makeInput({ mainHexagram: '62. 소과(小過)' }));

      const spy = mockTypeError();

      expect(() => saveRecord(makeInput({ mainHexagram: '63. 기제(旣濟)' }))).toThrow(
        STORAGE_UNAVAILABLE_MESSAGE,
      );
      expect(() => saveRecord(makeInput({ mainHexagram: '64. 미제(未濟)' }))).toThrow(
        STORAGE_UNAVAILABLE_MESSAGE,
      );

      spy.mockRestore();
    });

    // ── CRUD operations during in-memory fallback ──

    it('deleteRecord preserves mutation in fallback when quota exceeded', () => {
      const record1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
      const record2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
      expect(getRecordCount()).toBe(2);

      const spy = mockQuotaExceeded();

      expect(() => deleteRecord(record1.id)).toThrow(
        STORAGE_QUOTA_EXCEEDED_MESSAGE,
      );

      // Fallback should contain only record2 (record1 deleted in-memory)
      const fallbackState = getInMemoryFallbackState();
      expect(fallbackState.active).toBe(true);
      expect(fallbackState.recordCount).toBe(1);

      spy.mockRestore();
      recoverFromFallback();

      const loaded = loadRecords();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(record2.id);
    });

    it('updateRecord preserves mutation in fallback when quota exceeded', () => {
      const record = saveRecord(makeInput({ mainHexagram: '5. 수(需)' }));

      const spy = mockQuotaExceeded();

      expect(() => updateRecord(record.id, { freeMemo: '폴백 중 메모' })).toThrow(
        STORAGE_QUOTA_EXCEEDED_MESSAGE,
      );

      const fallbackState = getInMemoryFallbackState();
      expect(fallbackState.active).toBe(true);
      expect(fallbackState.recordCount).toBe(1);

      spy.mockRestore();
      recoverFromFallback();

      const loaded = loadRecords()[0];
      expect(loaded.freeMemo).toBe('폴백 중 메모');
    });

    it('getRecordById preserves view count in fallback when quota exceeded', () => {
      const record = saveRecord(makeInput({ mainHexagram: '10. 리(履)' }));

      const spy = mockQuotaExceeded();

      expect(() => getRecordById(record.id)).toThrow(
        STORAGE_QUOTA_EXCEEDED_MESSAGE,
      );

      const fallbackState = getInMemoryFallbackState();
      expect(fallbackState.active).toBe(true);
      expect(fallbackState.recordCount).toBe(1);

      spy.mockRestore();
      recoverFromFallback();

      const loaded = getRecordById(record.id)!;
      // viewCount incremented once during original getRecordById (in fallback) + 1 now
      expect(loaded.viewCount).toBe(2);
    });

    it('clearRecords removes all records from fallback', () => {
      saveRecord(makeInput({ mainHexagram: '30. 이(離)' }));

      const spy = mockQuotaExceeded();
      expect(() => saveRecord(makeInput({ mainHexagram: '31. 함(咸)' }))).toThrow();
      expect(getInMemoryFallbackState().active).toBe(true);

      spy.mockRestore();

      clearRecords();
      expect(getInMemoryFallbackState().active).toBe(false);
      expect(loadRecords()).toEqual([]);
    });
  });

  // ─── isStorageQuotaError ──────────────────────────────────────────────────

  describe('isStorageQuotaError', () => {
    it('returns true for QuotaExceededError message', () => {
      expect(
        isStorageQuotaError(new Error(STORAGE_QUOTA_EXCEEDED_MESSAGE)),
      ).toBe(true);
    });

    it('returns false for other Error instances', () => {
      expect(isStorageQuotaError(new Error('Some other error'))).toBe(false);
      expect(isStorageQuotaError(new TypeError('Type error'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isStorageQuotaError(null)).toBe(false);
      expect(isStorageQuotaError(undefined)).toBe(false);
      expect(isStorageQuotaError('string error')).toBe(false);
      expect(isStorageQuotaError(42)).toBe(false);
    });
  });

  // ─── STORAGE_QUOTA_EXCEEDED_MESSAGE ───────────────────────────────────────

  describe('STORAGE_QUOTA_EXCEEDED_MESSAGE', () => {
    it('is a non-empty string', () => {
      expect(STORAGE_QUOTA_EXCEEDED_MESSAGE).toBeTruthy();
      expect(typeof STORAGE_QUOTA_EXCEEDED_MESSAGE).toBe('string');
    });

    it('is the same constant used by writeAll', () => {
      // Test that the error thrown by a QuotaExceededError contains the exact constant
      saveRecord(makeInput());

      const spy = mockQuotaExceeded();

      try {
        saveRecord(makeInput());
        expect.fail('Expected error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(STORAGE_QUOTA_EXCEEDED_MESSAGE);
      }

      spy.mockRestore();
    });
  });
});

// ─── localStorage Unavailable (Safari Private Browsing, etc.) ──────────────

describe('localStorage unavailable (Safari Private Browsing, etc.)', () => {
  beforeEach(() => {
    clearRecords();
    vi.restoreAllMocks();
    // Simulate: setItem always fails with SecurityError
    mockStorageSetItemUnavailable();
    mockStorageRemoveItemUnavailable();
  });

  describe('isLocalStorageAvailable', () => {
    it('returns false when setItem throws SecurityError', () => {
      resetStorageAvailability();
      // Re-apply mocks since reset clears them
      mockStorageSetItemUnavailable();
      mockStorageRemoveItemUnavailable();
      expect(isLocalStorageAvailable()).toBe(false);
    });

    it('is cached - subsequent calls do not hit localStorage again', () => {
      resetStorageAvailability();
      mockStorageSetItemUnavailable();
      mockStorageRemoveItemUnavailable();
      expect(isLocalStorageAvailable()).toBe(false);

      // Restore storage and call again; cached result should persist
      vi.restoreAllMocks();
      expect(isLocalStorageAvailable()).toBe(false); // still cached as unavailable
    });

    it('returns true when localStorage is available', () => {
      vi.restoreAllMocks();
      resetStorageAvailability();
      expect(isLocalStorageAvailable()).toBe(true);
    });
  });

  describe('resetStorageAvailability', () => {
    it('resets cache so next check re-tests availability', () => {
      resetStorageAvailability();
      mockStorageSetItemUnavailable();
      mockStorageRemoveItemUnavailable();
      expect(isLocalStorageAvailable()).toBe(false);

      vi.restoreAllMocks();
      resetStorageAvailability();
      expect(isLocalStorageAvailable()).toBe(true);
    });
  });

  // ─── Core operation behavior when storage unavailable ────────────────────

  describe('write operations fail with fallback when storage unavailable', () => {
    beforeEach(() => {
      // Ensure storageAvailable cache reflects the mock state
      resetStorageAvailability();
    });

    it('saveRecord falls back to in-memory and throws STORAGE_UNAVAILABLE_MESSAGE', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

      // Data preserved in in-memory fallback
      const state = getInMemoryFallbackState();
      expect(state.active).toBe(true);
      expect(state.recordCount).toBe(1);

      // loadRecords returns from in-memory fallback
      const records = loadRecords();
      expect(records).toHaveLength(1);
      expect(records[0].mainHexagram).toBe('1. 건(乾)');
    });

    it('updateRecord falls back to in-memory and throws STORAGE_UNAVAILABLE_MESSAGE', () => {
      // Save works in-memory
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '5. 수(需)' })),
      ).toThrow();

      const state = getInMemoryFallbackState();
      expect(state.active).toBe(true);
      expect(state.recordCount).toBe(1);

      const records = loadRecords();
      expect(records[0].freeMemo).toBe('');

      expect(() =>
        updateRecord(records[0].id, { freeMemo: '메모 in fallback' }),
      ).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

      // Memo mutation preserved in-memory
      const after = loadRecords();
      expect(after[0].freeMemo).toBe('메모 in fallback');
    });

    it('deleteRecord falls back to in-memory and throws STORAGE_UNAVAILABLE_MESSAGE', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      ).toThrow();

      let records = loadRecords();
      expect(records).toHaveLength(2);

      expect(() => deleteRecord(records[1].id)).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

      // Deletion reflected in-memory
      records = loadRecords();
      expect(records).toHaveLength(1);
      expect(records[0].mainHexagram).toBe('2. 곤(坤)');
    });

    it('getRecordById updates viewCount in fallback and throws when write is unavailable', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '10. 리(履)' })),
      ).toThrow();

      const records = loadRecords();
      expect(records[0].viewCount).toBe(0);

      expect(() => getRecordById(records[0].id)).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

      // View count incremented in fallback
      const after = loadRecords();
      expect(after[0].viewCount).toBe(1);
      expect(after[0].lastViewedAt).toBeTruthy();
    });

    it('subsequent saveRecord after fallback accumulates in-memory', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' })),
      ).toThrow();

      const records = loadRecords();
      expect(records).toHaveLength(3);
      expect(records[0].mainHexagram).toBe('3. 둔(屯)');
      expect(records[2].mainHexagram).toBe('1. 건(乾)');
    });
  });

  // ─── Read-only operations when storage unavailable ──────────────────────

  describe('read operations work normally when storage unavailable', () => {
    it('loadRecords returns empty array when no data', () => {
      resetStorageAvailability();
      expect(loadRecords()).toEqual([]);
    });

    it('loadRecords returns from in-memory fallback when active', () => {
      // Seed in-memory data via write that fails
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '15. 겸(謙)' })),
      ).toThrow();

      // Even if getItem throws too, should return fallback
      const getSpy = mockGetItemError();
      const records = loadRecords();
      expect(records).toHaveLength(1);
      expect(records[0].mainHexagram).toBe('15. 겸(謙)');
      getSpy.mockRestore();
    });

    it('getRecordCount returns correct count from fallback', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      ).toThrow();

      expect(getRecordCount()).toBe(2);
    });

    it('getStorageUsage returns 0 when storage unavailable', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow();

      // Fallback data exists but localStorage is inaccessible
      const usage = getStorageUsage();
      expect(usage).toBe(0);
    });
  });

  // ─── clearRecords behavior ──────────────────────────────────────────────

  describe('clearRecords when storage unavailable', () => {
    it('clears in-memory fallback even when localStorage clear fails', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);

      // clearRecords should NOT throw — it catches the error
      expect(() => clearRecords()).not.toThrow();

      expect(getInMemoryFallbackState().active).toBe(false);
      expect(loadRecords()).toEqual([]);
    });

    it('clearRecords does not throw on empty state', () => {
      expect(() => clearRecords()).not.toThrow();
      expect(loadRecords()).toEqual([]);
    });
  });

  // ─── recoverFromFallback behavior ───────────────────────────────────────

  describe('recoverFromFallback when storage unavailable', () => {
    it('returns false — cannot recover while storage is unavailable', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '10. 리(履)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().active).toBe(true);

      const didRecover = recoverFromFallback();
      expect(didRecover).toBe(false);
      // Fallback still active (data preserved)
      expect(getInMemoryFallbackState().active).toBe(true);
    });

    it('recovers successfully once storage becomes available', () => {
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '20. 관(觀)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '21. 서합(噬嗑)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().recordCount).toBe(2);

      // Restore mocks — now storage is available
      vi.restoreAllMocks();
      resetStorageAvailability();

      const didRecover = recoverFromFallback();
      expect(didRecover).toBe(true);
      expect(getInMemoryFallbackState().active).toBe(false);

      // Data persisted to localStorage
      const records = loadRecords();
      expect(records).toHaveLength(2);
      expect(records[0].mainHexagram).toBe('21. 서합(噬嗑)');
      expect(records[1].mainHexagram).toBe('20. 관(觀)');
    });
  });

  // ─── Non-QuotaExceededError exceptions handled ─────────────────────────

  describe('non-QuotaExceededError exceptions become STORAGE_UNAVAILABLE_MESSAGE', () => {
    it('TypeError during setItem triggers STORAGE_UNAVAILABLE_MESSAGE', () => {
      const typeSpy = mockTypeError();
      resetStorageAvailability();
      // Also mock getItem so storage available test passes
      // mockTypeError only mocks setItem, so getItem still works

      expect(() =>
        saveRecord(makeInput({ mainHexagram: '63. 기제(旣濟)' })),
      ).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

      // Fallback should be active with data
      const state = getInMemoryFallbackState();
      expect(state.active).toBe(true);
      expect(state.recordCount).toBe(1);

      typeSpy.mockRestore();
    });
  });

  // ─── isStorageUnavailableError ──────────────────────────────────────────

  describe('isStorageUnavailableError', () => {
    it('returns true for STORAGE_UNAVAILABLE_MESSAGE', () => {
      expect(
        isStorageUnavailableError(new Error(STORAGE_UNAVAILABLE_MESSAGE)),
      ).toBe(true);
    });

    it('returns false for other Error instances', () => {
      expect(isStorageUnavailableError(new Error('Some other error'))).toBe(false);
      expect(isStorageUnavailableError(new Error(STORAGE_QUOTA_EXCEEDED_MESSAGE))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isStorageUnavailableError(null)).toBe(false);
      expect(isStorageUnavailableError(undefined)).toBe(false);
      expect(isStorageUnavailableError('string error')).toBe(false);
    });
  });

  // ─── STORAGE_UNAVAILABLE_MESSAGE constant ───────────────────────────────

  describe('STORAGE_UNAVAILABLE_MESSAGE', () => {
    it('is a non-empty string', () => {
      expect(STORAGE_UNAVAILABLE_MESSAGE).toBeTruthy();
      expect(typeof STORAGE_UNAVAILABLE_MESSAGE).toBe('string');
    });

    it('is the same constant used when storage is unavailable', () => {
      resetStorageAvailability();

      try {
        saveRecord(makeInput());
        expect.fail('Expected error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(STORAGE_UNAVAILABLE_MESSAGE);
      }
    });
  });

  // ─── Data integrity during storage unavailability ──────────────────────

  describe('data integrity during storage unavailability', () => {
    it('preserves all record fields in fallback after unavailability', () => {
      expect(() =>
        saveRecord(
          makeInput({
            mainHexagram: '1. 건(乾)',
            changingHexagram: '2. 곤(坤)',
            changingLines: [1, 3, 5],
            aiInterpretation: '아주 좋은 날',
            userQuestion: '오늘 운세가 궁금해요',
          }),
        ),
      ).toThrow(STORAGE_UNAVAILABLE_MESSAGE);

      const records = loadRecords();
      expect(records).toHaveLength(1);
      const r = records[0];
      expect(r.mainHexagram).toBe('1. 건(乾)');
      expect(r.changingHexagram).toBe('2. 곤(坤)');
      expect(r.changingLines).toEqual([1, 3, 5]);
      expect(r.aiInterpretation).toBe('아주 좋은 날');
      expect(r.userQuestion).toBe('오늘 운세가 궁금해요');
      expect(r.freeMemo).toBe('');
      expect(r.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);
      expect(r.timestamp).toBeTruthy();
      expect(r.createdAt).toBe(r.timestamp);
      expect(r.updatedAt).toBe(r.timestamp);
      expect(r.viewCount).toBe(0);
      expect(r.lastViewedAt).toBeNull();
    });

    it('multiple CRUD operations during unavailability maintain integrity', () => {
      // Create 3 records in fallback
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      ).toThrow();
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' })),
      ).toThrow();

      expect(getRecordCount()).toBe(3);

      const r2 = loadRecords()[1]; // 2. 곤(坤)
      expect(() =>
        updateRecord(r2.id, { freeMemo: 'fallback memo' }),
      ).toThrow();

      const r3 = loadRecords()[2]; // 1. 건(乾)
      expect(() => deleteRecord(r3.id)).toThrow();

      // Verify state
      const remaining = loadRecords();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].mainHexagram).toBe('3. 둔(屯)');
      expect(remaining[1].mainHexagram).toBe('2. 곤(坤)');
      expect(remaining[1].freeMemo).toBe('fallback memo');
    });

    it('data survives recovery when storage is restored', () => {
      expect(() =>
        saveRecord(
          makeInput({
            mainHexagram: '30. 이(離)',
            aiInterpretation: '빛과 지혜',
            userQuestion: '오늘의 방향은?',
          }),
        ),
      ).toThrow(STORAGE_UNAVAILABLE_MESSAGE);
      expect(() =>
        saveRecord(makeInput({ mainHexagram: '31. 함(咸)' })),
      ).toThrow();

      expect(getInMemoryFallbackState().recordCount).toBe(2);

      // Restore storage accessibility
      vi.restoreAllMocks();
      resetStorageAvailability();

      const recovered = recoverFromFallback();
      expect(recovered).toBe(true);
      expect(getInMemoryFallbackState().active).toBe(false);

      // Read fresh from localStorage
      const records = loadRecords();
      expect(records).toHaveLength(2);
      expect(records[0].mainHexagram).toBe('31. 함(咸)');
      expect(records[1].mainHexagram).toBe('30. 이(離)');
      expect(records[1].aiInterpretation).toBe('빛과 지혜');
      expect(records[1].userQuestion).toBe('오늘의 방향은?');
    });
  });
});

// =============================================================================
// queryRecordsFromStorage — localStorage 조회 + 필터링 통합 테스트
// =============================================================================

describe('queryRecordsFromStorage', () => {
  // ── 전체 목록 조회 (list all) ──────────────────────────────────────────────

  it('returns all records sorted by timestamp desc when no options provided', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const result = queryRecordsFromStorage();

    expect(result).toHaveLength(3);
    // 최신순 정렬 (timestamp desc) — 마지막 저장이 가장 최신
    expect(result[0].id).toBe(r3.id);
    expect(result[1].id).toBe(r2.id);
    expect(result[2].id).toBe(r1.id);
  });

  it('returns empty array when no records exist (missing key)', () => {
    // No records saved — localStorage key does not exist
    expect(queryRecordsFromStorage()).toEqual([]);
  });

  it('returns empty array when localStorage key is explicitly removed', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    localStorage.removeItem(STORAGE_KEY);

    expect(queryRecordsFromStorage()).toEqual([]);
  });

  it('returns empty array when localStorage is empty string', () => {
    localStorage.setItem(STORAGE_KEY, '');

    expect(queryRecordsFromStorage()).toEqual([]);
  });

  it('returns empty array when localStorage data is corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid json!!!');

    expect(queryRecordsFromStorage()).toEqual([]);
  });

  it('returns empty array when stored data is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: 'not an array' }));

    expect(queryRecordsFromStorage()).toEqual([]);
  });

  // ── 검색어 필터링 ─────────────────────────────────────────────────────────

  it('filters by search in mainHexagram', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const result = queryRecordsFromStorage({ search: '건' });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('filters by search in aiInterpretation', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '오늘은 행운이 가득한 날입니다',
    }));
    saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '',
    }));

    const result = queryRecordsFromStorage({ search: '행운' });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('filters by search in freeMemo', () => {
    const r = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    updateRecord(r.id, { freeMemo: '중요한 점괘 결과' });
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const result = queryRecordsFromStorage({ search: '중요한' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(r.id);
  });

  it('search is case-insensitive', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: 'HELLO world',
    }));

    const lower = queryRecordsFromStorage({ search: 'hello' });
    const upper = queryRecordsFromStorage({ search: 'HELLO' });

    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
  });

  it('empty search string returns all records', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const result = queryRecordsFromStorage({ search: '' });
    expect(result).toHaveLength(2);
  });

  // ── hasChangingHexagram 필터 ──────────────────────────────────────────────

  it('filters records with changing hexagram (true)', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
    }));
    saveRecord(makeInput({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
    }));

    const result = queryRecordsFromStorage({ hasChangingHexagram: true });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('filters records without changing hexagram (false)', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
    }));
    saveRecord(makeInput({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
    }));

    const result = queryRecordsFromStorage({ hasChangingHexagram: false });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('3. 둔(屯)');
  });

  // ── hasAiInterpretation 필터 ──────────────────────────────────────────────

  it('filters records with AI interpretation (true)', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 운세입니다',
    }));
    saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '',
    }));

    const result = queryRecordsFromStorage({ hasAiInterpretation: true });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('filters records without AI interpretation (false)', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 운세입니다',
    }));
    saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '',
    }));

    const result = queryRecordsFromStorage({ hasAiInterpretation: false });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('2. 곤(坤)');
  });

  // ── hasMemo 필터 ─────────────────────────────────────────────────────────

  it('filters records with memo (true)', () => {
    const r = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    updateRecord(r.id, { freeMemo: '중요한 기록' });
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const result = queryRecordsFromStorage({ hasMemo: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(r.id);
  });

  it('filters records without memo (false)', () => {
    const r = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    updateRecord(r.id, { freeMemo: '메모' });
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const result = queryRecordsFromStorage({ hasMemo: false });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('2. 곤(坤)');
  });

  // ── hexagramNumbers 필터 ─────────────────────────────────────────────────

  it('filters by single hexagram number', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const result = queryRecordsFromStorage({ hexagramNumbers: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('filters by multiple hexagram numbers (array)', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const result = queryRecordsFromStorage({ hexagramNumbers: [1, 3] });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.mainHexagram).sort()).toEqual(
      ['1. 건(乾)', '3. 둔(屯)'].sort(),
    );
  });

  it('returns empty for hexagram number that does not exist', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    const result = queryRecordsFromStorage({ hexagramNumbers: 64 });
    expect(result).toEqual([]);
  });

  // ── 정렬 ─────────────────────────────────────────────────────────────────

  it('sorts by timestamp desc by default', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const result = queryRecordsFromStorage();
    expect(result[0].id).toBe(r3.id);
    expect(result[1].id).toBe(r2.id);
    expect(result[2].id).toBe(r1.id);
  });

  it('sorts by timestamp asc when specified', () => {
    // Save records then manually set ascending timestamps to ensure
    // stable sort ordering regardless of save timing.
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    // Get raw packed data and manually reorder timestamps ascending
    const packed = getRawPackedData()!;
    packed.records[0].timestamp = '2026-01-01T00:00:00.000Z'; // r3 → oldest
    packed.records[1].timestamp = '2026-02-01T00:00:00.000Z'; // r2
    packed.records[2].timestamp = '2026-03-01T00:00:00.000Z'; // r1 → newest

    // Write back with ascending timestamps (oldest first in storage order)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packed));

    const result = queryRecordsFromStorage({
      sort: { field: 'timestamp', direction: 'asc' },
    });
    // asc: oldest first
    expect(result[0].id).toBe(r3.id); // oldest timestamp
    expect(result[1].id).toBe(r2.id);
    expect(result[2].id).toBe(r1.id); // newest timestamp
  });

  it('sorts by viewCount desc', () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    // Increment view counts
    getRecordById(r1.id); // viewCount=1
    getRecordById(r3.id); // viewCount=1
    getRecordById(r3.id); // viewCount=2

    const result = queryRecordsFromStorage({
      sort: { field: 'viewCount', direction: 'desc' },
    });
    expect(result[0].id).toBe(r3.id); // viewCount=2
    expect(result[1].id).toBe(r1.id); // viewCount=1
    expect(result[2].id).toBe(r2.id); // viewCount=0
  });

  // ── 복합 필터 (AND 조합) ─────────────────────────────────────────────────

  it('combines search + hasChangingHexagram (AND logic)', () => {
    saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
    }));
    saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      changingHexagram: null,
    }));

    const result = queryRecordsFromStorage({
      search: '건',
      hasChangingHexagram: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('combines hasMemo + hasAiInterpretation (AND logic)', () => {
    const r1 = saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 운세',
    }));
    updateRecord(r1.id, { freeMemo: '메모' });
    saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '좋은 운세',
    }));

    const result = queryRecordsFromStorage({
      hasAiInterpretation: true,
      hasMemo: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(r1.id);
  });

  it('no matches returns empty array (all filters combined)', () => {
    saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    const result = queryRecordsFromStorage({
      search: '존재하지않는검색어',
      hasAiInterpretation: true,
    });
    expect(result).toEqual([]);
  });

  // ── Does not throw ────────────────────────────────────────────────────────

  it('never throws, even with corrupted data', () => {
    localStorage.setItem(STORAGE_KEY, 'definitely-not-json!!@#');

    expect(() => queryRecordsFromStorage()).not.toThrow();
    expect(queryRecordsFromStorage()).toEqual([]);
  });

  it('returns empty array when options is undefined', () => {
    expect(queryRecordsFromStorage()).toEqual([]);
    expect(queryRecordsFromStorage(undefined)).toEqual([]);
  });
});

// ─── duplicateCheck (pure function) ────────────────────────────────────────

describe('duplicateCheck', () => {
  const baseRecord = (overrides?: Partial<DivinationRecord>): DivinationRecord => ({
    id: 'test-id-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '좋은 운세입니다',
    userQuestion: '오늘의 운세가 궁금해요',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  it('returns true when identical mainHexagram and changingLines exist', () => {
    const records = [
      baseRecord({ id: 'id-a', mainHexagram: '1. 건(乾)', changingLines: [2, 5] }),
      baseRecord({ id: 'id-b', mainHexagram: '2. 곤(坤)', changingLines: [1, 3] }),
    ];

    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
  });

  it('returns false when mainHexagram differs', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [2, 5] })];

    expect(duplicateCheck(records, '2. 곤(坤)', [2, 5])).toBe(false);
  });

  it('returns false when changingLines differ', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [2, 5] })];

    expect(duplicateCheck(records, '1. 건(乾)', [1, 3, 6])).toBe(false);
  });

  it('returns false when changingLines length differs', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [2, 5] })];

    expect(duplicateCheck(records, '1. 건(乾)', [2])).toBe(false);
    expect(duplicateCheck(records, '1. 건(乾)', [2, 5, 6])).toBe(false);
  });

  it('returns true when changingLines match regardless of order', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [5, 2] })];

    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
  });

  it('returns true when both have empty changingLines (empty array vs empty array)', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [] })];

    expect(duplicateCheck(records, '1. 건(乾)', [])).toBe(true);
  });

  it('returns false for empty records array', () => {
    const records: DivinationRecord[] = [];

    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(false);
  });

  it('returns false when no record matches in multi-record array', () => {
    const records = [
      baseRecord({ id: 'id-a', mainHexagram: '1. 건(乾)', changingLines: [2, 5] }),
      baseRecord({ id: 'id-b', mainHexagram: '2. 곤(坤)', changingLines: [1, 3] }),
      baseRecord({ id: 'id-c', mainHexagram: '3. 둔(屯)', changingLines: [4, 6] }),
    ];

    expect(duplicateCheck(records, '5. 수(需)', [1, 2])).toBe(false);
  });

  it('finds duplicate among many records', () => {
    const records: DivinationRecord[] = [];
    for (let i = 1; i <= 20; i++) {
      records.push(baseRecord({ id: `id-${i}`, mainHexagram: `${i}. test`, changingLines: [i] }));
    }
    records.push(baseRecord({ id: 'target', mainHexagram: '21. 중복', changingLines: [3, 7] }));

    expect(duplicateCheck(records, '21. 중복', [3, 7])).toBe(true);
    expect(duplicateCheck(records, '99. 없음', [1, 2])).toBe(false);
  });

  it('is a pure function — does not mutate the input array', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [2, 5] })];
    const snapshot = JSON.stringify(records);
    duplicateCheck(records, '1. 건(乾)', [2, 5]);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it('is a pure function — same input returns same output', () => {
    const records = [baseRecord({ mainHexagram: '1. 건(乾)', changingLines: [2, 5] })];
    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
  });

  it('ignores aiInterpretation, userQuestion, freeMemo when checking duplicates', () => {
    const records = [
      baseRecord({
        id: 'id-a',
        mainHexagram: '1. 건(乾)',
        changingLines: [2, 5],
        aiInterpretation: '완전히 다른 해석',
        userQuestion: '전혀 다른 질문',
        freeMemo: '다른 메모',
      }),
    ];

    // 동일한 점괘 조합이지만 aiInterpretation/userQuestion/freeMemo가 다름
    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
  });

  it('does not consider different changingHexagram as non-duplicate when main+lines match', () => {
    const records = [
      baseRecord({
        id: 'id-a',
        mainHexagram: '1. 건(乾)',
        changingLines: [2, 5],
        changingHexagram: '10. 리(履)',
      }),
    ];

    // changingHexagram은 derived 필드이므로 mainHexagram + changingLines만 비교
    expect(duplicateCheck(records, '1. 건(乾)', [2, 5])).toBe(true);
  });
});
