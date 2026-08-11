/**
 * 점괘 기록 손상 데이터 복구 유틸리티
 *
 * localStorage에 저장된 점괘 데이터가 다양한 원인(JSON 파싱 실패, 필드 누락,
 * 타입 불일치 등)으로 손상되었을 때 감지하고 복구하는 로직을 제공한다.
 *
 * 복구 전략:
 * - 구조적으로 복구 가능한 필드는 기본값으로 대체
 * - 완전히 손상된 항목(fullyLost=true)은 모든 필드를 기본값으로 채워 반환
 * - 복구 불가능한 손상은 빈 결과로 fallback
 * - 각 복구 작업마다 진단 경고(warning)를 함께 반환하여 디버깅 가능
 */

import type { DivinationRecord } from '@/data/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** 필드별 손상 유형 */
export type RecoveryIssue =
  | 'missing'       // 필드가 완전히 누락됨
  | 'type_mismatch' // 필드는 있으나 타입이 올바르지 않음
  | 'invalid_value' // 타입은 맞으나 값이 유효하지 않음 (예: 빈 문자열)

/** 단일 필드 복구 진단 정보 */
export interface RecoveryWarning {
  /** 손상된 필드명 */
  field: string
  /** 손상 유형 */
  issue: RecoveryIssue
  /** 사람이 읽을 수 있는 상세 설명 */
  detail: string
  /** raw 값 (디버깅용, optional) */
  rawValue?: unknown
}

/** 단일 레코드 복구 결과 */
export interface RecoveryResult {
  /** 복구된 레코드 (fullyLost=true인 경우 모든 필드가 기본값) */
  record: DivinationRecord
  /** 복구 과정에서 발생한 경고 목록 */
  warnings: RecoveryWarning[]
  /** true: 구조가 완전히 손상되어 모든 필드를 기본값으로 대체함 */
  fullyLost: boolean
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_RECORD: DivinationRecord = {
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

// ─── Field-Level Recovery Helpers ───────────────────────────────────────────

/**
 * 문자열 필드 복구
 * - string 타입 + 비어있지 않음 → 그대로 사용
 * - string 타입이지만 빈 문자열 → invalid_value 경고, 빈 문자열 유지
 * - 타입 불일치 → type_mismatch 경고, 빈 문자열로 대체
 * - undefined → missing 경고, 빈 문자열로 대체
 */
function recoverString(
  raw: Record<string, unknown>,
  field: string,
  warnings: RecoveryWarning[],
): string {
  const value = raw[field];

  if (value === undefined) {
    warnings.push({
      field,
      issue: 'missing',
      detail: `Required string field '${field}' is missing — defaulting to ""`,
      rawValue: undefined,
    });
    return '';
  }

  if (typeof value !== 'string') {
    warnings.push({
      field,
      issue: 'type_mismatch',
      detail: `Field '${field}' expected string, got ${typeof value} — defaulting to ""`,
      rawValue: value,
    });
    return '';
  }

  if (value === '') {
    warnings.push({
      field,
      issue: 'invalid_value',
      detail: `Field '${field}' is an empty string — keeping as-is`,
      rawValue: value,
    });
    return '';
  }

  return value;
}

/**
 * 숫자 필드 복구
 * - number 타입 → 그대로 사용
 * - number 타입이지만 NaN → invalid_value 경고, 0으로 대체
 * - 타입 불일치 → type_mismatch 경고, 0으로 대체
 * - undefined → missing 경고, 0으로 대체
 */
function recoverNumber(
  raw: Record<string, unknown>,
  field: string,
  warnings: RecoveryWarning[],
): number {
  const value = raw[field];

  if (value === undefined) {
    warnings.push({
      field,
      issue: 'missing',
      detail: `Required number field '${field}' is missing — defaulting to 0`,
      rawValue: undefined,
    });
    return 0;
  }

  if (typeof value !== 'number') {
    warnings.push({
      field,
      issue: 'type_mismatch',
      detail: `Field '${field}' expected number, got ${typeof value} — defaulting to 0`,
      rawValue: value,
    });
    return 0;
  }

  if (Number.isNaN(value)) {
    warnings.push({
      field,
      issue: 'invalid_value',
      detail: `Field '${field}' is NaN — defaulting to 0`,
      rawValue: value,
    });
    return 0;
  }

  return value;
}

/**
 * changingLines 배열 필드 복구
 * - 배열 → 각 요소가 number인지 검증, 숫자 아닌 요소는 필터링
 * - undefined → missing 경고, 빈 배열로 대체
 * - 타입 불일치 → type_mismatch 경고, 빈 배열로 대체
 */
function recoverChangingLines(
  raw: Record<string, unknown>,
  warnings: RecoveryWarning[],
): number[] {
  const field = 'changingLines';
  const value = raw[field];

  if (value === undefined) {
    warnings.push({
      field,
      issue: 'missing',
      detail: `Required array field '${field}' is missing — defaulting to []`,
      rawValue: undefined,
    });
    return [];
  }

  if (!Array.isArray(value)) {
    warnings.push({
      field,
      issue: 'type_mismatch',
      detail: `Field '${field}' expected array, got ${typeof value} — defaulting to []`,
      rawValue: value,
    });
    return [];
  }

  const filtered: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] === 'number') {
      filtered.push(value[i]);
    } else {
      warnings.push({
        field: `${field}[${i}]`,
        issue: 'type_mismatch',
        detail: `Element ${field}[${i}] expected number, got ${typeof value[i]} — filtered out`,
        rawValue: value[i],
      });
    }
  }

  return filtered;
}

