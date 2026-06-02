/**
 * localStorage 기반 점술 기록 CRUD 유틸리티
 *
 * 키: 'book-of-changes:records'
 * 저장 형식: DivinationRecord[] (JSON 배열)
 *
 * 제약사항:
 * - localStorage 5MB 한계 내에서 운영
 * - 최대 50건 이상에서도 성능 저하 없어야 함
 * - 기록 자동 삭제 없음 (사용자 명시적 삭제만 허용)
 */

import type {
  DivinationRecord,
  CreateRecordInput,
  UpdateRecordInput,
} from '@/data/types';
import { pack, unpack, type PackedData } from './migration';
import { queryRecords, type QueryOptions } from './queryRecords';

const STORAGE_KEY = 'book-of-changes:records';
const MAX_RECORDS = 50;

/**
 * QuotaExceededError 발생 시 사용자 알림용 메시지.
 * UI 컴포넌트에서 이 상수를 참조하여 토스트/다이얼로그를 표시할 수 있다.
 */
export const STORAGE_QUOTA_EXCEEDED_MESSAGE =
  'localStorage 저장 공간이 부족합니다. 일부 기록을 삭제한 후 다시 시도해 주세요.';

/**
 * localStorage 접근 자체가 불가능할 때 사용자 알림용 메시지.
 * Safari Private Browsing, 엔터프라이즈 정책 등으로 localStorage API가 차단된 경우.
 */
export const STORAGE_UNAVAILABLE_MESSAGE =
  '현재 브라우저 환경에서 저장소를 사용할 수 없습니다. 페이지를 새로고침하거나 다른 브라우저로 접속해 주세요.';

/**
 * 전달받은 에러가 저장소 용량 초과 에러인지 확인한다.
 * UI 컴포넌트에서 이 함수로 QuotaExceededError를 감지하여 사용자 알림을 표시할 수 있다.
 */
export function isStorageQuotaError(error: unknown): boolean {
  return error instanceof Error && error.message === STORAGE_QUOTA_EXCEEDED_MESSAGE;
}

/**
 * 전달받은 에러가 저장소 접근 불가 에러인지 확인한다.
 * UI 컴포넌트에서 이 함수로 localStorage 차단 상태를 감지하여 적절한 안내를 표시할 수 있다.
 */
export function isStorageUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message === STORAGE_UNAVAILABLE_MESSAGE;
}

// ─── localStorage 가용성 감지 ──────────────────────────────────────────────

/** localStorage 접근 가능 여부 캐시. 최초 optimistic → 실제 접근 시도 후 확정 */
let storageAvailabilityChecked = false;
let storageAvailable = true;

/**
 * localStorage 접근 가능 여부를 직접 테스트한다.
 *
 * Safari Private Browsing, 엔터프라이즈 정책 등으로 localStorage가 차단된
 * 환경에서는 setItem 호출 시 QuotaExceededError 또는 SecurityError가 발생한다.
 * 이 함수는 테스트용 키를 쓰고 지우는 방식으로 실제 접근 가능 여부를 확인한다.
 *
 * 결과는 모듈 수명주기 동안 캐싱된다 (한 번 확인하면 재시도하지 않음).
 * 페이지 새로고침 시 캐시가 초기화된다.
 */
