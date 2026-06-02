import { useState, useEffect, useCallback } from 'react';
import type { DivinationRecord } from '@/data/types';
import { getRecordById } from '@/lib/storage';

/**
 * useHistoryDetail 상태 타입.
 *
 * idle   — id가 null/undefined이거나 아직 조회하지 않은 상태
 * loading — 조회 진행 중
 * success — 기록 조회 성공, record에 데이터 포함
 * error   — 기록을 찾을 수 없거나 기타 오류 발생
 */
export type HistoryDetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; record: DivinationRecord }
  | { status: 'error'; message: string };

/**
 * 특정 ID로 단일 점괘 기록을 조회하는 커스텀 훅.
 *
 * @param id — 조회할 기록 ID. null 또는 undefined인 경우 idle 상태 유지.
 * @returns { state, refetch } — 현재 상태와 수동 재조회 함수
 *
 * @example
 * ```tsx
 * const { state } = useHistoryDetail(recordId);
 * if (state.status === 'loading') return <Spinner />;
 * if (state.status === 'success') return <RecordDetail record={state.record} />;
 * if (state.status === 'error') return <Error message={state.message} />;
 * return null; // idle
 * ```
 */
export function useHistoryDetail(id: string | null | undefined) {
  const [state, setState] = useState<HistoryDetailState>({ status: 'idle' });

  const fetchDetail = useCallback(
    (targetId: string | null | undefined) => {
      if (!targetId) {
        setState({ status: 'idle' });
        return;
      }

      setState({ status: 'loading' });

      try {
        const record = getRecordById(targetId);
        if (record) {
          setState({ status: 'success', record });
        } else {
          setState({
            status: 'error',
            message: '기록을 찾을 수 없습니다.',
          });
        }
      } catch (error) {
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : '기록을 불러오는 중 오류가 발생했습니다.',
        });
      }
    },
    [],
  );

  useEffect(() => {
    fetchDetail(id);
  }, [id, fetchDetail]);

  /**
   * 현재 id로 수동 재조회한다.
   * 주로 메모 수정 후 최신 데이터를 다시 가져올 때 사용한다.
   */
  const refetch = useCallback(() => {
    fetchDetail(id);
  }, [id, fetchDetail]);

  return { state, refetch };
}
