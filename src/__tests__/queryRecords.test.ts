import { describe, it, expect } from 'vitest';
import {
  queryRecords,
  filterByHexagram,
  filterByMemo,
  searchRecords,
  paginateRecords,
} from '@/lib/queryRecords';
import type { DivinationRecord, CreateRecordInput } from '@/data/types';
import { saveRecord, clearRecords } from '@/lib/storage';
import type { QueryOptions, SortOptions } from '@/lib/queryRecords';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

/** 테스트용 레코드를 생성하고 반환한다 (storage에 저장).
 *  생성 시 saveRecord를 호출하므로 timestamp, freeMemo를 override하려면
 *  이 helper가 반환하는 객체에 직접 반영한다. */
function makeRecord(
  overrides: Partial<CreateRecordInput> & {
    timestamp?: string;
    freeMemo?: string;
  } = {},
): DivinationRecord {
  const { timestamp, freeMemo, ...inputOverrides } = overrides;
  const input = makeInput(inputOverrides);
  const record = saveRecord(input);

  // Override timestamp/freeMemo on the returned object AND in storage
  if (timestamp || freeMemo !== undefined) {
    if (timestamp) record.timestamp = timestamp;
    if (freeMemo !== undefined) record.freeMemo = freeMemo;

    const raw = localStorage.getItem('book-of-changes:records');
    if (raw) {
      const parsed = JSON.parse(raw);
      const idx = parsed.records.findIndex(
        (r: DivinationRecord) => r.id === record.id,
      );
      if (idx !== -1) {
        if (timestamp) parsed.records[idx].timestamp = timestamp;
        if (freeMemo !== undefined) parsed.records[idx].freeMemo = freeMemo;
        localStorage.setItem('book-of-changes:records', JSON.stringify(parsed));
      }
    }
  }

  return record;
}

function timestamp(offsetMinutes: number): string {
  const d = new Date('2026-06-01T12:00:00Z');
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
}

beforeEach(() => {
  clearRecords();
});

// =============================================================================
// queryRecords — 기본 동작
// =============================================================================