function checkStorageAvailability(): void {
  if (storageAvailabilityChecked) return;
  storageAvailabilityChecked = true;

  try {
    const testKey = '__book_of_changes_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
}

/**
 * localStorage 접근 가능 여부를 반환한다.
 * UI 컴포넌트에서 이 함수를 호출하여 저장 기능 제한 여부를 확인할 수 있다.
 */
export function isLocalStorageAvailable(): boolean {
  checkStorageAvailability();
  return storageAvailable;
}

/**
 * localStorage 가용성 캐시를 초기화하고 재검사한다.
 * 주로 테스트 환경에서 사용하지만, 런타임에 저장소 상태가 변경된 경우에도 호출 가능.
 */
export function resetStorageAvailability(): void {
  storageAvailabilityChecked = false;
  storageAvailable = true; // optimistic 초기화
}

/**
 * localStorage 쓰기 실패 시 인메모리 폴백 저장소.
 * QuotaExceededError 또는 StorageUnavailable 발생 시 기록을 보존하고, 복구 시 사용한다.
 */
let inMemoryFallback: DivinationRecord[] | null = null;

/** crypto.randomUUID 폴백 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백: 간단한 UUID v4 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** localStorage에서 기록 배열 읽기 (마이그레이션 포함)
 *  localStorage 접근 불가 시 빈 배열을 반환한다.
 *  인메모리 폴백이 활성화된 경우 폴백 데이터를 우선 반환한다.
 *  폴백은 writeAll() 또는 clearRecords() 성공 시에만 해제된다. */
function readAll(): DivinationRecord[] {
  // 인메모리 폴백이 활성화된 경우 → 가장 최신 데이터 우선 반환
  if (inMemoryFallback !== null) {
    return inMemoryFallback;
  }

  // localStorage 접근 불가 감지 (Safari Private Browsing 등)
  checkStorageAvailability();
  if (!storageAvailable) {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return unpack(raw);
  } catch {
    return [];
  }
}

/** localStorage에 기록 배열 쓰기 (최신 스키마 버전으로 pack)
 *  localStorage 접근 불가 또는 QuotaExceededError 발생 시 인메모리 폴백에
 *  저장하고 사용자 알림용 예외를 발생시킨다. */
function writeAll(records: DivinationRecord[]): void {
  checkStorageAvailability();

  // localStorage 자체가 차단된 환경 → 인메모리 폴백으로 전환
  if (!storageAvailable) {
    inMemoryFallback = records;
    throw new Error(STORAGE_UNAVAILABLE_MESSAGE);
  }

  try {
    localStorage.setItem(STORAGE_KEY, pack(records));
    // 쓰기 성공 시 폴백 해제
    inMemoryFallback = null;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // 인메모리 폴백에 기록 보존 (데이터 손실 방지)
      inMemoryFallback = records;
      throw new Error(STORAGE_QUOTA_EXCEEDED_MESSAGE);
    }
    // 기타 예외 (SecurityError 등) → 인메모리 폴백 + unavailable 메시지
    inMemoryFallback = records;
    throw new Error(STORAGE_UNAVAILABLE_MESSAGE);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * 새 점술 기록을 저장한다.
 * @returns 생성된 DivinationRecord
 * @throws 용량 초과로 저장 불가 시 에러
 */
export function saveRecord(input: CreateRecordInput): DivinationRecord {
  const now = new Date().toISOString();
  const records = readAll();

  const record: DivinationRecord = {
    id: generateId(),
    timestamp: now,
    mainHexagram: input.mainHexagram,
    changingHexagram: input.changingHexagram ?? null,
    changingLines: input.changingLines,
    aiInterpretation: input.aiInterpretation ?? '',
    userQuestion: input.userQuestion ?? '',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [record, ...records];

  // 최대 50건 유지 (초과 시 마지막 항목 제거)
  if (updated.length > MAX_RECORDS) {
    updated.length = MAX_RECORDS;
  }

  writeAll(updated);
  return record;
}

/**
 * 모든 점술 기록을 조회한다 (최신순).
 * @returns DivinationRecord[]
 */
export function loadRecords(): DivinationRecord[] {
  return readAll();
}

/**
 * 특정 ID의 기록을 조회한다.
 * 조회 시 lastViewedAt과 viewCount가 업데이트된다.
 * @returns 찾은 기록 또는 undefined
 */
export function getRecordById(id: string): DivinationRecord | undefined {
  const records = readAll();
  const record = records.find((r) => r.id === id);
  if (!record) return undefined;

  // 조회수 업데이트
  record.lastViewedAt = new Date().toISOString();
  record.viewCount = (record.viewCount || 0) + 1;
  record.updatedAt = new Date().toISOString();

  writeAll(records);
  return record;
}

/**
 * 기록의 메모를 수정한다.
 * @returns 수정된 기록 또는 undefined (id 불일치 시)
 */
export function updateRecord(
  id: string,
  input: UpdateRecordInput,
): DivinationRecord | undefined {
  const records = readAll();
  const record = records.find((r) => r.id === id);
  if (!record) return undefined;

  record.freeMemo = input.freeMemo ?? '';
  record.updatedAt = new Date().toISOString();

  writeAll(records);
  return record;
}

/**
 * 조회된 기록을 최신순(timestamp 내림차순)으로 정렬한 새 배열을 반환한다.
 *
 * localStorage 독립적인 순수 함수로, 주어진 DivinationRecord 배열을
 * timestamp 필드 기준으로 내림차순 정렬한 새 배열을 반환한다.
 * 원본 배열은 변경되지 않는다.
 *
 * timestamp는 ISO 8601 문자열이므로 사전식 비교(lexicographic)만으로도
 * 올바른 시간순 정렬이 보장된다.
 *
 * 정렬 안정성(stable sort): 동일한 timestamp를 가진 레코드 간의
 * 상대적 순서는 원본 배열의 순서를 유지한다 (ES2019+ Array.prototype.sort 보장).
 *
 * @param records - DivinationRecord 배열
 * @returns timestamp 기준 내림차순으로 정렬된 새 DivinationRecord 배열
 */
export function sortByTimestampDesc(
  records: DivinationRecord[],
): DivinationRecord[] {
  return [...records].sort((a, b) => {
    if (b.timestamp > a.timestamp) return 1;
    if (b.timestamp < a.timestamp) return -1;
    return 0;
  });
}

/**
 * 기록 배열에서 특정 ID의 메모를 생성하거나 수정한 새 배열을 반환한다.
 *
 * localStorage 독립적인 순수 함수로, 주어진 레코드 배열을 변형하지 않고
 * 해당 ID를 가진 레코드의 freeMemo가 갱신된 새 배열을 반환한다.
 * ID가 일치하지 않으면 원본 배열을 그대로 반환한다.
 *
 * 이 함수는 기존 updateRecord와 달리 localStorage에 접근하지 않으므로
 * 단위 테스트에서 독립적으로 검증할 수 있으며, React hook이나
 * 상태 관리 레이어에서 불변 업데이트를 수행할 때 사용한다.
 *
 * @param records - 기존 DivinationRecord 배열
 * @param id - 수정할 레코드의 ID
 * @param memo - 새 메모 내용 (기존 메모를 부분적으로 덮어씀)
 * @returns freeMemo가 갱신된 새 배열, ID 불일치 시 원본 배열
 */
export function saveOrUpdateMemo(
  records: DivinationRecord[],
  id: string,
  memo: string,
): DivinationRecord[] {
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return records;

  const updated: DivinationRecord = {
    ...records[index],
    freeMemo: memo,
    updatedAt: new Date().toISOString(),
  };

  const next = [...records];
  next[index] = updated;
  return next;
}

/**
 * 특정 기록 ID의 freeMemo를 조회한다.
 *
 * localStorage 독립적인 순수 함수로, 주어진 레코드 배열에서
 * 해당 ID의 freeMemo를 읽어 반환한다.
 *
 * @param records - DivinationRecord 배열
 * @param id - 조회할 레코드의 ID
 * @returns freeMemo 문자열. ID 불일치 또는 freeMemo가 빈 문자열이면 null
 */
export function getMemo(
  records: DivinationRecord[],
  id: string,
): string | null {
  const record = records.find((r) => r.id === id);
  if (!record) return null;

  const memo = record.freeMemo ?? '';
  return memo !== '' ? memo : null;
}

/**
 * 메모가 있는 모든 레코드에서 ID와 memo를 조회한다.
 *
 * localStorage 독립적인 순수 함수로, freeMemo가 비어 있지 않은
 * 모든 레코드의 { id, memo } 쌍을 배열로 반환한다.
 * 메모가 하나도 없으면 빈 배열을 반환한다.
 *
 * @param records - DivinationRecord 배열
 * @returns { id: string; memo: string }[] — 메모가 있는 레코드의 ID-메모 쌍
 */
export function getMemos(
  records: DivinationRecord[],
): { id: string; memo: string }[] {
  return records
    .filter((r) => {
      const memo = r.freeMemo ?? '';
      return memo !== '';
    })
    .map((r) => ({ id: r.id, memo: r.freeMemo! }));
}

/**
 * 특정 ID의 기록을 삭제한다.
 * @returns 삭제 성공 여부
 */
export function deleteRecordFromStorage(id: string): boolean {
  const records = readAll();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return false;

  records.splice(index, 1);
  writeAll(records);
  return true;
}

/** @deprecated Use deleteRecordFromStorage instead */
export const deleteRecord = deleteRecordFromStorage;

/**
 * 점술 기록을 ID로 삭제한다 (Ontology: DivinationRecord.deleteHistoryItem).
 *
 * 주역 과거 기록 확인 기능에서 제공하는 공식 삭제 함수.
 * deleteRecordFromStorage의 시맨틱 별칭으로, 기록 관리 UI에서 사용한다.
 *
 * @param id - 삭제할 기록의 UUID
 * @returns 삭제 성공 여부 (ID가 존재하지 않으면 false)
 */
export const deleteHistoryItem = deleteRecordFromStorage;

/**
 * 모든 기록을 삭제한다.
 * localStorage 접근 불가 시 인메모리 폴백만 초기화한다.
 */
export function clearRecords(): void {
  inMemoryFallback = null;

  checkStorageAvailability();
  if (!storageAvailable) {
    // localStorage에 접근할 수 없으면 폴백만 초기화하고 종료
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage 접근 불가 — 이미 폴백은 초기화됨
  }
}

/**
 * 현재 저장된 기록 개수를 반환한다.
 */
export function getRecordCount(): number {
  return readAll().length;
}

/**
 * localStorage 사용량을 추정하여 바이트 단위로 반환한다.
 * localStorage 접근 불가 시 0을 반환한다.
 */
export function getStorageUsage(): number {
  checkStorageAvailability();
  if (!storageAvailable) return 0;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    // UTF-16 기준: 문자당 2바이트
    return raw.length * 2;
  } catch {
    return 0;
  }
}

/**
 * localStorage에 저장된 원시 점술 기록 데이터를 읽어온다.
 *
 * 마이그레이션, 복구(recovery), 파싱 등 어떤 후처리도 하지 않고
 * 원시 데이터를 PackedData 또는 null로 반환한다.
 *
 * 용도:
 * - 디버깅 / 데이터 검사: 저장된 데이터의 구조와 버전을 확인할 때
 * - 내보내기(export) / 수동 마이그레이션 도구의 입력으로 사용할 때
 * - 테스트에서 저장 상태를 검증할 때
 *
 * @returns PackedData (v1+) 또는 null (데이터 없음 / 접근 불가)
 */
export function getRawPackedData(): PackedData | null {
  checkStorageAvailability();
  if (!storageAvailable) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.trim() === '') return null;

    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return null;

    return parsed as PackedData;
  } catch {
    return null;
  }
}

