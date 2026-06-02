/**
 * 점괘 기록 JSON 직렬화/역직렬화 순수 함수
 *
 * localStorage나 네트워크와 독립적인 순수 함수로,
 * DivinationRecord[] ↔ JSON 문자열 변환을 담당한다.
 * 역직렬화 시 구조 검증을 수행하며, 유효하지 않은 입력은 예외를 발생시킨다.
 */

import type { DivinationRecord } from '@/data/types';

/** DivinationRecord 필수 필드 목록 (타입 가드용) */
const REQUIRED_STRING_FIELDS: (keyof DivinationRecord)[] = [
  'id',
  'timestamp',
  'mainHexagram',
  'createdAt',
  'updatedAt',
];

const REQUIRED_NUMBER_FIELDS: (keyof DivinationRecord)[] = ['viewCount'];

const REQUIRED_ARRAY_FIELDS: (keyof DivinationRecord)[] = ['changingLines'];

/**
 * 점괘 기록 배열을 JSON 문자열로 직렬화한다.
 *
 * @param records - 직렬화할 DivinationRecord 배열
 * @returns 가독성을 위한 들여쓰기(2 space)가 적용된 JSON 문자열
 * @throws records가 배열이 아니면 TypeError
 */
export function serializeRecords(records: DivinationRecord[]): string {
  if (!Array.isArray(records)) {
    throw new TypeError(
      `serializeRecords: expected an array, got ${typeof records}`,
    );
  }

  return JSON.stringify(records, null, 2);
}

/**
 * JSON 문자열을 DivinationRecord 배열로 역직렬화한다.
 *
 * 유효성 검사:
 * 1. 입력이 문자열인지 확인
 * 2. JSON 파싱 가능한지 확인
 * 3. 파싱 결과가 배열인지 확인
 * 4. 각 요소가 최소한의 DivinationRecord 구조를 가졌는지 확인
 *
 * @param json - 역직렬화할 JSON 문자열
 * @returns 검증된 DivinationRecord 배열
 * @throws SyntaxError - 유효하지 않은 JSON 형식
 * @throws TypeError - 파싱 결과가 배열이 아닌 경우
 * @throws TypeError - 배열 요소에 필수 필드가 누락된 경우
 */
export function deserializeRecords(json: string): DivinationRecord[] {
  // 1. 입력 타입 검증
  if (typeof json !== 'string') {
    throw new TypeError(
      `deserializeRecords: expected a string, got ${typeof json}`,
    );
  }

  // 2. 빈 문자열 / 공백만 있는 경우 빈 배열 반환
  if (json.trim() === '') {
    return [];
  }

  // 3. JSON 파싱
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new SyntaxError(
      `deserializeRecords: invalid JSON: ${(cause as Error).message}`,
    );
  }

  // 4. 배열 확인
  if (!Array.isArray(parsed)) {
    throw new TypeError(
      `deserializeRecords: expected a JSON array, got ${typeof parsed}`,
    );
  }

  // 5. 각 요소 구조 검증
  for (let i = 0; i < parsed.length; i++) {
    validateRecordItem(parsed[i], i);
  }

  return parsed as DivinationRecord[];
}

/**
 * 단일 항목이 최소한의 DivinationRecord 구조를 갖추었는지 검증한다.
 *
 * @param item - 검증할 항목
 * @param index - 배열 내 인덱스 (에러 메시지용)
 * @throws TypeError - 필수 필드 누락 시
 */
function validateRecordItem(item: unknown, index: number): void {
  if (item === null || item === undefined) {
    throw new TypeError(
      `deserializeRecords: item at index ${index} is ${item}`,
    );
  }

  if (typeof item !== 'object') {
    throw new TypeError(
      `deserializeRecords: item at index ${index} is not an object (got ${typeof item})`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = item as any;

  // 필수 문자열 필드 검증
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof record[field] !== 'string' || record[field] === '') {
      throw new TypeError(
        `deserializeRecords: item at index ${index} is missing required string field '${field}'`,
      );
    }
  }

  // 필수 숫자 필드 검증
  for (const field of REQUIRED_NUMBER_FIELDS) {
    if (typeof record[field] !== 'number') {
      throw new TypeError(
        `deserializeRecords: item at index ${index} is missing required number field '${field}'`,
      );
    }
  }

  // 필수 배열 필드 검증
  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(record[field])) {
      throw new TypeError(
        `deserializeRecords: item at index ${index} is missing required array field '${field}'`,
      );
    }

    // changingLines는 number[] 여야 함
    for (let j = 0; j < record[field].length; j++) {
      if (typeof record[field][j] !== 'number') {
        throw new TypeError(
          `deserializeRecords: item at index ${index}, field '${field}[${j}]' is not a number`,
        );
      }
    }
  }
}