describe('queryRecords', () => {
  // ── 정렬 없이 전체 반환 ─────────────────────────────────────────────────

  it('returns all records when no options provided, sorted by timestamp desc', () => {
    const r1 = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const r2 = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const r3 = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(20) });

    const records = [r1, r2, r3];
    const result = queryRecords(records);

    expect(result).toHaveLength(3);
    // 최신순 정렬 (timestamp desc)
    expect(result[0].id).toBe(r3.id);
    expect(result[1].id).toBe(r2.id);
    expect(result[2].id).toBe(r1.id);
  });

  it('returns empty array for empty input', () => {
    expect(queryRecords([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const r1 = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const r2 = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });

    const original = [r1, r2];
    const result = queryRecords(original, { search: 'nothing' });

    // 원본은 그대로
    expect(original).toHaveLength(2);
    // 결과는 새 배열
    expect(result).not.toBe(original);
  });

  // ── 검색어(search) ──────────────────────────────────────────────────────

  it('filters by search in mainHexagram', () => {
    const r1 = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });

    const records = [r1, r1]; // all records returned by storage
    // Use loadRecords for accuracy
    const allRecords = [r1, makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) })];
    // Actually just use loadRecords
    clearRecords();
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const all = [a, b];

    const result = queryRecords(all, { search: '건' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters by search in changingHexagram', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { search: '곤' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters by search in aiInterpretation', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '오늘은 행운이 가득한 날입니다',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { search: '행운' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters by search in userQuestion', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      userQuestion: '오늘 로또 당첨될까요?',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      userQuestion: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { search: '로또' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters by search in freeMemo', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '이 날 면접 합격함!',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      freeMemo: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { search: '면접' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('search is case-insensitive', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: 'HELLO world',
      timestamp: timestamp(0),
    });

    const lower = queryRecords([a], { search: 'hello' });
    const upper = queryRecords([a], { search: 'HELLO' });
    const mixed = queryRecords([a], { search: 'Hello' });

    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
    expect(mixed).toHaveLength(1);
  });

  it('empty search returns all records', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });

    const result = queryRecords([a, b], { search: '' });
    expect(result).toHaveLength(2);
  });

  // ── hasChangingHexagram ─────────────────────────────────────────────────

  it('filters records with changing hexagram (true)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { hasChangingHexagram: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters records without changing hexagram (false)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { hasChangingHexagram: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(b.id);
  });

  it('handles changingHexagram as empty string (treated as no hexagram)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '',
      timestamp: timestamp(0),
    });

    // Empty string should be treated like null (no changing hexagram)
    const result = queryRecords([a], { hasChangingHexagram: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  // ── hasAiInterpretation ─────────────────────────────────────────────────

  it('filters records with AI interpretation (true)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 운세',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { hasAiInterpretation: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters records without AI interpretation (false)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 운세',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { hasAiInterpretation: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(b.id);
  });

  // ── hasMemo ─────────────────────────────────────────────────────────────

  it('filters records with memo (true)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '중요한 점괘',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      freeMemo: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { hasMemo: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters records without memo (false)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '중요한 점괘',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      freeMemo: '',
      timestamp: timestamp(10),
    });

    const result = queryRecords([a, b], { hasMemo: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(b.id);
  });

  // ── hexagramNumbers ─────────────────────────────────────────────────────

  it('filters by single hexagram number', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(20) });

    const result = queryRecords([a, b, c], { hexagramNumbers: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters by multiple hexagram numbers (array)', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(20) });

    const result = queryRecords([a, b, c], { hexagramNumbers: [1, 3] });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.mainHexagram).sort()).toEqual(
      ['1. 건(乾)', '3. 둔(屯)'].sort(),
    );
  });

  it('ignores invalid hexagram numbers (out of range)', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });

    const result = queryRecords([a], { hexagramNumbers: 65 });
    expect(result).toHaveLength(0);
  });

  it('ignores hexagram numbers <= 0', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });

    const result = queryRecords([a], { hexagramNumbers: 0 });
    expect(result).toHaveLength(0);
  });

  it('handles hexagram number as string extraction from mainHexagram', () => {
    // "10. 이(履)" → 10 추출
    const a = makeRecord({ mainHexagram: '10. 이(履)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(10) });

    const result = queryRecords([a, b], { hexagramNumbers: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  // ── sort by timestamp ───────────────────────────────────────────────────

  it('sorts by timestamp desc (default)', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(20) });

    const result = queryRecords([a, c, b]); // 입력 순서 무관
    expect(result[0].id).toBe(c.id);
    expect(result[1].id).toBe(b.id);
    expect(result[2].id).toBe(a.id);
  });

  it('sorts by timestamp asc', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(20) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(0) });

    const sort: SortOptions = { field: 'timestamp', direction: 'asc' };
    const result = queryRecords([a, b, c], { sort });
    expect(result[0].id).toBe(c.id);
    expect(result[1].id).toBe(b.id);
    expect(result[2].id).toBe(a.id);
  });

  // ── sort by viewCount ───────────────────────────────────────────────────

  it('sorts by viewCount desc', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(20) });

    // 수동으로 viewCount 설정
    a.viewCount = 0;
    b.viewCount = 5;
    c.viewCount = 2;

    const sort: SortOptions = { field: 'viewCount', direction: 'desc' };
    const result = queryRecords([a, b, c], { sort });
    expect(result[0].id).toBe(b.id); // viewCount=5
    expect(result[1].id).toBe(c.id); // viewCount=2
    expect(result[2].id).toBe(a.id); // viewCount=0
  });

  it('sorts by viewCount asc', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '3. 둔(屯)', timestamp: timestamp(20) });

    a.viewCount = 5;
    b.viewCount = 0;
    c.viewCount = 2;

    const sort: SortOptions = { field: 'viewCount', direction: 'asc' };
    const result = queryRecords([a, b, c], { sort });
    expect(result[0].id).toBe(b.id); // viewCount=0
    expect(result[1].id).toBe(c.id); // viewCount=2
    expect(result[2].id).toBe(a.id); // viewCount=5
  });

  // ── 복합 필터 (AND 조합) ────────────────────────────────────────────────

  it('combines search + hasChangingHexagram (AND logic)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
      aiInterpretation: '건강이 좋아질 것입니다',
      timestamp: timestamp(10),
    });
    const c = makeRecord({
      mainHexagram: '5. 수(需)',
      changingHexagram: '6. 송(訟)',
      timestamp: timestamp(20),
    });

    // "건"을 포함하면서 변괘가 있는 기록
    const result = queryRecords([a, b, c], {
      search: '건',
      hasChangingHexagram: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id); // "1. 건(乾)" + 변괘 있음
  });

  it('combines hasMemo + hasAiInterpretation (AND logic)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋음',
      freeMemo: '메모',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '좋음',
      freeMemo: '',
      timestamp: timestamp(10),
    });
    const c = makeRecord({
      mainHexagram: '3. 둔(屯)',
      aiInterpretation: '',
      freeMemo: '메모만',
      timestamp: timestamp(20),
    });

    const result = queryRecords([a, b, c], {
      hasAiInterpretation: true,
      hasMemo: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('combines search + hexagramNumbers + hasMemo (triple AND)', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '중요한 운세',
      aiInterpretation: '건강 조심',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '',
      aiInterpretation: '건강 조심',
      timestamp: timestamp(10),
    });
    const c = makeRecord({
      mainHexagram: '2. 곤(坤)',
      freeMemo: '중요한 운세',
      aiInterpretation: '건강 조심',
      timestamp: timestamp(20),
    });

    const result = queryRecords([a, b, c], {
      search: '건강',
      hexagramNumbers: 1,
      hasMemo: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('all filters together return empty when no match', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '',
      freeMemo: '',
      timestamp: timestamp(0),
    });

    const result = queryRecords([a], {
      search: 'nothing',
      hasAiInterpretation: true,
      hasMemo: true,
      hasChangingHexagram: true,
    });
    expect(result).toHaveLength(0);
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────

  it('handles single record with all optional fields empty', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '',
      userQuestion: '',
      changingHexagram: null,
      freeMemo: '',
      timestamp: timestamp(0),
    });

    // Search on empty fields returns nothing for non-empty query
    const result = queryRecords([a], { search: 'anything' });
    expect(result).toHaveLength(0);

    // But empty search returns the record
    const all = queryRecords([a]);
    expect(all).toHaveLength(1);
  });

  it('handles record with null changingHexagram in search', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: null,
      timestamp: timestamp(0),
    });

    // should not throw
    const result = queryRecords([a], { search: '건' });
    expect(result).toHaveLength(1);
  });

  it('handles undefined sort (uses default timestamp desc)', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });

    const result = queryRecords([a, b], {});
    expect(result[0].id).toBe(b.id); // 최신순
  });

  it('stable sort preserves relative order for equal values', () => {
    // Same timestamp → input order preserved
    const ts = timestamp(0);
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: ts });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: ts });

    const result = queryRecords([a, b], {
      sort: { field: 'viewCount', direction: 'asc' },
    });
    // viewCount same (0), input order preserved
    expect(result[0].id).toBe(a.id);
    expect(result[1].id).toBe(b.id);
  });

  it('handles 50 records without performance issues', () => {
    const records: DivinationRecord[] = [];
    for (let i = 0; i < 50; i++) {
      const r = makeRecord({
        mainHexagram: `${(i % 64) + 1}. Test(${i})`,
        timestamp: timestamp(i),
      });
      records.push(r);
    }

    const start = performance.now();
    const result = queryRecords(records, {
      search: 'Test',
      sort: { field: 'timestamp', direction: 'asc' },
    });
    const elapsed = performance.now() - start;

    expect(result).toHaveLength(50);
    // 50 records should process in well under 100ms
    expect(elapsed).toBeLessThan(100);
  });
});