/**
 * 인메모리 폴백 상태를 반환한다 (테스트용).
 * QuotaExceededError 발생 후 인메모리 폴백에 저장된 기록이 있는지 확인한다.
 */
export function getInMemoryFallbackState(): {
  active: boolean;
  recordCount: number;
} {
  return {
    active: inMemoryFallback !== null,
    recordCount: inMemoryFallback?.length ?? 0,
  };
}

/**
 * 기존 DivinationRecord를 원본 그대로 localStorage 맨 앞에 재삽입한다.
 *
 * saveRecord와 달리 새 ID를 생성하지 않고, 전달받은 record를 그대로 사용한다.
 * 삭제 롤백(re-insert) 용도로 설계되었으며, MAX_RECORDS 초과 시 마지막 항목을 제거한다.
 *
 * @param record - 재삽입할 DivinationRecord (원본 필드 모두 보존)
 * @throws QuotaExceededError 또는 StorageUnavailable 시 예외
 */
export function reinsertRecord(record: DivinationRecord): void {
  const records = readAll();
  const updated = [record, ...records];

  // 최대 50건 유지 (초과 시 마지막 항목 제거)
  if (updated.length > MAX_RECORDS) {
    updated.length = MAX_RECORDS;
  }

  writeAll(updated);
}

/**
 * 인메모리 폴백에서 기록을 복구 시도한다.
 * localStorage에 공간이 확보되었거나 접근이 복구된 후 호출하여 데이터를 다시 디스크에 쓴다.
 * @returns 복구 성공 여부
 */
