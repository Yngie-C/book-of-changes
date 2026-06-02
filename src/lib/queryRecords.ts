/**
 * 점괘 기록 필터링/검색/정렬 유틸리티
 *
 * DivinationRecord[] 배열을 입력받아 다양한 조건으로 필터링/검색/정렬하는
 * 순수 함수들을 제공한다. localStorage나 네트워크에 접근하지 않으므로
 * UI 상태와 localStorage 사이의 중간 레이어로 사용하기 적합하다.
 *
 * useHistoryList 훅 및 HistoryListPage 컴포넌트에서 기록 목록을
 * 사용자에게 보여주기 전에 이 함수들을 통해 가공한다.
 */

import type { DivinationRecord } from '@/data/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** 정렬 기준 */
export type SortField = 'timestamp' | 'viewCount';

/** 정렬 방향 */
export type SortDirection = 'asc' | 'desc';

/** 정렬 옵션 */
export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

/** 검색 + 필터링 옵션 */
export interface QueryOptions {
  /**
   * 검색어.
   * mainHexagram, changingHexagram, aiInterpretation, userQuestion, freeMemo
   * 필드에서 부분 일치 검색을 수행한다. 빈 문자열이면 검색 조건을 무시한다.
   */
  search?: string;

  /**
   * 변괘(變卦) 존재 여부로 필터링.
   * - true: 변괘가 있는 기록만
   * - false: 변괘가 없는 기록만
   * - undefined: 필터링하지 않음
   */
  hasChangingHexagram?: boolean;

  /**
   * AI 해석 존재 여부로 필터링.
   * - true: AI 해석이 있는 기록만
   * - false: AI 해석이 없는 기록만
   * - undefined: 필터링하지 않음
   */
  hasAiInterpretation?: boolean;

  /**
   * 메모 존재 여부로 필터링.
   * - true: 메모가 있는 기록만
   * - false: 메모가 없는 기록만
   * - undefined: 필터링하지 않음
   */
  hasMemo?: boolean;

  /**
   * 특정 본괘 번호로 필터링 (1~64).
   * 예: 1 → '1. 건(乾)'으로 시작하는 모든 기록
   * 예: [1, 2] → 1번과 2번 괘 기록
   */
  hexagramNumbers?: number | number[];

  /** 정렬 옵션. 미지정 시 timestamp desc (최신순) */
  sort?: SortOptions;
}

/** 페이지네이션 입력 */
export interface PaginationInput {
  /** 0-based offset */
  offset: number;
  /** 페이지당 최대 항목 수 */
  limit: number;
}

