import { describe, it, expect } from 'vitest';
import { recoverRecord, recoverRecords } from '@/lib/recordRecovery';
import type { RecoveryWarning, RecoveryResult as _RecoveryResult } from '@/lib/recordRecovery';
import type { DivinationRecord } from '@/data/types';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

/** 유효한 최소 DivinationRecord */
function makeValidRecord(overrides?: Partial<DivinationRecord>): DivinationRecord {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-06-02T03:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: null,
    changingLines: [2, 5],
    aiInterpretation: '좋은 운세입니다.',
    userQuestion: '오늘의 운세는?',
    freeMemo: '',
    lastViewedAt: null,
    pinnedAt: null,
    viewCount: 0,
    createdAt: '2026-06-02T03:00:00.000Z',
    updatedAt: '2026-06-02T03:00:00.000Z',
    ...overrides,
  };
}

/** 유효한 레코드를 raw 객체로 변환 */
function rawValid(overrides?: Partial<DivinationRecord>): Record<string, unknown> {
  return makeValidRecord(overrides) as unknown as Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** 경고 중 특정 필드, 특정 issue 조합이 존재하는지 확인 */
function hasWarning(
  warnings: RecoveryWarning[],
  field: string,
  issue: RecoveryWarning['issue'],
): boolean {
  return warnings.some((w) => w.field === field && w.issue === issue);
}

// =============================================================================
// recoverRecord
// =============================================================================

describe('recoverRecord', () => {
  // ── 정상 케이스 ──────────────────────────────────────────────────────────

  it('returns valid record unchanged with zero warnings', () => {
    const raw = rawValid();
    const result = recoverRecord(raw);

    expect(result.record.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.record.mainHexagram).toBe('1. 건(乾)');
    expect(result.record.changingLines).toEqual([2, 5]);
    expect(result.record.viewCount).toBe(0);
    expect(result.record.changingHexagram).toBeNull();
    expect(result.record.aiInterpretation).toBe('좋은 운세입니다.');
    expect(result.record.userQuestion).toBe('오늘의 운세는?');
    expect(result.record.freeMemo).toBe('');
    expect(result.record.lastViewedAt).toBeNull();
    expect(result.warnings).toHaveLength(0);
    expect(result.fullyLost).toBe(false);
  });

  it('returns valid record with all optional fields filled', () => {
    const raw = rawValid({
      changingHexagram: '2. 곤(坤)',
      aiInterpretation: '상세한 해석',
      userQuestion: '질문',
      freeMemo: '메모',
      lastViewedAt: '2026-06-03T00:00:00.000Z',
    });
    const result = recoverRecord(raw);

    expect(result.record.changingHexagram).toBe('2. 곤(坤)');
    expect(result.record.aiInterpretation).toBe('상세한 해석');
    expect(result.record.userQuestion).toBe('질문');
    expect(result.record.freeMemo).toBe('메모');
    expect(result.record.lastViewedAt).toBe('2026-06-03T00:00:00.000Z');
    expect(result.warnings).toHaveLength(0);
    expect(result.fullyLost).toBe(false);
  });

  it('returns valid record with empty changingLines array', () => {
    const raw = rawValid({ changingLines: [] });
    const result = recoverRecord(raw);

    expect(result.record.changingLines).toEqual([]);
    expect(result.warnings).toHaveLength(0);
  });

  // ── 완전 손상 (fullyLost) ────────────────────────────────────────────────

  it('fullyLost when raw is null', () => {
    const result = recoverRecord(null);

    expect(result.fullyLost).toBe(true);
    expect(result.record.id).toBe('');
    expect(result.record.mainHexagram).toBe('');
    expect(result.record.changingLines).toEqual([]);
    expect(result.record.viewCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('(entire record)');
    expect(result.warnings[0].issue).toBe('missing');
  });

  it('fullyLost when raw is undefined', () => {
    const result = recoverRecord(undefined);

    expect(result.fullyLost).toBe(true);
    expect(result.record.id).toBe('');
  });

  it('fullyLost when raw is a primitive string', () => {
    const result = recoverRecord('not an object');

    expect(result.fullyLost).toBe(true);
    expect(result.warnings[0].issue).toBe('type_mismatch');
    expect(result.warnings[0].rawValue).toBe('not an object');
  });

  it('fullyLost when raw is a number', () => {
    const result = recoverRecord(42);

    expect(result.fullyLost).toBe(true);
    expect(result.warnings[0].issue).toBe('type_mismatch');
  });

  it('fullyLost when raw is an array (not an object)', () => {
    const result = recoverRecord([1, 2, 3]);

    expect(result.fullyLost).toBe(true);
    expect(result.warnings[0].issue).toBe('type_mismatch');
    expect(result.warnings[0].detail).toContain('array');
  });

  it('fullyLost when raw is boolean', () => {
    const result = recoverRecord(true);

    expect(result.fullyLost).toBe(true);
  });

  // ── 필수 필드 누락 (missing) + 부분 복구 ────────────────────────────────

  it('reports missing for required string field "id"', () => {
    const raw = rawValid();
    delete raw.id;

    const result = recoverRecord(raw);

    expect(result.record.id).toBe('');
    expect(result.fullyLost).toBe(true); // 필수 필드 누락 → fullyLost
    expect(hasWarning(result.warnings, 'id', 'missing')).toBe(true);
  });

  it('reports missing for required string field "timestamp"', () => {
    const raw = rawValid();
    delete raw.timestamp;

    const result = recoverRecord(raw);

    expect(result.record.timestamp).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'timestamp', 'missing')).toBe(true);
  });

  it('reports missing for required string field "mainHexagram"', () => {
    const raw = rawValid();
    delete raw.mainHexagram;

    const result = recoverRecord(raw);

    expect(result.record.mainHexagram).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'mainHexagram', 'missing')).toBe(true);
  });

  it('reports missing for required string field "createdAt"', () => {
    const raw = rawValid();
    delete raw.createdAt;

    const result = recoverRecord(raw);

    expect(result.record.createdAt).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'createdAt', 'missing')).toBe(true);
  });

  it('reports missing for required string field "updatedAt"', () => {
    const raw = rawValid();
    delete raw.updatedAt;

    const result = recoverRecord(raw);

    expect(result.record.updatedAt).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'updatedAt', 'missing')).toBe(true);
  });

  it('reports missing for required number field "viewCount"', () => {
    const raw = rawValid();
    delete raw.viewCount;

    const result = recoverRecord(raw);

    expect(result.record.viewCount).toBe(0);
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'viewCount', 'missing')).toBe(true);
  });

  it('reports missing for required array field "changingLines"', () => {
    const raw = rawValid();
    delete raw.changingLines;

    const result = recoverRecord(raw);

    expect(result.record.changingLines).toEqual([]);
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'changingLines', 'missing')).toBe(true);
  });

  // ── 타입 불일치 (type_mismatch) ──────────────────────────────────────────

  it('reports type_mismatch when id is not a string', () => {
    const raw = rawValid({ id: 123 as unknown as string });

    const result = recoverRecord(raw);

    expect(result.record.id).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'id', 'type_mismatch')).toBe(true);
    expect(result.warnings.find((w) => w.field === 'id')!.rawValue).toBe(123);
  });

  it('reports type_mismatch when viewCount is a string', () => {
    const raw = rawValid({ viewCount: 'not-a-number' as unknown as number });

    const result = recoverRecord(raw);

    expect(result.record.viewCount).toBe(0);
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'viewCount', 'type_mismatch')).toBe(true);
  });

  it('reports type_mismatch when viewCount is NaN', () => {
    const raw = rawValid({ viewCount: NaN });

    const result = recoverRecord(raw);

    expect(result.record.viewCount).toBe(0);
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'viewCount', 'invalid_value')).toBe(true);
  });

  it('reports type_mismatch when changingLines is not an array', () => {
    const raw = rawValid({ changingLines: 'not-array' as unknown as number[] });

    const result = recoverRecord(raw);

    expect(result.record.changingLines).toEqual([]);
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'changingLines', 'type_mismatch')).toBe(true);
  });

  it('reports type_mismatch when changingHexagram is a number (should be string|null)', () => {
    const raw = rawValid({ changingHexagram: 42 as unknown as string | null });

    const result = recoverRecord(raw);

    expect(result.record.changingHexagram).toBeNull();
    // Optional field → should NOT trigger fullyLost
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'changingHexagram', 'type_mismatch')).toBe(true);
  });

  it('reports type_mismatch when aiInterpretation is a number', () => {
    const raw = rawValid({ aiInterpretation: 999 as unknown as string });

    const result = recoverRecord(raw);

    expect(result.record.aiInterpretation).toBe('');
    // Optional field → should NOT trigger fullyLost
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'aiInterpretation', 'type_mismatch')).toBe(true);
  });

  it('reports type_mismatch when freeMemo is a number', () => {
    const raw = rawValid({ freeMemo: 123 as unknown as string });

    const result = recoverRecord(raw);

    expect(result.record.freeMemo).toBe('');
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'freeMemo', 'type_mismatch')).toBe(true);
  });

  it('reports type_mismatch when lastViewedAt is a number', () => {
    const raw = rawValid({ lastViewedAt: 12345 as unknown as string | null });

    const result = recoverRecord(raw);

    expect(result.record.lastViewedAt).toBeNull();
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'lastViewedAt', 'type_mismatch')).toBe(true);
  });

  // ── 빈 문자열 필드 (invalid_value) ────────────────────────────────────────

  it('reports invalid_value when id is empty string', () => {
    const raw = rawValid({ id: '' });

    const result = recoverRecord(raw);

    expect(result.record.id).toBe('');
    expect(result.fullyLost).toBe(true); // id empty → fullyLost (필수 필드에 빈 값은 invalid)
    expect(hasWarning(result.warnings, 'id', 'invalid_value')).toBe(true);
  });

  it('reports invalid_value when mainHexagram is empty string', () => {
    const raw = rawValid({ mainHexagram: '' });

    const result = recoverRecord(raw);

    expect(result.record.mainHexagram).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'mainHexagram', 'invalid_value')).toBe(true);
  });

  it('does NOT report warning for empty optional fields (freeMemo, aiInterpretation, userQuestion)', () => {
    const raw = rawValid({
      freeMemo: '',
      aiInterpretation: '',
      userQuestion: '',
    });

    const result = recoverRecord(raw);

    // Optional string fields accept empty string as valid
    expect(result.record.freeMemo).toBe('');
    expect(result.record.aiInterpretation).toBe('');
    expect(result.record.userQuestion).toBe('');
    expect(result.warnings).toHaveLength(0);
    expect(result.fullyLost).toBe(false);
  });

  // ── changingLines 부분 손상 ──────────────────────────────────────────────

  it('filters non-number elements from changingLines', () => {
    const raw = rawValid({ changingLines: [1, 'two', 3, null, true, 6] as unknown as number[] });

    const result = recoverRecord(raw);

    expect(result.record.changingLines).toEqual([1, 3, 6]);
    expect(result.fullyLost).toBe(false); // 배열 자체는 유효
    expect(hasWarning(result.warnings, 'changingLines[1]', 'type_mismatch')).toBe(true);
    expect(hasWarning(result.warnings, 'changingLines[3]', 'type_mismatch')).toBe(true);
    expect(hasWarning(result.warnings, 'changingLines[4]', 'type_mismatch')).toBe(true);
  });

  it('returns empty array when all changingLines elements are non-number', () => {
    const raw = rawValid({ changingLines: ['a', 'b', 'c'] as unknown as number[] });

    const result = recoverRecord(raw);

    expect(result.record.changingLines).toEqual([]);
    // 3개 warning for each filtered element
    expect(result.warnings.filter((w) => w.field.startsWith('changingLines')).length).toBe(3);
    // fullyLost = false because the array itself was present (even though empty after filter)
    expect(result.fullyLost).toBe(false);
  });

  // ── Nullable 필드: null 유지 ─────────────────────────────────────────────

  it('preserves null for changingHexagram (no warning)', () => {
    const raw = rawValid({ changingHexagram: null });

    const result = recoverRecord(raw);

    expect(result.record.changingHexagram).toBeNull();
    expect(result.warnings).toHaveLength(0);
  });

  it('preserves null for lastViewedAt (no warning)', () => {
    const raw = rawValid({ lastViewedAt: null });

    const result = recoverRecord(raw);

    expect(result.record.lastViewedAt).toBeNull();
    expect(result.warnings).toHaveLength(0);
  });

  // ── Optional 필드 누락 (missing) ──────────────────────────────────────────

  it('reports missing for optional nullable field changingHexagram, defaults to null', () => {
    const raw = rawValid();
    delete (raw as unknown as Record<string, unknown>).changingHexagram;

    const result = recoverRecord(raw);

    expect(result.record.changingHexagram).toBeNull();
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'changingHexagram', 'missing')).toBe(true);
  });

  it('reports missing for optional string field aiInterpretation, defaults to ""', () => {
    const raw = rawValid();
    delete (raw as unknown as Record<string, unknown>).aiInterpretation;

    const result = recoverRecord(raw);

    expect(result.record.aiInterpretation).toBe('');
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'aiInterpretation', 'missing')).toBe(true);
  });

  it('reports missing for optional string field userQuestion, defaults to ""', () => {
    const raw = rawValid();
    delete (raw as unknown as Record<string, unknown>).userQuestion;

    const result = recoverRecord(raw);

    expect(result.record.userQuestion).toBe('');
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'userQuestion', 'missing')).toBe(true);
  });

  it('reports missing for optional string field freeMemo, defaults to ""', () => {
    const raw = rawValid();
    delete (raw as unknown as Record<string, unknown>).freeMemo;

    const result = recoverRecord(raw);

    expect(result.record.freeMemo).toBe('');
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'freeMemo', 'missing')).toBe(true);
  });

  it('reports missing for optional nullable field lastViewedAt, defaults to null', () => {
    const raw = rawValid();
    delete (raw as unknown as Record<string, unknown>).lastViewedAt;

    const result = recoverRecord(raw);

    expect(result.record.lastViewedAt).toBeNull();
    expect(result.fullyLost).toBe(false);
    expect(hasWarning(result.warnings, 'lastViewedAt', 'missing')).toBe(true);
  });

  // ── 복합 손상: 여러 필드 동시 손상 ──────────────────────────────────────

  it('handles multiple missing required fields with all warnings', () => {
    const raw = rawValid();
    delete raw.id;
    delete raw.timestamp;
    delete raw.mainHexagram;

    const result = recoverRecord(raw);

    expect(result.record.id).toBe('');
    expect(result.record.timestamp).toBe('');
    expect(result.record.mainHexagram).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(hasWarning(result.warnings, 'id', 'missing')).toBe(true);
    expect(hasWarning(result.warnings, 'timestamp', 'missing')).toBe(true);
    expect(hasWarning(result.warnings, 'mainHexagram', 'missing')).toBe(true);
  });

  it('handles mixed: required field missing + optional field type_mismatch', () => {
    const raw = rawValid({ aiInterpretation: 42 as unknown as string });
    delete raw.id;

    const result = recoverRecord(raw);

    expect(result.record.id).toBe('');
    expect(result.record.aiInterpretation).toBe('');
    expect(result.fullyLost).toBe(true); // required field missing triggers fullyLost
    expect(hasWarning(result.warnings, 'id', 'missing')).toBe(true);
    expect(hasWarning(result.warnings, 'aiInterpretation', 'type_mismatch')).toBe(true);
  });

  it('handles optional-only damage without fullyLost flag', () => {
    const raw = rawValid();
    delete (raw as unknown as Record<string, unknown>).freeMemo;
    delete (raw as unknown as Record<string, unknown>).aiInterpretation;
    (raw as unknown as Record<string, unknown>).changingHexagram = 999;

    const result = recoverRecord(raw);

    // All required fields intact
    expect(result.record.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.record.mainHexagram).toBe('1. 건(乾)');
    expect(result.record.viewCount).toBe(0);
    // Optional fields recovered
    expect(result.record.freeMemo).toBe('');
    expect(result.record.aiInterpretation).toBe('');
    expect(result.record.changingHexagram).toBeNull();

    // Optional-only damage → NOT fullyLost
    expect(result.fullyLost).toBe(false);
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  it('does not throw for empty object input', () => {
    const result = recoverRecord({});

    expect(result.record.id).toBe('');
    expect(result.fullyLost).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('preserves non-standard extra fields on the returned record', () => {
    // Extra fields on a valid object should be preserved (raw cast)
    const raw = { ...rawValid(), extraField: 'preserved' };
    const result = recoverRecord(raw);

    // The record object has id etc. set explicitly; extra fields from raw
    // are kept because we spread raw into the recovery fields individually
    expect((result.record as unknown as Record<string, unknown>).extraField).toBeUndefined();
    // Note: extraField is not copied because we reconstruct each field explicitly
  });

  it('produces empty default record for fullyLost items', () => {
    const defaults: DivinationRecord = {
      id: '',
      timestamp: '',
      mainHexagram: '',
      changingHexagram: null,
      changingLines: [],
      aiInterpretation: '',
      userQuestion: '',
      freeMemo: '',
      lastViewedAt: null,
      pinnedAt: null,
      viewCount: 0,
      createdAt: '',
      updatedAt: '',
    };

    const result = recoverRecord(null);

    expect(result.record).toEqual(defaults);
    expect(result.fullyLost).toBe(true);
  });
});

// =============================================================================
// recoverRecords (batch)
// =============================================================================

describe('recoverRecords', () => {
  // ── 정상 케이스 ──────────────────────────────────────────────────────────

  it('returns empty array for null input', () => {
    expect(recoverRecords(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(recoverRecords(undefined)).toEqual([]);
  });

  it('returns results for valid array of records', () => {
    const raw = [
      rawValid({ id: 'a1', mainHexagram: '1. 건(乾)' }),
      rawValid({ id: 'b2', mainHexagram: '2. 곤(坤)' }),
    ];

    const results = recoverRecords(raw);

    expect(results).toHaveLength(2);
    expect(results[0].record.id).toBe('a1');
    expect(results[0].record.mainHexagram).toBe('1. 건(乾)');
    expect(results[0].warnings).toHaveLength(0);
    expect(results[0].fullyLost).toBe(false);
    expect(results[1].record.id).toBe('b2');
    expect(results[1].record.mainHexagram).toBe('2. 곤(坤)');
    expect(results[1].warnings).toHaveLength(0);
    expect(results[1].fullyLost).toBe(false);
  });

  it('returns empty array for empty array input', () => {
    expect(recoverRecords([])).toEqual([]);
  });

  // ── 손상된 항목 포함 배열 ────────────────────────────────────────────────

  it('handles mixed valid + corrupted items', () => {
    const valid = rawValid({ id: 'valid-1' });
    const corrupted = null; // fullyLost

    const results = recoverRecords([valid, corrupted]);

    expect(results).toHaveLength(2);
    expect(results[0].record.id).toBe('valid-1');
    expect(results[0].fullyLost).toBe(false);
    expect(results[1].fullyLost).toBe(true);
    expect(results[1].record.id).toBe('');
  });

  it('handles array with all corrupted items', () => {
    const results = recoverRecords([null, undefined, 'string', 42, true]);

    expect(results).toHaveLength(5);
    for (const result of results) {
      expect(result.fullyLost).toBe(true);
    }
  });

  it('handles item with missing required fields in array', () => {
    const raw = rawValid();
    delete raw.id;
    delete raw.viewCount;

    const results = recoverRecords([raw]);

    expect(results).toHaveLength(1);
    expect(results[0].fullyLost).toBe(true);
    expect(results[0].record.id).toBe('');
    expect(results[0].record.viewCount).toBe(0);
    expect(hasWarning(results[0].warnings, 'id', 'missing')).toBe(true);
    expect(hasWarning(results[0].warnings, 'viewCount', 'missing')).toBe(true);
  });

  // ── 배열이 아닌 입력 ──────────────────────────────────────────────────────

  it('returns empty array for non-array non-PackedData input (string)', () => {
    expect(recoverRecords('not an array')).toEqual([]);
  });

  it('returns empty array for non-array non-PackedData input (number)', () => {
    expect(recoverRecords(42)).toEqual([]);
  });

  it('returns empty array for plain object without records field', () => {
    expect(recoverRecords({ key: 'value' })).toEqual([]);
  });

  // ── PackedData 감지 ──────────────────────────────────────────────────────

  it('handles PackedData with records array', () => {
    const packed = {
      schemaVersion: 1,
      records: [
        rawValid({ id: 'p1', mainHexagram: '5. 수(需)' }),
        rawValid({ id: 'p2', mainHexagram: '10. 이(履)' }),
      ],
    };

    const results = recoverRecords(packed);

    expect(results).toHaveLength(2);
    expect(results[0].record.id).toBe('p1');
    expect(results[0].record.mainHexagram).toBe('5. 수(需)');
    expect(results[1].record.id).toBe('p2');
    expect(results[1].record.mainHexagram).toBe('10. 이(履)');
  });

  it('handles PackedData with corrupted items in records', () => {
    const packed = {
      schemaVersion: 1,
      records: [
        rawValid({ id: 'ok-1' }),
        null, // corrupted
        rawValid({ id: 'ok-2' }),
      ],
    };

    const results = recoverRecords(packed);

    expect(results).toHaveLength(3);
    expect(results[0].record.id).toBe('ok-1');
    expect(results[0].fullyLost).toBe(false);
    expect(results[1].fullyLost).toBe(true);
    expect(results[2].record.id).toBe('ok-2');
    expect(results[2].fullyLost).toBe(false);
  });

  it('handles PackedData with empty records array', () => {
    const packed = { schemaVersion: 1, records: [] };
    expect(recoverRecords(packed)).toEqual([]);
  });
});

// =============================================================================
// Integration: recovery + storage compatibility
// =============================================================================

describe('recovery ↔ storage compatibility', () => {
  it('recovered valid record can be serialized and deserialized via JSON', () => {
    const raw = rawValid();
    const result = recoverRecord(raw);

    // Recovered record should serialize without errors
    const json = JSON.stringify(result.record);
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(result.record.id);
    expect(parsed.mainHexagram).toBe(result.record.mainHexagram);
    expect(parsed.viewCount).toBe(result.record.viewCount);
  });

  it('fullyLost recovered record serializes without errors (has valid defaults)', () => {
    const result = recoverRecord(null);

    expect(() => JSON.stringify(result.record)).not.toThrow();

    const json = JSON.stringify(result.record);
    const parsed = JSON.parse(json);
    expect(parsed.changingLines).toEqual([]);
    expect(parsed.viewCount).toBe(0);
  });

  it('can recover a record, then store and retrieve via localStorage', () => {
    const raw = rawValid({
      id: 'integration-test',
      mainHexagram: '30. 이(離)',
    });
    const result = recoverRecord(raw);

    // Store
    localStorage.setItem('__test_recovery_compat', JSON.stringify(result.record));

    // Retrieve
    const stored = localStorage.getItem('__test_recovery_compat')!;
    const parsed = JSON.parse(stored);

    expect(parsed.id).toBe('integration-test');
    expect(parsed.mainHexagram).toBe('30. 이(離)');

    // Clean up
    localStorage.removeItem('__test_recovery_compat');
  });

  it('batch recovery results can be packed as array for storage', () => {
    const rawItems = [
      rawValid({ id: 'batch-1' }),
      null,
      rawValid({ id: 'batch-2' }),
    ];

    const results = recoverRecords(rawItems);
    const records = results.map((r) => r.record);

    expect(records).toHaveLength(3);
    expect(records[0].id).toBe('batch-1');
    expect(records[1].id).toBe(''); // fullyLost default
    expect(records[2].id).toBe('batch-2');

    // All should be JSON-safe
    expect(() => JSON.stringify(records)).not.toThrow();
  });
});