// =============================================================================
// Convenience Functions
// =============================================================================

describe('filterByHexagram', () => {
  it('returns only records matching the given hexagram number', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });
    const c = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(20) });

    const result = filterByHexagram([a, b, c], 1);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual([a.id, c.id].sort());
  });

  it('returns empty array when no records match', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const result = filterByHexagram([a], 99);
    expect(result).toHaveLength(0);
  });
});

describe('filterByMemo', () => {
  it('returns only records with memo', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '메모 있음',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      freeMemo: '',
      timestamp: timestamp(10),
    });
    const c = makeRecord({
      mainHexagram: '3. 둔(屯)',
      freeMemo: '두 번째 메모',
      timestamp: timestamp(20),
    });

    const result = filterByMemo([a, b, c]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual([a.id, c.id].sort());
  });

  it('returns empty when no records have memo', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      freeMemo: '',
      timestamp: timestamp(0),
    });
    expect(filterByMemo([a])).toHaveLength(0);
  });
});

describe('searchRecords', () => {
  it('returns records matching the query string', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '행운이 따릅니다',
      timestamp: timestamp(0),
    });
    const b = makeRecord({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '조심하세요',
      timestamp: timestamp(10),
    });

    const result = searchRecords([a, b], '행운');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('returns all records when query is empty', () => {
    const a = makeRecord({ mainHexagram: '1. 건(乾)', timestamp: timestamp(0) });
    const b = makeRecord({ mainHexagram: '2. 곤(坤)', timestamp: timestamp(10) });

    expect(searchRecords([a, b], '')).toHaveLength(2);
  });

  it('is case insensitive', () => {
    const a = makeRecord({
      mainHexagram: '1. 건(乾)',
      userQuestion: 'HELLO',
      timestamp: timestamp(0),
    });

    expect(searchRecords([a], 'hello')).toHaveLength(1);
    expect(searchRecords([a], 'HELLO')).toHaveLength(1);
    expect(searchRecords([a], 'Hello')).toHaveLength(1);
  });
});

