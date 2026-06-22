import { useState, useEffect, useCallback, useRef } from 'react';
import type { DivinationRecord } from '@/data/types';
import type { QueryOptions } from '@/lib/queryRecords';
import {
  loadRecords,
  deleteHistoryItem,
  sortByTimestampDesc,
} from '@/lib/storage';
import { queryRecords } from '@/lib/queryRecords';

/**
 * useHistoryList 상태 타입.
 *
 * idle    — 아직 localStorage에서 기록을 불러오지 않은 초기 상태
 * loading — localStorage에서 기록을 불러오는 중
 * ready   — 기록 목록을 성공적으로 불러온 상태 (records, totalCount 포함)
 * error   — localStorage 접근 불가 등 오류 발생
 */
export type HistoryListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; records: DivinationRecord[]; totalCount: number }
  | { status: 'error'; message: string };

/**
 * 점술 기록 목록을 localStorage에서 불러와 필터링/검색/정렬하는 커스텀 훅.
 *
 * 삭제 액션 실행 시 localStorage와 로컬 상태를 동시에 갱신하여
 * UI에서 즉시 반영되도록 한다.
 *
 * @param options — 검색어, 필터, 정렬 옵션 (선택)
 * @returns { state, deleteRecord, refresh } — 현재 상태, 삭제 함수, 새로고침 함수
 *
 * @example
 * ```tsx
 * const { state, deleteRecord } = useHistoryList({ sort: { field: 'timestamp', direction: 'desc' } });
 * if (state.status === 'loading') return <Spinner />;
 * if (state.status === 'ready') return <RecordList records={state.records} onDelete={deleteRecord} />;
 * if (state.status === 'error') return <Error message={state.message} />;
 * return null;
 * ```
 */
export function useHistoryList(options?: QueryOptions) {
  const [state, setState] = useState<HistoryListState>({ status: 'idle' });

  // options 변경 감지를 위한 ref (불필요한 재조회 방지)
  const optionsRef = useRef(options);

  /**
   * localStorage에서 기록을 불러와 상태를 갱신한다.
   */
  const refresh = useCallback(
    (currentOptions?: QueryOptions) => {
      setState({ status: 'loading' });

      try {
        const allRecords = loadRecords();
        const opts = currentOptions ?? optionsRef.current;

        let result: DivinationRecord[];
        if (opts && hasActiveOptions(opts)) {
          result = queryRecords(allRecords, opts);
        } else {
          // 옵션이 없으면 최신순 정렬만 적용
          result = sortByTimestampDesc(allRecords);
        }

        setState({
          status: 'ready',
          records: result,
          totalCount: allRecords.length,
        });
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

  /**
   * 특정 ID의 기록을 삭제하고 로컬 상태에서도 제거한다.
   *
   * 삭제 성공 시:
   * 1. localStorage에서 해당 레코드 제거
   * 2. 로컬 state.records에서 해당 레코드 제외
   * 3. totalCount 1 감소
   *
   * @param id — 삭제할 기록의 UUID
   * @returns 삭제 성공 여부
   */
  const deleteRecord = useCallback(
    (id: string): boolean => {
      const result = deleteHistoryItem(id);

      if (!result) return false;

      // 로컬 상태에서도 제거
      setState((prev) => {
        if (prev.status !== 'ready') return prev;

        const updatedRecords = prev.records.filter((r) => r.id !== id);

        return {
          ...prev,
          records: updatedRecords,
          totalCount: prev.totalCount - 1,
        };
      });

      return true;
    },
    [],
  );

  // 최초 마운트 및 options 변경 시 records 로드
  useEffect(() => {
    optionsRef.current = options;
    refresh(options);
  }, [refresh, options]);

  return { state, deleteRecord, refresh };
}

/**
 * QueryOptions에 활성화된 옵션이 하나라도 있는지 확인한다.
 */
function hasActiveOptions(options: QueryOptions): boolean {
  return (
    (options.search !== undefined && options.search !== '') ||
    options.hasChangingHexagram !== undefined ||
    options.hasAiInterpretation !== undefined ||
    options.hasMemo !== undefined ||
    options.hexagramNumbers !== undefined ||
    options.sort !== undefined
  );
}
