import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectVersion,
  migrateToLatest,
  pack,
  unpack,
  CURRENT_SCHEMA_VERSION,
} from '@/lib/migration';
import type { DivinationRecord } from '@/data/types';
import type { PackedData } from '@/lib/migration';
import {
  saveRecord,
  loadRecords,
  clearRecords,
} from '@/lib/storage';
import type { CreateRecordInput } from '@/data/types';

const STORAGE_KEY = 'book-of-changes:records';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

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

function makeCreateInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

// ─── detectVersion ──────────────────────────────────────────────────────────

describe('detectVersion', () => {
  it('returns CURRENT_SCHEMA_VERSION for null', () => {
    expect(detectVersion(null)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('returns CURRENT_SCHEMA_VERSION for undefined', () => {
    expect(detectVersion(undefined)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('returns 0 for an array (v0 format)', () => {
    expect(detectVersion([])).toBe(0);
    expect(detectVersion([makeRecord()])).toBe(0);
  });

  it('returns the schemaVersion from a PackedData object (v1+)', () => {
    expect(detectVersion({ schemaVersion: 1, records: [] })).toBe(1);
    expect(detectVersion({ schemaVersion: 5, records: [] })).toBe(5);
  });

  it('returns 0 for an unknown plain object (treat as v0)', () => {
    expect(detectVersion({ foo: 'bar' })).toBe(0);
  });

  it('returns 0 for primitive types (treat as v0)', () => {
    expect(detectVersion('string')).toBe(0);
    expect(detectVersion(42)).toBe(0);
    expect(detectVersion(true)).toBe(0);
  });

  it('returns 0 when schemaVersion field is not a number', () => {
    expect(detectVersion({ schemaVersion: 'not-a-number', records: [] })).toBe(0);
  });
});

// ─── migrateToLatest ────────────────────────────────────────────────────────

describe('migrateToLatest', () => {
  describe('v0 → v1 (array → packed envelope)', () => {
    it('migrates a valid v0 array to v1 packed format', () => {
      const v0Data: DivinationRecord[] = [
        makeRecord({ id: 'a1', mainHexagram: '5. 수(需)' }),
        makeRecord({ id: 'b2', mainHexagram: '12. 비(否)', changingLines: [] }),
      ];

      const result = migrateToLatest(v0Data, 0);

      expect(result.schemaVersion).toBe(1);
      expect(result.records).toHaveLength(2);
      expect(result.records[0].id).toBe('a1');
      expect(result.records[0].mainHexagram).toBe('5. 수(需)');
      expect(result.records[0].changingLines).toEqual([2, 5]);
      expect(result.records[1].id).toBe('b2');
      expect(result.records[1].mainHexagram).toBe('12. 비(否)');
      expect(result.records[1].changingLines).toEqual([]);
    });

    it('migrates empty v0 array to v1 with empty records', () => {
      const result = migrateToLatest([], 0);
      expect(result.schemaVersion).toBe(1);
      expect(result.records).toEqual([]);
    });

    it('treats non-array v0 data as empty (safe default)', () => {
      const result = migrateToLatest({ corrupted: true }, 0);
      expect(result.schemaVersion).toBe(1);
      expect(result.records).toEqual([]);
    });

    it('normalizes records missing optional fields with defaults', () => {
      const v0Data: unknown[] = [
        {
          id: 'minimal-1',
          timestamp: '2026-01-01T00:00:00.000Z',
          mainHexagram: '1. 건(乾)',
          changingLines: [1],
          viewCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      const result = migrateToLatest(v0Data, 0);
      expect(result.records[0].id).toBe('minimal-1');
      expect(result.records[0].changingHexagram).toBeNull();
      expect(result.records[0].aiInterpretation).toBe('');
      expect(result.records[0].userQuestion).toBe('');
      expect(result.records[0].freeMemo).toBe('');
      expect(result.records[0].lastViewedAt).toBeNull();
      expect(result.records[0].viewCount).toBe(0);
    });

    it('handles null items in v0 array (recovers with defaults)', () => {
      const v0Data: unknown[] = [null, undefined, 'not-an-object'];

      const result = migrateToLatest(v0Data, 0);
      expect(result.records).toHaveLength(3);

      // All items should be normalized
      for (const record of result.records) {
        expect(record.id).toBe('');
        expect(record.mainHexagram).toBe('');
        expect(record.changingLines).toEqual([]);
        expect(record.viewCount).toBe(0);
      }
    });

    it('preserves all optional fields when present in v0', () => {
      const v0Data: Record<string, unknown>[] = [
        {
          id: 'full-1',
          timestamp: '2025-12-01T00:00:00.000Z',
          mainHexagram: '30. 이(離)',
          changingHexagram: '31. 함(咸)',
          changingLines: [3, 4, 5],
          aiInterpretation: 'AI가 본 운세...',
          userQuestion: '연애운은?',
          freeMemo: '재미있는 결과',
          lastViewedAt: '2025-12-02T00:00:00.000Z',
          viewCount: 3,
          createdAt: '2025-12-01T00:00:00.000Z',
          updatedAt: '2025-12-02T00:00:00.000Z',
        },
      ];

      const result = migrateToLatest(v0Data, 0);
      const r = result.records[0];
      expect(r.id).toBe('full-1');
      expect(r.changingHexagram).toBe('31. 함(咸)');
      expect(r.changingLines).toEqual([3, 4, 5]);
      expect(r.aiInterpretation).toBe('AI가 본 운세...');
      expect(r.userQuestion).toBe('연애운은?');
      expect(r.freeMemo).toBe('재미있는 결과');
      expect(r.lastViewedAt).toBe('2025-12-02T00:00:00.000Z');
      expect(r.viewCount).toBe(3);
    });

    it('preserves changingHexagram = null (not converted to empty string)', () => {
      const v0Data: Record<string, unknown>[] = [
        {
          id: 'no-change',
          timestamp: '2025-01-01T00:00:00.000Z',
          mainHexagram: '1. 건(乾)',
          changingHexagram: null,
          changingLines: [],
          viewCount: 0,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ];

      const result = migrateToLatest(v0Data, 0);
      expect(result.records[0].changingHexagram).toBeNull();
      expect(result.records[0].aiInterpretation).toBe('');
    });

    it('filters non-number elements from changingLines', () => {
      const v0Data: unknown[] = [
        {
          id: 'bad-lines',
          timestamp: '2025-01-01T00:00:00.000Z',
          mainHexagram: '1. 건(乾)',
          changingLines: [1, 'two', 3, null, true],
          viewCount: 0,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ];

      const result = migrateToLatest(v0Data, 0);
      expect(result.records[0].changingLines).toEqual([1, 3]);
    });
  });

  describe('migration chain error handling', () => {
    it('no-ops when fromVersion is higher than CURRENT (forward-compatible)', () => {
      // CURRENT_SCHEMA_VERSION + 1: 이미 최신 이후 → 마이그레이션 없이 반환
      const data = { schemaVersion: 99, records: [] };
      const result = migrateToLatest(data, CURRENT_SCHEMA_VERSION + 1);
      expect(result).toEqual(data);
    });

    it('throws when fromVersion is negative (no registered path for version 0)', () => {
      // 음수 → target = 0 → MIGRATIONS.get(0) → undefined → throw
      expect(() => migrateToLatest([], -1)).toThrow(/no migration registered/);
    });
  });

  describe('idempotency: fromVersion === CURRENT_SCHEMA_VERSION', () => {
    it('returns unchanged when already at latest', () => {
      const data: PackedData = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        records: [makeRecord()],
      };
      // CURRENT_SCHEMA_VERSION → CURRENT_SCHEMA_VERSION → no migration runs
      const result = migrateToLatest(data, CURRENT_SCHEMA_VERSION);
      expect(result).toEqual(data);
    });
  });
});

// ─── pack ───────────────────────────────────────────────────────────────────

describe('pack', () => {
  it('packs records into v1 envelope JSON string', () => {
    const records = [makeRecord()];
    const json = pack(records);
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.records)).toBe(true);
    expect(parsed.records[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('packs empty array correctly', () => {
    const json = pack([]);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.records).toEqual([]);
  });

  it('packs multiple records', () => {
    const records = [
      makeRecord({ id: 'a' }),
      makeRecord({ id: 'b' }),
      makeRecord({ id: 'c' }),
    ];
    const json = pack(records);
    const parsed = JSON.parse(json);
    expect(parsed.records).toHaveLength(3);
    expect(parsed.records[0].id).toBe('a');
    expect(parsed.records[1].id).toBe('b');
    expect(parsed.records[2].id).toBe('c');
  });
});

// ─── unpack ─────────────────────────────────────────────────────────────────

describe('unpack', () => {
  it('returns empty array for null input', () => {
    expect(unpack(null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(unpack('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(unpack('   \n  \t  ')).toEqual([]);
  });

  it('returns empty array for corrupt JSON', () => {
    expect(unpack('{not valid json!!!')).toEqual([]);
    expect(unpack('[1, 2,')).toEqual([]);
    expect(unpack('garbage string')).toEqual([]);
  });

  it('unpacks v1 packed envelope', () => {
    const envelope: PackedData = {
      schemaVersion: 1,
      records: [makeRecord()],
    };
    const json = JSON.stringify(envelope);
    const result = unpack(json);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('migrates v0 raw array to current version', () => {
    const v0Data = [makeRecord()];
    const json = JSON.stringify(v0Data);

    const result = unpack(json);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('handles v0 empty array', () => {
    const result = unpack('[]');
    expect(result).toEqual([]);
  });

  it('handles current version passthrough (no migration needed)', () => {
    const envelope: PackedData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      records: [
        makeRecord({ id: 'current-rec', mainHexagram: '10. 이(履)' }),
      ],
    };
    const result = unpack(JSON.stringify(envelope));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('current-rec');
    expect(result[0].mainHexagram).toBe('10. 이(履)');
  });

  it('preserves all record fields through pack → unpack round-trip', () => {
    const original: DivinationRecord[] = [
      makeRecord({
        id: 'test-1',
        mainHexagram: '23. 박(剝)',
        changingHexagram: '24. 복(復)',
        changingLines: [1, 4, 6],
        aiInterpretation: '상세한 AI 해석...',
        userQuestion: '건강운이 궁금해요',
        freeMemo: '기억할 것',
        lastViewedAt: '2026-06-03T12:00:00.000Z',
        viewCount: 7,
      }),
    ];

    const packed = pack(original);
    const unpacked = unpack(packed);

    expect(unpacked).toHaveLength(1);
    const r = unpacked[0];
    expect(r.id).toBe('test-1');
    expect(r.mainHexagram).toBe('23. 박(剝)');
    expect(r.changingHexagram).toBe('24. 복(復)');
    expect(r.changingLines).toEqual([1, 4, 6]);
    expect(r.aiInterpretation).toBe('상세한 AI 해석...');
    expect(r.userQuestion).toBe('건강운이 궁금해요');
    expect(r.freeMemo).toBe('기억할 것');
    expect(r.lastViewedAt).toBe('2026-06-03T12:00:00.000Z');
    expect(r.viewCount).toBe(7);
    expect(r.timestamp).toBe('2026-06-02T03:00:00.000Z');
    expect(r.createdAt).toBe('2026-06-02T03:00:00.000Z');
    expect(r.updatedAt).toBe('2026-06-02T03:00:00.000Z');
  });

  it('preserves null and empty-string optional fields through round-trip', () => {
    const original: DivinationRecord[] = [
      makeRecord({
        changingHexagram: null,
        aiInterpretation: '',
        userQuestion: '',
        freeMemo: '',
        lastViewedAt: null,
      }),
    ];

    const unpacked = unpack(pack(original));
    expect(unpacked[0].changingHexagram).toBeNull();
    expect(unpacked[0].aiInterpretation).toBe('');
    expect(unpacked[0].userQuestion).toBe('');
    expect(unpacked[0].freeMemo).toBe('');
    expect(unpacked[0].lastViewedAt).toBeNull();
  });
});

// ─── Integration with storage.ts ─────────────────────────────────────────────

describe('migration integration with storage.ts', () => {
  beforeEach(() => {
    clearRecords();
  });

  it('saves records in v1 packed format via saveRecord', () => {
    saveRecord(makeCreateInput());
    const raw = localStorage.getItem(STORAGE_KEY)!;
    const parsed = JSON.parse(raw);

    expect(parsed.schemaVersion).toBe(1);
    expect(Array.isArray(parsed.records)).toBe(true);
    expect(parsed.records).toHaveLength(1);
  });

  it('loadRecords reads v1 packed format correctly', () => {
    saveRecord(makeCreateInput({ mainHexagram: '5. 수(需)' }));
    const records = loadRecords();

    expect(records).toHaveLength(1);
    expect(records[0].mainHexagram).toBe('5. 수(需)');
  });

  it('loadRecords migrates v0 array data on read', () => {
    // Simulate legacy v0 data in localStorage
    const v0Data = [
      makeRecord({
        id: 'v0-legacy',
        mainHexagram: '18. 고(蠱)',
        changingLines: [2],
      }),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v0Data));

    const records = loadRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('v0-legacy');
    expect(records[0].mainHexagram).toBe('18. 고(蠱)');

    // Next write upgrades to v1 format
    saveRecord(makeCreateInput({ mainHexagram: '19. 임(臨)' }));

    const all = loadRecords();
    expect(all).toHaveLength(2);
    expect(all[0].mainHexagram).toBe('19. 임(臨)'); // newest first
    expect(all[1].mainHexagram).toBe('18. 고(蠱)');

    // Verify stored format is now v1
    const raw = localStorage.getItem(STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('loadRecords handles corrupted v0 data gracefully (returns empty)', () => {
    localStorage.setItem(STORAGE_KEY, '{corrupt!json');
    const records = loadRecords();
    expect(records).toEqual([]);
  });

  it('loadRecords handles non-array v0 data (was stored as object)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notAnArray: true }));
    const records = loadRecords();
    // migrateToLatest treats non-array v0 data as empty → returns []
    expect(records).toEqual([]);
  });

  it('clearRecords removes v1 packed data', () => {
    saveRecord(makeCreateInput());
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

    clearRecords();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearRecords removes v0 legacy data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeRecord()]));
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

    clearRecords();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('full storage lifecycle: save → migrate → reload → delete', () => {
    // Step 1: Simulate legacy v0 data
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        makeRecord({ id: 'legacy-1', mainHexagram: '42. 익(益)' }),
      ]),
    );

    // Step 2: Read via storage.ts (triggers in-memory migration)
    let records = loadRecords();
    expect(records).toHaveLength(1);
    expect(records[0].mainHexagram).toBe('42. 익(益)');

    // Step 3: Add new record → writeAll() packs in v1 format
    const created = saveRecord(
      makeCreateInput({ mainHexagram: '43. 쾌(夬)' }),
    );
    expect(created.id).toBeTruthy();

    records = loadRecords();
    expect(records).toHaveLength(2);
    // newest first
    expect(records[0].mainHexagram).toBe('43. 쾌(夬)');
    expect(records[1].mainHexagram).toBe('42. 익(益)');

    // Step 4: Verify stored format is v1
    const raw = localStorage.getItem(STORAGE_KEY)!;
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.records).toHaveLength(2);

    // Step 5: Delete legacy record
    records = loadRecords();
    const legacyRecord = records.find((r) => r.id === 'legacy-1')!;
    localStorage.setItem(
      STORAGE_KEY,
      pack(records.filter((r) => r.id !== legacyRecord.id)),
    );

    records = loadRecords();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(created.id);
  });

  it('preserves data integrity across multiple save/load cycles', () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      ids.push(
        saveRecord(makeCreateInput({ mainHexagram: `${i + 1}. test` })).id,
      );
    }

    const records = loadRecords();
    expect(records).toHaveLength(10);
    // newest first — last created has the largest index
    for (let i = 0; i < 10; i++) {
      expect(records[i].id).toBe(ids[9 - i]);
    }
  });
});

// ─── Recovery Integration: unpack() with corrupt data ────────────────────────

describe('unpack recovery integration', () => {
  it('recovers required field "id" missing → defaults to ""', () => {
    const record = { ...makeRecord() };
    delete (record as Record<string, unknown>).id;

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('');
    expect(result[0].mainHexagram).toBe('1. 건(乾)'); // other fields intact
  });

  it('recovers required field "viewCount" missing → defaults to 0', () => {
    const record = { ...makeRecord() };
    delete (record as Record<string, unknown>).viewCount;

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].viewCount).toBe(0);
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('recovers required field "changingLines" missing → defaults to []', () => {
    const record = { ...makeRecord() };
    delete (record as Record<string, unknown>).changingLines;

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].changingLines).toEqual([]);
  });

  it('recovers "changingLines" with non-number elements → filters them out', () => {
    const record = makeRecord({
      changingLines: [1, 'two', 3, null, true, 6] as unknown as number[],
    });

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].changingLines).toEqual([1, 3, 6]);
  });

  it('recovers type_mismatch: "viewCount" as string → defaults to 0', () => {
    const record = makeRecord({ viewCount: 'not-number' as unknown as number });

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].viewCount).toBe(0);
  });

  it('recovers optional field "changingHexagram" as number → defaults to null', () => {
    const record = makeRecord({
      changingHexagram: 42 as unknown as string | null,
    });

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].changingHexagram).toBeNull();
    // Optional damage → record keeps all required fields
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result[0].mainHexagram).toBe('1. 건(乾)');
  });

  it('recovers optional field "freeMemo" missing → defaults to ""', () => {
    const record = { ...makeRecord() };
    delete (record as Record<string, unknown>).freeMemo;

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].freeMemo).toBe('');
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('handles mixed valid + corrupt records', () => {
    const valid = makeRecord({ id: 'valid-1', mainHexagram: '1. 건(乾)' });
    // Corrupt record: id and viewCount completely broken
    const corrupt = {
      mainHexagram: '2. 곤(坤)',
      timestamp: '2026-01-01T00:00:00.000Z',
      changingLines: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const packed = JSON.stringify({
      schemaVersion: 1,
      records: [valid, corrupt],
    });
    const result = unpack(packed);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('valid-1');
    expect(result[0].viewCount).toBe(0);
    // Corrupt record recovers: id defaults to "", viewCount to 0
    expect(result[1].id).toBe('');
    expect(result[1].viewCount).toBe(0);
    expect(result[1].mainHexagram).toBe('2. 곤(坤)');
    expect(result[1].changingLines).toEqual([]);
  });

  it('recovers v0 data with corrupt records through migration + recovery', () => {
    const valid = makeRecord({ id: 'v0-ok', mainHexagram: '10. 이(履)' });
    // v0 corrupt: missing id
    const corrupt = {
      timestamp: '2026-01-01T00:00:00.000Z',
      mainHexagram: '20. 관(觀)',
      changingLines: [1],
      viewCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const result = unpack(JSON.stringify([valid, corrupt]));

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('v0-ok');
    expect(result[1].id).toBe('');
    expect(result[1].mainHexagram).toBe('20. 관(觀)');
    expect(result[1].changingLines).toEqual([1]);
  });

  it('preserves changingHexagram = null through recovery', () => {
    const record = makeRecord({ changingHexagram: null });

    const packed = JSON.stringify({ schemaVersion: 1, records: [record] });
    const result = unpack(packed);

    expect(result).toHaveLength(1);
    expect(result[0].changingHexagram).toBeNull();
  });

  it('returns empty array for fully corrupt JSON (unparseable)', () => {
    expect(unpack('not json!!!')).toEqual([]);
    expect(unpack('{broken')).toEqual([]);
  });

  it('returns empty array for null/empty input', () => {
    expect(unpack(null)).toEqual([]);
    expect(unpack('')).toEqual([]);
    expect(unpack('   ')).toEqual([]);
  });
});

// ─── End-to-end: loadRecords with recovery ───────────────────────────────────

describe('storage CRUD with recovery through unpack', () => {
  beforeEach(() => {
    clearRecords();
  });

  it('loadRecords recovers corrupt localStorage data', () => {
    // Manually write corrupt data to localStorage: missing id, string viewCount
    const corruptRecord = {
      timestamp: '2026-06-01T00:00:00.000Z',
      mainHexagram: '50. 정(鼎)',
      changingLines: [3],
      viewCount: 'bad',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    const v1Packed = JSON.stringify({
      schemaVersion: 1,
      records: [corruptRecord],
    });
    localStorage.setItem(STORAGE_KEY, v1Packed);

    const records = loadRecords();

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('');
    expect(records[0].mainHexagram).toBe('50. 정(鼎)');
    expect(records[0].viewCount).toBe(0);
    expect(records[0].changingLines).toEqual([3]);
  });

  it('loadRecords recovers v0 corrupt data through full pipeline', () => {
    // v0 array with a corrupt item (null inside the array)
    const valid = makeRecord({ id: 'v0-valid', mainHexagram: '1. 건(乾)' });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([valid, null]),
    );

    const records = loadRecords();

    expect(records).toHaveLength(2);
    expect(records[0].id).toBe('v0-valid');
    expect(records[0].mainHexagram).toBe('1. 건(乾)');
    // null item → fullyLost → all defaults
    expect(records[1].id).toBe('');
    expect(records[1].mainHexagram).toBe('');
    expect(records[1].changingLines).toEqual([]);
    expect(records[1].viewCount).toBe(0);
  });

  it('loadRecords recovers PackedData with corrupt records field', () => {
    // PackedData where records is not an array
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, records: 'not-an-array' }),
    );

    const records = loadRecords();

    // recoverRecords sees non-array records → returns []
    // then unpack maps results → []
    expect(records).toEqual([]);
  });
});

// ─── Schema Version Constant ─────────────────────────────────────────────────

describe('CURRENT_SCHEMA_VERSION', () => {
  it('is a positive integer', () => {
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(CURRENT_SCHEMA_VERSION)).toBe(true);
  });
});