export function recoverFromFallback(): boolean {
  if (inMemoryFallback === null) {
    return false;
  }

  checkStorageAvailability();
  if (!storageAvailable) {
    // localStorage 접근 불가 — 복구할 수 없음. 폴백 유지.
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEY, pack(inMemoryFallback));
    inMemoryFallback = null;
    return true;
  } catch {
    // 복구 실패 시 폴백 유지 (데이터 보존)
    return false;
  }
}

/**
 * localStorage에서 점괘 기록을 조회하고 옵션에 따라 필터링/검색/정렬한다.
 *
 * 이 함수는 loadRecords()로 localStorage의 모든 기록을 읽은 후,
 * queryRecords()로 필터링/검색/정렬을 적용한 결과를 반환한다.
 *
 * localStorage에 데이터가 없거나 키가 존재하지 않는 경우 빈 배열을 반환하며,
 * 어떤 경우에도 예외를 throw하지 않는다.
 *
 * @param options - 검색/필터링/정렬 옵션 (queryRecords의 QueryOptions)
 * @returns 조건에 맞는 DivinationRecord 배열 (최신순 정렬)
 *
 * @example
 * ```ts
 * // 전체 목록 조회
 * const all = queryRecordsFromStorage();
 *
 * // 검색어로 필터링
 * const 건records = queryRecordsFromStorage({ search: '건' });
 *
 * // 변괘가 있는 기록만 조회
 * const with변괘 = queryRecordsFromStorage({ hasChangingHexagram: true });
 *
 * // localStorage가 비어있거나 키가 없는 경우
 * const empty = queryRecordsFromStorage(); // → []
 * ```
 */