/** 페이지네이션 결과 */
export interface PaginatedResult<T> {
  /** 현재 페이지 항목 */
  items: T[];
  /** 전체 항목 수 (페이지네이션 적용 전) */
  totalCount: number;
  /** 현재 offset */
  offset: number;
  /** 현재 limit */
  limit: number;
  /** 다음 페이지 존재 여부 */
  hasNextPage: boolean;
  /** 이전 페이지 존재 여부 */
  hasPreviousPage: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** 기본 정렬: 최신순 */
export const DEFAULT_SORT: SortOptions = {
  field: 'timestamp',
  direction: 'desc',
};

// ─── Pure Helpers ───────────────────────────────────────────────────────────

/**
 * 본괘 문자열에서 괘 번호를 추출한다.
 *
 * @param hexagramStr - '1. 건(乾)' 또는 '건(乾)' 형식
 * @returns 괘 번호 (1-64), 실패 시 -1
 */
function extractNumber(hexagramStr: string): number {
  const match = hexagramStr.match(/^(\d+)/);
  if (!match) return -1;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= 64 ? num : -1;
}

/**
 * 검색어로 레코드를 검색한다.
 * mainHexagram, changingHexagram, aiInterpretation, userQuestion, freeMemo에서
 * 대소문자 구분 없이 부분 일치 검색을 수행한다.
 *
 * @param record - 검색 대상 레코드
 * @param query - 검색어
 * @returns 일치 여부
 */
function matchesSearch(record: DivinationRecord, query: string): boolean {
  if (query === '') return true;

  const lowerQuery = query.toLowerCase();

  const searchFields: string[] = [
    record.mainHexagram,
    record.changingHexagram ?? '',
    record.aiInterpretation ?? '',
    record.userQuestion ?? '',
    record.freeMemo ?? '',
  ];

  return searchFields.some(
    (field) => field.toLowerCase().includes(lowerQuery),
  );
}

/**
 * 괘 번호로 레코드를 필터링한다.
 * 본괘 문자열의 첫 번째 숫자만 추출하여 비교한다.
 *
 * @param record - 검사할 레코드
 * @param numbers - 허용할 괘 번호 집합
 * @returns 포함 여부
 */
function matchesHexagramNumbers(
  record: DivinationRecord,
  numbers: Set<number>,
): boolean {
  const num = extractNumber(record.mainHexagram);
  return numbers.has(num);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * DivinationRecord 배열을 주어진 옵션으로 필터링/검색/정렬한다.
 *
 * 모든 조건은 AND 방식으로 결합된다. 즉, search와 hasChangingHexagram이
 * 모두 지정된 경우 두 조건을 모두 만족하는 레코드만 반환된다.
 *
 * 필터는 레코드를 변형하지 않고 새 배열을 반환한다 (불변).
 *
 * @param records - 필터링할 DivinationRecord 배열
 * @param options - 검색/필터링/정렬 옵션
 * @returns 조건에 맞는 레코드의 새 배열
 *
 * @example
 * ```ts
 * // 제목에서 '건'을 포함하고, 메모가 있는 기록을 최신순으로
 * const results = queryRecords(records, {
 *   search: '건',
 *   hasMemo: true,
 *   sort: { field: 'timestamp', direction: 'desc' },
 * });
 * ```
 */
export function queryRecords(
  records: DivinationRecord[],
  options: QueryOptions = {},
): DivinationRecord[] {
  const {
    search = '',
    hasChangingHexagram,
    hasAiInterpretation,
    hasMemo,
    hexagramNumbers,
    sort = DEFAULT_SORT,
  } = options;

  // ── Phase 1: 괘 번호 필터 → Set 변환 (early computation) ──
  const hexagramNumberSet = (() => {
    if (hexagramNumbers === undefined) return null;
    const nums = Array.isArray(hexagramNumbers)
      ? hexagramNumbers
      : [hexagramNumbers];
    return new Set(nums.filter((n) => n >= 1 && n <= 64));
  })();

  // ── Phase 2: 필터링 ──
  let filtered = records;

  // 검색어 필터 (가장 무거운 조건을 먼저)
  if (search !== '') {
    filtered = filtered.filter((r) => matchesSearch(r, search));
  }

  // 변괘 존재 여부 필터
  if (hasChangingHexagram !== undefined) {
    filtered = filtered.filter((r) =>
      hasChangingHexagram
        ? r.changingHexagram !== null && r.changingHexagram !== ''
        : r.changingHexagram === null || r.changingHexagram === '',
    );
  }

  // AI 해석 존재 여부 필터
  if (hasAiInterpretation !== undefined) {
    filtered = filtered.filter((r) =>
      hasAiInterpretation
        ? (r.aiInterpretation ?? '') !== ''
        : (r.aiInterpretation ?? '') === '',
    );
  }

  // 메모 존재 여부 필터
  if (hasMemo !== undefined) {
    filtered = filtered.filter((r) =>
      hasMemo
        ? (r.freeMemo ?? '') !== ''
        : (r.freeMemo ?? '') === '',
    );
  }

  // 괘 번호 필터
  if (hexagramNumberSet !== null) {
    filtered = filtered.filter((r) =>
      matchesHexagramNumbers(r, hexagramNumberSet),
    );
  }

  // ── Phase 3: 정렬 ──
  filtered = [...filtered].sort((a, b) => {
    let comparison: number;

    if (sort.field === 'timestamp') {
      comparison = a.timestamp.localeCompare(b.timestamp);
    } else {
      // viewCount
      comparison = (a.viewCount ?? 0) - (b.viewCount ?? 0);
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

/**
 * 주어진 배열에서 특정 본괘 번호에 속하는 레코드만 반환한다.
 *
 * queryRecords의 hexagramNumbers 옵션을 사용하는 편의 함수.
 *
 * @param records - DivinationRecord 배열
 * @param number - 괘 번호 (1-64)
 * @returns 해당 괘의 레코드 배열
 */
export function filterByHexagram(
  records: DivinationRecord[],
  number: number,
): DivinationRecord[] {
  return queryRecords(records, { hexagramNumbers: number });
}

/**
 * 주어진 배열에서 메모가 있는 레코드만 반환한다.
 *
 * @param records - DivinationRecord 배열
 * @returns 메모가 있는 레코드 배열
 */
export function filterByMemo(
  records: DivinationRecord[],
): DivinationRecord[] {
  return queryRecords(records, { hasMemo: true });
}

/**
 * 주어진 배열에서 검색어로 레코드를 검색한다.
 *
 * @param records - DivinationRecord 배열
 * @param query - 검색어
 * @returns 일치하는 레코드 배열
 */
export function searchRecords(
  records: DivinationRecord[],
  query: string,
): DivinationRecord[] {
  return queryRecords(records, { search: query });
}

// ─── Pagination ──────────────────────────────────────────────────────────────

/**
 * 정렬된 레코드 배열에서 offset/limit 기반 페이지를 추출한다.
 *
 * 입력 배열은 이미 정렬된 상태로 가정하며, 이 함수는 정렬을 수행하지 않는다.
 * queryRecords()와 함께 사용할 때는 queryRecords()가 이미 정렬된 배열을
 * 반환하므로 그 결과를 바로 이 함수에 전달하면 된다.
 *
 * offset이 totalCount를 초과하면 빈 items 배열을 반환한다.
 * limit이 0 이하인 경우에도 빈 배열을 반환한다.
 *
 * @param records - 정렬된 DivinationRecord 배열
 * @param input - offset과 limit을 포함한 페이지네이션 입력
 * @returns 페이지네이션된 결과
 *
 * @example
 * ```ts
 * const all = queryRecords(storageRecords, { search: '건' });
 * const page1 = paginateRecords(all, { offset: 0, limit: 10 });
 * const page2 = paginateRecords(all, { offset: 10, limit: 10 });
 * ```
 */
export function paginateRecords(
  records: DivinationRecord[],
  input: PaginationInput,
): PaginatedResult<DivinationRecord> {
  const { offset, limit } = input;
  const totalCount = records.length;

  // Guard: offset이 음수이거나 limit이 0 이하면 빈 페이지
  if (limit <= 0 || offset < 0) {
    return {
      items: [],
      totalCount,
      offset,
      limit,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  // Guard: offset이 전체 길이를 초과하면 빈 페이지 (다음 페이지 없음)
  if (offset >= totalCount) {
    return {
      items: [],
      totalCount,
      offset,
      limit,
      hasNextPage: false,
      hasPreviousPage: totalCount > 0,
    };
  }

  const end = Math.min(offset + limit, totalCount);
  const items = records.slice(offset, end);

  return {
    items,
    totalCount,
    offset,
    limit,
    hasNextPage: end < totalCount,
    hasPreviousPage: offset > 0,
  };
}
