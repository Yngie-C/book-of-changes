/**
 * 점괘 기록 localStorage 스키마 버전 관리 및 마이그레이션
 *
 * ## 스키마 버전 이력
 *
 * | 버전 | 형식 | 변경사항 |
 * |------|------|----------|
 * | v0   | `DivinationRecord[]` (raw array) | 초기 출시 — 버전 정보 없이 배열 직접 저장 |
 * | v1   | `{ schemaVersion: 1, records: DivinationRecord[] }` | Packed envelope 도입 — 버전 식별 가능, 향후 마이그레이션 기반 |
 *
 * ## 마이그레이션 전략
 *
 * - **지연 감지 (lazy detection)**: localStorage 읽기 시점에 버전 감지 후 필요하면 마이그레이션.
 *   쓰기 시점에는 항상 최신 버전으로 pack한다.
 * - **순차 업그레이드**: v0 → v1 → v2 → ... 각 단계는 독립적인 변환 함수로 구현.
 *   `migrateToLatest()`가 현재 버전에 도달할 때까지 순차 실행.
 * - **비파괴**: 마이그레이션은 읽기 시점에 인메모리에서 수행. 실제 localStorage는
 *   다음 `writeAll()` 호출 시 최신 버전으로 덮어쓴다. 따라서 마이그레이션 도중
 *   오류가 발생해도 원본 데이터는 보존된다.
 */

import type { DivinationRecord } from '@/data/types';
import { recoverRecords } from './recordRecovery';

// ─── Constants ──────────────────────────────────────────────────────────────

/** 현재 스키마 버전. 새 데이터는 항상 이 버전으로 저장된다. */
export const CURRENT_SCHEMA_VERSION = 1;

// ─── Types ──────────────────────────────────────────────────────────────────

/** v1+ packed envelope */
export interface PackedData {
  schemaVersion: number;
  records: DivinationRecord[];
}

/** 마이그레이션 함수 시그니처: 이전 버전 데이터 → 다음 버전 PackedData */
type MigrationFn = (data: unknown) => PackedData;

// ─── Version Detection ─────────────────────────────────────────────────────

/**
 * 저장된 원시 데이터의 스키마 버전을 감지한다.
 *
 * 감지 규칙:
 * - `null` / `undefined` → CURRENT_SCHEMA_VERSION (데이터 없음 = 최신)
 * - 배열 → v0 (초기 raw array 형식)
 * - `{ schemaVersion: N, ... }` → N (packed envelope)
 * - 그 외 객체 → v0 (unknown → 보수적 처리)
 *
 * @param raw - JSON.parse() 결과 또는 null
 * @returns 감지된 스키마 버전 (0 이상의 정수)
 */
export function detectVersion(raw: unknown): number {
  if (raw === null || raw === undefined) {
    return CURRENT_SCHEMA_VERSION;
  }

  if (Array.isArray(raw)) {
    return 0;
  }

  if (typeof raw === 'object' && 'schemaVersion' in (raw as Record<string, unknown>)) {
    const version = (raw as PackedData).schemaVersion;
    return typeof version === 'number' ? version : 0;
  }

  // 알 수 없는 형식 → v0로 간주하고 보수적으로 처리
  return 0;
}

// ─── Record Normalization ───────────────────────────────────────────────────

/**
 * 원시 레코드 객체에 누락된 선택 필드의 기본값을 채운다.
 * 레코드 구조가 완전히 망가진 경우에도 최소한의 유효한 형태로 복구한다.
 */
function normalizeRecord(raw: Record<string, unknown>): DivinationRecord {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : '',
    mainHexagram: typeof raw.mainHexagram === 'string' ? raw.mainHexagram : '',
    changingHexagram:
      raw.changingHexagram === null || typeof raw.changingHexagram === 'string'
        ? raw.changingHexagram
        : null,
    changingLines: Array.isArray(raw.changingLines)
      ? (raw.changingLines as number[]).filter((v) => typeof v === 'number')
      : [],
    aiInterpretation:
      typeof raw.aiInterpretation === 'string' ? raw.aiInterpretation : '',
    userQuestion:
      typeof raw.userQuestion === 'string' ? raw.userQuestion : '',
    freeMemo: typeof raw.freeMemo === 'string' ? raw.freeMemo : '',
    lastViewedAt:
      raw.lastViewedAt === null || typeof raw.lastViewedAt === 'string'
        ? raw.lastViewedAt
        : null,
    viewCount: typeof raw.viewCount === 'number' ? raw.viewCount : 0,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  };
}

// ─── Migration Functions ────────────────────────────────────────────────────