export function queryRecordsFromStorage(
  options?: QueryOptions,
): DivinationRecord[] {
  const records = loadRecords();
  return queryRecords(records, options ?? {});
}

// ─── duplicateCheck ─────────────────────────────────────────────────────────

/**
 * 동일한 점괘 결과(본괘 + 변효 조합)가 이미 기록에 존재하는지 검사한다.
 *
 * localStorage 독립적인 순수 함수로, 주어진 레코드 배열에서
 * mainHexagram과 changingLines가 모두 일치하는 레코드가 있는지 확인한다.
 * changingLines의 순서는 중요하지 않다 (집합 비교).
 *
 * @param records - DivinationRecord 배열
 * @param mainHexagram - 확인할 본괘 (예: "1. 건(乾)")
 * @param changingLines - 확인할 변효 위치 배열 (예: [2, 5])
 * @returns 중복이 존재하면 true, 없으면 false
 */
export function duplicateCheck(
  records: DivinationRecord[],
  mainHexagram: string,
  changingLines: number[],
): boolean {
  return records.some((r) => {
    if (r.mainHexagram !== mainHexagram) return false;

    const a = [...r.changingLines].sort();
    const b = [...changingLines].sort();
    return (
      a.length === b.length && a.every((val, idx) => val === b[idx])
    );
  });
}
