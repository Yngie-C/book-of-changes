import { useState, useCallback, useRef } from 'react';
import type { DivinationRecord, CreateRecordInput } from '@/data/types';
import { saveRecord } from '@/lib/storage';

/**
 * useSaveDivination 상태 타입.
 *
 * idle     — 저장 액션을 호출하지 않은 초기 상태
 * loading  — 저장 진행 중 (중복 호출 방지)
 * success  — 저장 성공, record에 생성된 DivinationRecord 포함
 * error    — 저장 실패 (QuotaExceededError 등)
 */
export type SaveState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; record: DivinationRecord }
  | { status: 'error'; message: string };

/**
 * 중복 방지용 지문(fingerprint) 문자열을 생성한다.
 *
 * mainHexagram + changingLines(정렬) + changingHexagram(null-safe)를
 * 콜론으로 연결한 문자열을 반환한다. 동일한 점술 결과를 중복 저장하지 않도록
 * save() 호출 시 이전 성공 지문과 비교한다.
 */
function makeFingerprint(input: CreateRecordInput): string {
  const lines = [...input.changingLines].sort((a, b) => a - b).join(',');
  const changing = input.changingHexagram ?? '';
  return `${input.mainHexagram}:${lines}:${changing}`;
}

/**
 * 점괘 기록 저장 액션의 상태 관리(loading, success, error, 중복 방지)를
 * 담당하는 커스텀 훅.
 *
 * @returns { state, save, reset } — 현재 상태, 저장 함수, 초기화 함수
 *
 * @example
 * ```tsx
 * const { state, save, reset } = useSaveDivination();
 *
 * const handleSave = async () => {
 *   await save({
 *     mainHexagram: '1. 건(乾)',
 *     changingLines: [2, 5],
 *     changingHexagram: '14. 대유(大有)',
 *     aiInterpretation: '좋은 운세입니다.',
 *     userQuestion: '오늘의 운세',
 *   });
 * };
 *
 * if (state.status === 'loading') return <Spinner />;
 * if (state.status === 'success') return <SavedBadge />;
 * if (state.status === 'error') return <ErrorBanner message={state.message} />;
 * ```
 */
export function useSaveDivination() {
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  // 직전 성공한 저장의 지문 (중복 저장 방지용)
  const lastFingerprintRef = useRef<string | null>(null);

  /**
   * 점괘 기록을 localStorage에 저장한다.
   *
   * 중복 방지:
   * 1. loading 상태일 때 호출 시 무시 (동시 저장 방지)
   * 2. 직전 성공한 저장과 동일한 지문(fingerprint)이면 무시 (내용 중복 방지)
   *
   * reset() 호출 시 두 조건 모두 초기화되어 다시 저장 가능하다.
   *
   * @param input - 저장할 점술 기록 데이터
   * @returns 생성된 DivinationRecord (성공 시), undefined (중복 방지로 무시 시)
   */
  const save = useCallback(
    async (input: CreateRecordInput): Promise<DivinationRecord | undefined> => {
      // Guard 1: 이미 저장 중이면 무시
      if (state.status === 'loading') {
        return undefined;
      }

      const fingerprint = makeFingerprint(input);

      // Guard 2: 직전 성공과 동일한 내용이면 중복 방지
      if (lastFingerprintRef.current === fingerprint) {
        return undefined;
      }

      setState({ status: 'loading' });

      try {
        const record = saveRecord(input);
        lastFingerprintRef.current = fingerprint;
        setState({ status: 'success', record });
        return record;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '기록을 저장하는 중 오류가 발생했습니다.';
        setState({ status: 'error', message });
        return undefined;
      }
    },
    [state.status],
  );

  /**
   * 저장 상태를 idle로 초기화한다.
   *
   * 성공 또는 에러 상태에서 다시 저장을 시도할 수 있도록 상태를 리셋한다.
   * 마지막 성공 지문도 초기화하여 같은 내용을 다시 저장할 수 있게 한다.
   */
  const reset = useCallback(() => {
    lastFingerprintRef.current = null;
    setState({ status: 'idle' });
  }, []);

  return { state, save, reset };
}