/**
 * v0 → v1 마이그레이션
 *
 * v0는 버전 정보 없이 `DivinationRecord[]` 배열만 저장된 형식.
 * v1은 `{ schemaVersion: 1, records: DivinationRecord[] }` packed envelope.
 *
 * 변환:
 * 1. 배열이 아니면 빈 배열로 처리
 * 2. 각 레코드에 대해 normalizeRecord()로 누락 필드 기본값 채움
 * 3. PackedData envelope로 감싸서 반환
 */
function migrateV0ToV1(data: unknown): PackedData {
  const rawArray: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];

  const records: DivinationRecord[] = rawArray.map((item) => {
    if (item === null || item === undefined || typeof item !== 'object') {
      // 구조가 완전히 망가진 항목은 최소 기본값으로 복구
      return normalizeRecord({});
    }
    return normalizeRecord(item as Record<string, unknown>);
  });

  return {
    schemaVersion: 1,
    records,
  };
}

/**
 * 마이그레이션 체인 레지스트리.
 * 키: 대상 버전, 값: 이전 버전 데이터를 받아 대상 버전으로 변환하는 함수.
 *
 * migrateToLatest()는 `fromVersion + 1` 부터 `CURRENT_SCHEMA_VERSION` 까지
 * 이 레지스트리를 순차 조회하여 마이그레이션을 실행한다.
 *
 * 새 버전 추가 예시 (v2 출시 시):
 *   MIGRATIONS.set(2, migrateV1ToV2);
 */
const MIGRATIONS: Map<number, MigrationFn> = new Map([
  [1, migrateV0ToV1],
]);

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 데이터를 fromVersion부터 CURRENT_SCHEMA_VERSION까지 순차 마이그레이션한다.
 *
 * @param data - 마이그레이션할 원시 데이터
 * @param fromVersion - 시작 스키마 버전 (detectVersion() 결과)
 * @returns 최신 스키마 버전의 PackedData
 */
export function migrateToLatest(
  data: unknown,
  fromVersion: number,
): PackedData {
  let current: unknown = data;

  for (let target = fromVersion + 1; target <= CURRENT_SCHEMA_VERSION; target++) {
    const migrator = MIGRATIONS.get(target);
    if (!migrator) {
      throw new Error(
        `migrateToLatest: no migration registered for target version ${target}`,
      );
    }
    current = migrator(current);
  }

  return current as PackedData;
}

/**
 * DivinationRecord 배열을 최신 버전의 packed envelope JSON 문자열로 직렬화한다.
 *
 * @param records - 저장할 레코드 배열
 * @returns localStorage에 저장 가능한 JSON 문자열
 */
export function pack(records: DivinationRecord[]): string {
  const envelope: PackedData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    records,
  };
  return JSON.stringify(envelope);
}

/**
 * localStorage에서 읽은 원시 문자열을 해석하여 DivinationRecord 배열을 반환한다.
 *
 * 동작:
 * 1. 빈 문자열 / null → 빈 배열
 * 2. JSON 파싱 → 파싱 실패 시 빈 배열 (손상된 데이터)
 * 3. 스키마 버전 감지
 * 4. 필요 시 마이그레이션 실행 (현재 버전까지 순차 업그레이드)
 * 5. 복구(recovery): 각 레코드를 recoverRecord로 검증하여 손상된 필드를
 *    기본값으로 대체하고 진단 경고를 수집한다.
 *    - fullyLost 레코드는 빈 기본값 레코드로 대체
 *    - optional-only 손상은 경고만 남기고 레코드를 유지
 *
 * recovery는 읽기 시점에 인메모리에서만 수행한다.
 * 실제 localStorage는 다음 writeAll() 호출 시 최신 버전으로 덮어쓴다.
 *
 * @param raw - localStorage.getItem() 반환값 (문자열 또는 null)
 * @returns 복구 완료된 DivinationRecord 배열
 */
export function unpack(raw: string | null): DivinationRecord[] {
  if (!raw || raw.trim() === '') {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 손상된 데이터 → 빈 배열 반환 (데이터 손실을 감수하고 앱 안정성 우선)
    return [];
  }

  const version = detectVersion(parsed);

  // 이미 최신 버전이면 마이그레이션 없이 records 추출
  let records: DivinationRecord[];
  if (version === CURRENT_SCHEMA_VERSION) {
    records = (parsed as PackedData).records ?? [];
  } else {
    // 구버전 → 최신 버전으로 마이그레이션
    const migrated = migrateToLatest(parsed, version);
    records = migrated.records;
  }

  // Post-recovery: 각 레코드를 recoverRecord로 검증하여 손상된 필드를 복구
  const recoveryResults = recoverRecords(records);

  return recoveryResults.map((result) => result.record);
}