/**
 * Nullable 문자열 필드 복구 (changingHexagram, lastViewedAt)
 * - null → 그대로 null (정상)
 * - string → 그대로 사용
 * - undefined → missing 경고, null로 대체
 * - 타입 불일치 → type_mismatch 경고, null로 대체
 */
function recoverNullableString(
  raw: Record<string, unknown>,
  field: string,
  warnings: RecoveryWarning[],
): string | null {
  const value = raw[field];

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    warnings.push({
      field,
      issue: 'missing',
      detail: `Optional nullable string field '${field}' is missing — defaulting to null`,
      rawValue: undefined,
    });
    return null;
  }

  warnings.push({
    field,
    issue: 'type_mismatch',
    detail: `Field '${field}' expected string or null, got ${typeof value} — defaulting to null`,
    rawValue: value,
  });
  return null;
}

/**
 * Optional 문자열 필드 복구 (aiInterpretation, userQuestion, freeMemo)
 * - string → 그대로 사용
 * - string이지만 빈 문자열 → 그대로 사용 (정상)
 * - undefined → missing 경고, 빈 문자열로 대체
 * - 타입 불일치 → type_mismatch 경고, 빈 문자열로 대체
 */
function recoverOptionalString(
  raw: Record<string, unknown>,
  field: string,
  warnings: RecoveryWarning[],
): string {
  const value = raw[field];

  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    warnings.push({
      field,
      issue: 'missing',
      detail: `Optional string field '${field}' is missing — defaulting to ""`,
      rawValue: undefined,
    });
    return '';
  }

  warnings.push({
    field,
    issue: 'type_mismatch',
    detail: `Field '${field}' expected string, got ${typeof value} — defaulting to ""`,
    rawValue: value,
  });
  return '';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * 단일 점괘 레코드를 복구한다.
 *
 * 입력이 null, undefined, 원시 타입인 경우 fullyLost=true로 표시하고
 * 모든 필드를 기본값으로 채운 레코드를 반환한다.
 *
 * 객체인 경우 각 필드를 개별 검증하여:
 * - 필수 필드가 누락/타입 불일치면 경고를 남기고 기본값으로 대체
 * - 선택 필드가 누락되면 경고를 남기고 적절한 기본값(null / 빈 문자열)으로 대체
 *
 * @param raw - localStorage에서 JSON.parse()한 원시 데이터 항목
 * @returns 복구된 레코드 + 진단 정보
 */