// =============================================================================
// Type exports verification
// =============================================================================

describe('type exports', () => {
  it('exports SortField, SortDirection, SortOptions, QueryOptions', () => {
    // Compile-time verification via usage
    const sort: SortOptions = { field: 'timestamp', direction: 'desc' };
    expect(sort.field).toBe('timestamp');

    const options: QueryOptions = {
      search: 'test',
      hasChangingHexagram: true,
      hasAiInterpretation: false,
      hasMemo: undefined,
      hexagramNumbers: [1, 2],
      sort: { field: 'viewCount', direction: 'asc' },
    };
    expect(options.search).toBe('test');
    expect(options.hasChangingHexagram).toBe(true);
    expect(options.hasAiInterpretation).toBe(false);
  });
});

// =============================================================================
// paginateRecords
// =============================================================================

describe('paginateRecords', () => {
  /** timestamp helper */
  function ts(offsetMinutes: number): string {
    const d = new Date('2026-06-01T12:00:00Z');
    d.setMinutes(d.getMinutes() + offsetMinutes);
    return d.toISOString();
  }

  /** Create lightweight record-like objects for testing */
  function rec(overrides: Partial<DivinationRecord> = {}): DivinationRecord {
    return {
      id: overrides.id ?? crypto.randomUUID(),
      timestamp: overrides.timestamp ?? ts(0),
      mainHexagram: overrides.mainHexagram ?? '1. 건(乾)',
      changingHexagram: overrides.changingHexagram ?? null,
      changingLines: overrides.changingLines ?? [],
      aiInterpretation: overrides.aiInterpretation ?? '',
      userQuestion: overrides.userQuestion ?? '',
      freeMemo: overrides.freeMemo ?? '',
      lastViewedAt: overrides.lastViewedAt ?? null,
      viewCount: overrides.viewCount ?? 0,
      createdAt: overrides.createdAt ?? ts(0),
      updatedAt: overrides.updatedAt ?? ts(0),
    };
  }

  // ── 기본 페이지네이션 ─────────────────────────────────────────────────────

  it('returns first page with correct items and metadata', () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      rec({ id: `r${i}`, mainHexagram: `${i + 1}` }),
    );

    const result = paginateRecords(records, { offset: 0, limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.totalCount).toBe(25);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(10);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.items[0].id).toBe('r0');
    expect(result.items[9].id).toBe('r9');
  });

  it('returns middle page with correct navigation flags', () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      rec({ id: `r${i}` }),
    );

    const result = paginateRecords(records, { offset: 10, limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.totalCount).toBe(25);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.items[0].id).toBe('r10');
    expect(result.items[9].id).toBe('r19');
  });

  it('returns last page with partial items', () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      rec({ id: `r${i}` }),
    );

    const result = paginateRecords(records, { offset: 20, limit: 10 });

    expect(result.items).toHaveLength(5);
    expect(result.totalCount).toBe(25);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.items[0].id).toBe('r20');
    expect(result.items[4].id).toBe('r24');
  });

  it('returns exactly limit items on exact boundary', () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      rec({ id: `r${i}` }),
    );

    const result = paginateRecords(records, { offset: 10, limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.hasNextPage).toBe(false);
    expect(result.items[0].id).toBe('r10');
    expect(result.items[9].id).toBe('r19');
  });

  // ── 엣지 케이스 ───────────────────────────────────────────────────────────

  it('returns empty items for empty input array', () => {
    const result = paginateRecords([], { offset: 0, limit: 10 });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('returns all items when limit exceeds total', () => {
    const records = [
      rec({ id: 'a' }),
      rec({ id: 'b' }),
      rec({ id: 'c' }),
    ];

    const result = paginateRecords(records, { offset: 0, limit: 100 });

    expect(result.items).toHaveLength(3);
    expect(result.totalCount).toBe(3);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('returns empty when offset equals total count', () => {
    const records = [rec({ id: 'a' }), rec({ id: 'b' })];

    const result = paginateRecords(records, { offset: 2, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(2);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('returns empty when offset exceeds total count', () => {
    const records = [rec({ id: 'a' })];

    const result = paginateRecords(records, { offset: 5, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('returns empty when offset exceeds total but total is 0', () => {
    const result = paginateRecords([], { offset: 5, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('returns empty when limit is 0', () => {
    const records = [rec({ id: 'a' }), rec({ id: 'b' })];

    const result = paginateRecords(records, { offset: 0, limit: 0 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(2);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('returns empty when limit is negative', () => {
    const records = [rec({ id: 'a' })];

    const result = paginateRecords(records, { offset: 0, limit: -1 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('returns empty when offset is negative', () => {
    const records = [rec({ id: 'a' })];

    const result = paginateRecords(records, { offset: -1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });

  it('returns single item with limit 1', () => {
    const records = [rec({ id: 'a' }), rec({ id: 'b' }), rec({ id: 'c' })];

    const result = paginateRecords(records, { offset: 1, limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('b');
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('does not mutate original array', () => {
    const records = [rec({ id: 'a' }), rec({ id: 'b' }), rec({ id: 'c' })];

    paginateRecords(records, { offset: 0, limit: 2 });

    expect(records).toHaveLength(3);
    expect(records[0].id).toBe('a');
  });

  // ── 페이지네이션 탐색 시나리오 ────────────────────────────────────────────

  it('sequential page traversal works correctly', () => {
    const records = Array.from({ length: 23 }, (_, i) =>
      rec({ id: `r${i}` }),
    );

    // Page 1
    const page1 = paginateRecords(records, { offset: 0, limit: 10 });
    expect(page1.items[0].id).toBe('r0');
    expect(page1.hasNextPage).toBe(true);
    expect(page1.hasPreviousPage).toBe(false);

    // Page 2
    const page2 = paginateRecords(records, { offset: 10, limit: 10 });
    expect(page2.items[0].id).toBe('r10');
    expect(page2.hasNextPage).toBe(true);
    expect(page2.hasPreviousPage).toBe(true);

    // Page 3 (partial)
    const page3 = paginateRecords(records, { offset: 20, limit: 10 });
    expect(page3.items).toHaveLength(3);
    expect(page3.items[0].id).toBe('r20');
    expect(page3.hasNextPage).toBe(false);
    expect(page3.hasPreviousPage).toBe(true);

    // Page 4 (beyond)
    const page4 = paginateRecords(records, { offset: 30, limit: 10 });
    expect(page4.items).toHaveLength(0);
    expect(page4.hasNextPage).toBe(false);
    expect(page4.hasPreviousPage).toBe(true);
  });

  // ── 대량 데이터 ───────────────────────────────────────────────────────────

  it('handles 50 records pagination without performance issues', () => {
    const records = Array.from({ length: 50 }, (_, i) =>
      rec({ id: `r${i}`, mainHexagram: `${(i % 64) + 1}. Test(${i})` }),
    );

    const start = performance.now();
    const result = paginateRecords(records, { offset: 0, limit: 20 });
    const elapsed = performance.now() - start;

    expect(result.items).toHaveLength(20);
    expect(result.totalCount).toBe(50);
    expect(result.hasNextPage).toBe(true);
    // 50 records should paginate in well under 10ms
    expect(elapsed).toBeLessThan(10);
  });

  // ── queryRecords와 통합 ───────────────────────────────────────────────────

  it('works with queryRecords output (sorted array)', () => {
    const r1 = rec({ id: 'a', mainHexagram: '1. 건(乾)', timestamp: ts(0) });
    const r2 = rec({ id: 'b', mainHexagram: '2. 곤(坤)', timestamp: ts(10) });
    const r3 = rec({ id: 'c', mainHexagram: '1. 건(乾)', timestamp: ts(20) });
    const r4 = rec({ id: 'd', mainHexagram: '3. 둔(屯)', timestamp: ts(30) });
    const r5 = rec({ id: 'e', mainHexagram: '1. 건(乾)', timestamp: ts(40) });

    const all = [r1, r2, r3, r4, r5];

    // Simulate queryRecords filtering (using the already-imported queryRecords)
    const filtered = queryRecords(all, {
      hexagramNumbers: 1, // only 건(乾)
      sort: { field: 'timestamp', direction: 'desc' },
    });
    // Expected: r5 (ts=40), r3 (ts=20), r1 (ts=0) — 3 items

    const page = paginateRecords(filtered, { offset: 0, limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.totalCount).toBe(3);
    expect(page.hasNextPage).toBe(true);
    expect(page.items[0].id).toBe('e'); // newest first
    expect(page.items[1].id).toBe('c');
  });
});
