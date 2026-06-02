import { describe, it, expect } from 'vitest';
import { serializeRecords, deserializeRecords } from '@/lib/serializer';
import type { DivinationRecord } from '@/data/types';

// ─── Test Fixture ───────────────────────────────────────────────────────────

/**
 * 유효한 최소 DivinationRecord 생성 헬퍼
 */
function makeRecord(overrides?: Partial<DivinationRecord>): DivinationRecord {
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
    viewCount: 0,
    createdAt: '2026-06-02T03:00:00.000Z',
    updatedAt: '2026-06-02T03:00:00.000Z',
    ...overrides,
  };
}

// ─── serializeRecords ───────────────────────────────────────────────────────

describe('serializeRecords', () => {
  it('serializes an empty array to "[]" (pretty-printed)', () => {
    const result = serializeRecords([]);
    expect(result).toBe('[]');
  });

  it('serializes a single record to valid JSON', () => {
    const record = makeRecord();
    const json = serializeRecords([record]);

    // 유효한 JSON인지 확인 (파싱 가능해야 함)
    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('round-trips: serialize → deserialize returns original data', () => {
    const records: DivinationRecord[] = [
      makeRecord(),
      makeRecord({
        id: '660e8400-e29b-41d4-a716-446655440001',
        mainHexagram: '2. 곤(坤)',
        changingHexagram: '3. 둔(屯)',
        changingLines: [1, 6],
        aiInterpretation: '',
        userQuestion: '',
      }),
      makeRecord({
        id: '770e8400-e29b-41d4-a716-446655440002',
        mainHexagram: '64. 미제(未濟)',
        changingLines: [],
        freeMemo: '다시 확인 필요',
        lastViewedAt: '2026-06-03T00:00:00.000Z',
        viewCount: 5,
      }),
    ];

    const json = serializeRecords(records);
    const deserialized = deserializeRecords(json);

    expect(deserialized).toHaveLength(3);
    expect(deserialized[0].id).toBe(records[0].id);
    expect(deserialized[0].mainHexagram).toBe(records[0].mainHexagram);
    expect(deserialized[0].changingLines).toEqual(records[0].changingLines);
    expect(deserialized[0].viewCount).toBe(records[0].viewCount);

    // 변괘 있는 레코드 확인
    expect(deserialized[1].changingHexagram).toBe('3. 둔(屯)');
    expect(deserialized[1].changingLines).toEqual([1, 6]);

    // 메모·조회수 확인
    expect(deserialized[2].freeMemo).toBe('다시 확인 필요');
    expect(deserialized[2].viewCount).toBe(5);
  });

  it('preserves all field types including null and empty string', () => {
    const record = makeRecord({
      changingHexagram: null,
      aiInterpretation: '',
      userQuestion: '',
      freeMemo: '',
      lastViewedAt: null,
    });
    const json = serializeRecords([record]);
    const parsed = JSON.parse(json)[0];

    expect(parsed.changingHexagram).toBeNull();
    expect(parsed.aiInterpretation).toBe('');
    expect(parsed.userQuestion).toBe('');
    expect(parsed.freeMemo).toBe('');
    expect(parsed.lastViewedAt).toBeNull();
  });

  it('throws TypeError when given a non-array value', () => {
    expect(() => serializeRecords(null as unknown as DivinationRecord[])).toThrow(
      TypeError,
    );
    expect(() =>
      serializeRecords(undefined as unknown as DivinationRecord[]),
    ).toThrow(TypeError);
    expect(() =>
      serializeRecords('not an array' as unknown as DivinationRecord[]),
    ).toThrow(TypeError);
    expect(() =>
      serializeRecords({} as unknown as DivinationRecord[]),
    ).toThrow(TypeError);
    expect(() =>
      serializeRecords(42 as unknown as DivinationRecord[]),
    ).toThrow(TypeError);
  });
});

// ─── deserializeRecords ─────────────────────────────────────────────────────

describe('deserializeRecords', () => {
  // ── 정상 케이스 ──────────────────────────────────────────────────────────

  it('deserializes valid JSON string to DivinationRecord array', () => {
    const json = JSON.stringify([makeRecord()]);
    const records = deserializeRecords(json);

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(records[0].mainHexagram).toBe('1. 건(乾)');
    expect(records[0].changingLines).toEqual([2, 5]);
    expect(records[0].viewCount).toBe(0);
  });

  it('returns empty array for an empty JSON array', () => {
    const records = deserializeRecords('[]');
    expect(records).toEqual([]);
  });

  it('returns empty array for empty string input', () => {
    const records = deserializeRecords('');
    expect(records).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    const records = deserializeRecords('   \n  \t  ');
    expect(records).toEqual([]);
  });

  it('handles multiple records', () => {
    const records = [
      makeRecord(),
      makeRecord({ id: '660e8400-e29b-41d4-a716-446655440001', mainHexagram: '2. 곤(坤)' }),
    ];
    const json = JSON.stringify(records);
    const deserialized = deserializeRecords(json);

    expect(deserialized).toHaveLength(2);
    expect(deserialized[0].mainHexagram).toBe('1. 건(乾)');
    expect(deserialized[1].mainHexagram).toBe('2. 곤(坤)');
  });

  it('accepts records with optional fields present', () => {
    const record = makeRecord({
      changingHexagram: '5. 수(需)',
      aiInterpretation: 'AI 해석 텍스트',
      userQuestion: '질문입니다',
      freeMemo: '메모입니다',
      lastViewedAt: '2026-06-03T00:00:00.000Z',
    });
    const json = serializeRecords([record]);
    const deserialized = deserializeRecords(json);

    expect(deserialized[0].changingHexagram).toBe('5. 수(需)');
    expect(deserialized[0].aiInterpretation).toBe('AI 해석 텍스트');
    expect(deserialized[0].userQuestion).toBe('질문입니다');
    expect(deserialized[0].freeMemo).toBe('메모입니다');
    expect(deserialized[0].lastViewedAt).toBe('2026-06-03T00:00:00.000Z');
  });

  it('accepts records with absent optional fields (they were undefined in JSON)', () => {
    // JSON으로 직렬화 시 undefined 필드는 누락됨
    const minimal = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2026-06-02T03:00:00.000Z',
      mainHexagram: '1. 건(乾)',
      changingLines: [],
      viewCount: 0,
      createdAt: '2026-06-02T03:00:00.000Z',
      updatedAt: '2026-06-02T03:00:00.000Z',
    };
    const json = JSON.stringify([minimal]);
    const deserialized = deserializeRecords(json);

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0].mainHexagram).toBe('1. 건(乾)');
    // absent optional은 undefined
    expect(deserialized[0].changingHexagram).toBeUndefined();
    expect(deserialized[0].aiInterpretation).toBeUndefined();
  });

  // ── 에러 처리: 입력 타입 ────────────────────────────────────────────────

  it('throws TypeError for non-string input', () => {
    expect(() => deserializeRecords(null as unknown as string)).toThrow(
      TypeError,
    );
    expect(() => deserializeRecords(undefined as unknown as string)).toThrow(
      TypeError,
    );
    expect(() => deserializeRecords(42 as unknown as string)).toThrow(
      TypeError,
    );
    expect(() => deserializeRecords({} as unknown as string)).toThrow(
      TypeError,
    );
    expect(() =>
      deserializeRecords([] as unknown as string),
    ).toThrow(TypeError);
  });

  // ── 에러 처리: JSON 문법 ─────────────────────────────────────────────────

  it('throws SyntaxError for malformed JSON', () => {
    expect(() => deserializeRecords('{invalid json')).toThrow(SyntaxError);
    expect(() => deserializeRecords('["unclosed array"')).toThrow(SyntaxError);
    expect(() => deserializeRecords('not json at all')).toThrow(SyntaxError);
    expect(() => deserializeRecords('[1, 2,')).toThrow(SyntaxError);
  });

  // ── 에러 처리: JSON은 유효하나 배열이 아닌 경우 ───────────────────────────

  it('throws TypeError when JSON parses to a non-array', () => {
    expect(() => deserializeRecords('{"key": "value"}')).toThrow(TypeError);
    expect(() => deserializeRecords('"just a string"')).toThrow(TypeError);
    expect(() => deserializeRecords('42')).toThrow(TypeError);
    expect(() => deserializeRecords('true')).toThrow(TypeError);
    expect(() => deserializeRecords('null')).toThrow(TypeError);
  });

  // ── 에러 처리: 필수 필드 누락 ────────────────────────────────────────────

  it('throws TypeError when item is null inside array', () => {
    expect(() => deserializeRecords('[null]')).toThrow(TypeError);
  });

  it('throws TypeError when item is a primitive inside array', () => {
    expect(() => deserializeRecords('[42]')).toThrow(TypeError);
    expect(() => deserializeRecords('["string"]')).toThrow(TypeError);
    expect(() => deserializeRecords('[true]')).toThrow(TypeError);
  });

  it('throws TypeError when required string field "id" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).id;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    // 에러 메시지에 필드명 포함 확인
    expect(() => deserializeRecords(json)).toThrow(/id/);
  });

  it('throws TypeError when required string field "id" is empty', () => {
    const json = JSON.stringify([makeRecord({ id: '' })]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
  });

  it('throws TypeError when required string field "timestamp" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).timestamp;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/timestamp/);
  });

  it('throws TypeError when required string field "mainHexagram" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).mainHexagram;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/mainHexagram/);
  });

  it('throws TypeError when required string field "createdAt" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).createdAt;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/createdAt/);
  });

  it('throws TypeError when required string field "updatedAt" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).updatedAt;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/updatedAt/);
  });

  it('throws TypeError when required number field "viewCount" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).viewCount;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/viewCount/);
  });

  it('throws TypeError when "viewCount" is a string instead of a number', () => {
    const json = JSON.stringify([makeRecord({ viewCount: '0' as unknown as number })]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/viewCount/);
  });

  it('throws TypeError when required array field "changingLines" is missing', () => {
    const record = makeRecord();
    delete (record as Record<string, unknown>).changingLines;
    const json = JSON.stringify([record]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
    expect(() => deserializeRecords(json)).toThrow(/changingLines/);
  });

  it('throws TypeError when "changingLines" is not an array', () => {
    const json = JSON.stringify([
      makeRecord({ changingLines: 'not array' as unknown as number[] }),
    ]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
  });

  it('throws TypeError when "changingLines" contains non-number elements', () => {
    const json = JSON.stringify([
      makeRecord({ changingLines: [1, 'two', 3] as unknown as number[] }),
    ]);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
  });

  // ── 에러 메시지에 인덱스 포함 확인 ────────────────────────────────────────

  it('error message includes index for the second invalid item', () => {
    const valid = makeRecord();
    const invalid = { ...makeRecord(), id: '' }; // id가 빈 문자열
    const json = JSON.stringify([valid, invalid]);
    expect(() => deserializeRecords(json)).toThrow(/index 1/);
  });

  it('validates all items, not just the first', () => {
    const records = [
      makeRecord(),
      makeRecord({ id: 'b' }),
      // 세 번째 항목이 id 누락
      makeRecord({ id: '' }),
    ];
    const json = JSON.stringify(records);
    expect(() => deserializeRecords(json)).toThrow(TypeError);
  });
});

// ─── Integration: serializer + storage compatibility ────────────────────────

describe('serializer ↔ storage compatibility', () => {
  it('serialized output can be stored and retrieved via localStorage JSON', () => {
    const original: DivinationRecord[] = [
      makeRecord(),
      makeRecord({ id: 'b', mainHexagram: '2. 곤(坤)', changingLines: [] }),
    ];

    // 직렬화
    const json = serializeRecords(original);

    // localStorage에 저장 (실제로는 storage.ts가 이 역할)
    localStorage.setItem('__test_serializer_compat', json);

    // localStorage에서 읽어서 역직렬화
    const raw = localStorage.getItem('__test_serializer_compat')!;
    const deserialized = deserializeRecords(raw);

    expect(deserialized).toHaveLength(2);
    expect(deserialized[0].id).toBe(original[0].id);
    expect(deserialized[1].id).toBe(original[1].id);

    // 정리
    localStorage.removeItem('__test_serializer_compat');
  });
});