export function recoverRecord(raw: unknown): RecoveryResult {
  const warnings: RecoveryWarning[] = [];

  // 완전히 손상된 입력: null, undefined, 원시 타입
  if (raw === null || raw === undefined) {
    return {
      record: { ...DEFAULT_RECORD },
      warnings: [
        {
          field: '(entire record)',
          issue: 'missing',
          detail: `Record is ${raw} — all fields defaulted`,
          rawValue: raw,
        },
      ],
      fullyLost: true,
    };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      record: { ...DEFAULT_RECORD },
      warnings: [
        {
          field: '(entire record)',
          issue: 'type_mismatch',
          detail: `Record is ${typeof raw}${Array.isArray(raw) ? ' (array)' : ''}, expected object — all fields defaulted`,
          rawValue: raw,
        },
      ],
      fullyLost: true,
    };
  }

  const obj = raw as Record<string, unknown>;

  // 필수 문자열 필드 복구
  const id = recoverString(obj, 'id', warnings);
  const timestamp = recoverString(obj, 'timestamp', warnings);
  const mainHexagram = recoverString(obj, 'mainHexagram', warnings);
  const createdAt = recoverString(obj, 'createdAt', warnings);
  const updatedAt = recoverString(obj, 'updatedAt', warnings);

  // 필수 숫자 필드 복구
  const viewCount = recoverNumber(obj, 'viewCount', warnings);

  // 필수 배열 필드 복구
  const changingLines = recoverChangingLines(obj, warnings);

  // 선택 필드 복구
  const changingHexagram = recoverNullableString(obj, 'changingHexagram', warnings);
  const aiInterpretation = recoverOptionalString(obj, 'aiInterpretation', warnings);
  const userQuestion = recoverOptionalString(obj, 'userQuestion', warnings);
  const freeMemo = recoverOptionalString(obj, 'freeMemo', warnings);
  const lastViewedAt = recoverNullableString(obj, 'lastViewedAt', warnings);
  const pinnedAt = recoverNullableString(obj, 'pinnedAt', warnings);

  // 완전 손실 판단: 필수 필드 자체에 missing, type_mismatch, invalid_value가 있으면 fullyLost
  // 하위 요소 warning (예: changingLines[0] type_mismatch)은 fullyLost로 간주하지 않음 — 배열 구조는 살아있음
  const REQUIRED_FIELDS = [
    'id',
    'timestamp',
    'mainHexagram',
    'createdAt',
    'updatedAt',
    'viewCount',
    'changingLines',
  ];
  const fullyLost = warnings.some(
    (w) => REQUIRED_FIELDS.includes(w.field),
  );

  return {
    record: {
      id,
      timestamp,
      mainHexagram,
      changingHexagram,
      changingLines,
      aiInterpretation,
      userQuestion,
      freeMemo,
      lastViewedAt,
      pinnedAt,
      viewCount,
      createdAt,
      updatedAt,
    },
    warnings,
    fullyLost,
  };
}

/**
 * 점괘 기록 배열(또는 원시 JSON 파싱 결과)을 복구한다.
 *
 * 입력 처리:
 * 1. null / undefined → 빈 배열
 * 2. 배열 → 각 요소에 대해 recoverRecord 호출
 * 3. 배열이 아닌 값 → 빈 배열 (구조적 손상)
 *
 * @param raw - localStorage에서 JSON.parse()한 결과물 (배열 또는 PackedData)
 * @returns 복구된 RecoveryResult 배열
 */
export function recoverRecords(raw: unknown): RecoveryResult[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw)) {
    // PackedData인지 확인: records 필드가 있는 객체
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.records)) {
        return (obj.records as unknown[]).map(recoverRecord);
      }
    }
    // 배열도 아니고 PackedData도 아님 → 빈 결과
    return [];
  }

  return (raw as unknown[]).map(recoverRecord);
}
