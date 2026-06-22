/**
 * useHistoryList 삭제 상태 갱신 테스트 — Sub-AC 4.3.2
 *
 * 검증 범위:
 * 1. 삭제 후 로컬 상태 갱신 — 삭제된 항목 제외, 나머지 보존
 * 2. totalCount 감소 검증
 * 3. 삭제 후 남은 항목의 모든 필드 무결성
 * 4. 미존재 ID 삭제 시 상태 불변
 * 5. 마지막 기록 삭제 → 빈 상태
 * 6. 순차적 다중 삭제
 * 7. localStorage와 상태 간 일관성
 * 8. 검색/필터 적용 상태에서의 삭제
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHistoryList } from '@/hooks/useHistoryList';
import * as storage from '@/lib/storage';
import type { CreateRecordInput } from '@/data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

function makeFullInput(): CreateRecordInput {
  return {
    mainHexagram: '22. 비(賁)',
    changingHexagram: '36. 명이(明夷)',
    changingLines: [1, 3, 5],
    aiInterpretation:
      '지금은 외형보다 내실을 다질 때입니다. 겉치레를 버리고 진실된 태도로 임하세요.',
    userQuestion: '올해 사업 방향이 궁금합니다',
  };
}

/** act()로 감싼 deleteRecord 호출. React 상태가 flush될 때까지 대기. */
function doDelete(
  result: { current: ReturnType<typeof useHistoryList> },
  id: string,
): boolean {
  let deleted = false;
  act(() => {
    deleted = result.current.deleteRecord(id);
  });
  return deleted;
}

/** 렌더 후 ready 상태까지 대기 */
async function renderAndWait(options?: Parameters<typeof useHistoryList>[0]) {
  const hook = renderHook(() => useHistoryList(options));
  await waitFor(() => {
    expect(hook.result.current.state.status).toBe('ready');
  });
  return hook;
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  storage.clearRecords();
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. 삭제 후 상태 갱신 — 항목 제외 + 나머지 보존
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — 상태에서 항목 제외', () => {
  it('단일 기록 삭제 후 state.records에서 해당 항목이 제거된다', async () => {
    const r1 = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const { result } = await renderAndWait();

    const beforeIds = result.current.state.status === 'ready'
      ? result.current.state.records.map((r) => r.id)
      : [];
    expect(beforeIds).toContain(r1.id);

    const deleted = doDelete(result, r1.id);
    expect(deleted).toBe(true);

    // 상태 검증
    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const afterIds = result.current.state.records.map((r) => r.id);
    expect(afterIds).not.toContain(r1.id);
    expect(afterIds).toHaveLength(2);
  });

  it('삭제 후 나머지 기록의 모든 필드가 보존된다', async () => {
    const toKeep = storage.saveRecord(makeFullInput());
    const toDelete = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    const { result } = await renderAndWait();

    doDelete(result, toDelete.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready state');

    const records = result.current.state.records;
    expect(records).toHaveLength(1);

    const kept = records[0];
    expect(kept.id).toBe(toKeep.id);
    expect(kept.mainHexagram).toBe('22. 비(賁)');
    expect(kept.changingHexagram).toBe('36. 명이(明夷)');
    expect(kept.changingLines).toEqual([1, 3, 5]);
    expect(kept.aiInterpretation).toBe(
      '지금은 외형보다 내실을 다질 때입니다. 겉치레를 버리고 진실된 태도로 임하세요.',
    );
    expect(kept.userQuestion).toBe('올해 사업 방향이 궁금합니다');
    expect(kept.freeMemo).toBe('');
    expect(kept.viewCount).toBe(0);
    expect(kept.lastViewedAt).toBeNull();
    expect(kept.timestamp).toBe(toKeep.timestamp);
    expect(kept.createdAt).toBe(toKeep.createdAt);
    expect(kept.updatedAt).toBe(toKeep.updatedAt);
  });

  it('여러 기록 중 하나만 삭제하면 나머지 ID가 그대로다', async () => {
    const r1 = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const r4 = storage.saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));

    const { result } = await renderAndWait();

    doDelete(result, r2.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const remainingIds = result.current.state.records
      .map((r) => r.id)
      .sort();
    expect(remainingIds).toEqual([r1.id, r3.id, r4.id].sort());
  });

  it('삭제 후 남은 기록의 순서가 유지된다 (기존 정렬 순서 보존)', async () => {
    const _r1 = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const _r2 = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const _r3 = storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const _r4 = storage.saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));

    const { result } = await renderAndWait();

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const orderBefore = result.current.state.records.map((r) => r.id);

    // 중간 기록 삭제
    const midId = orderBefore[1];
    doDelete(result, midId);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const orderAfter = result.current.state.records.map((r) => r.id);
    expect(orderAfter).not.toContain(midId);
    expect(orderAfter).toEqual(orderBefore.filter((id) => id !== midId));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. totalCount 감소 검증
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — totalCount 감소', () => {
  it('삭제 후 totalCount가 1 감소한다', async () => {
    storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const toDelete = storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const { result } = await renderAndWait();

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.totalCount).toBe(3);

    doDelete(result, toDelete.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.totalCount).toBe(2);
    expect(result.current.state.records).toHaveLength(2);
  });

  it('totalCount와 records.length가 항상 일치한다 (기본 모드)', async () => {
    storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const toDelete = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const { result } = await renderAndWait();

    // 삭제 전
    if (result.current.state.status === 'ready') {
      expect(result.current.state.totalCount).toBe(
        result.current.state.records.length,
      );
    }

    doDelete(result, toDelete.id);

    // 삭제 후
    if (result.current.state.status === 'ready') {
      expect(result.current.state.totalCount).toBe(
        result.current.state.records.length,
      );
    }
  });

  it('totalCount는 필터링된 records.length가 아닌 전체 저장소 크기를 나타낸다', async () => {
    storage.saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
    }));
    storage.saveRecord(makeInput({
      mainHexagram: '3. 둔(屯)',
      changingHexagram: null,
    }));
    const toDelete = storage.saveRecord(makeInput({
      mainHexagram: '4. 몽(蒙)',
      changingHexagram: null,
    }));

    const { result } = await renderAndWait({ hasChangingHexagram: false });

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');

    // totalCount는 전체 3, records는 필터링된 2
    expect(result.current.state.totalCount).toBe(3);
    expect(result.current.state.records).toHaveLength(2);

    doDelete(result, toDelete.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.totalCount).toBe(2);
    expect(result.current.state.records).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. 미존재 ID 삭제 — 상태 불변
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — 미존재 ID (상태 불변)', () => {
  it('존재하지 않는 ID로 삭제 시 false 반환, 상태 불변', async () => {
    storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const { result } = await renderAndWait();

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const recordsBefore = [...result.current.state.records];
    const totalCountBefore = result.current.state.totalCount;

    const deleted = doDelete(result, 'non-existent-id');
    expect(deleted).toBe(false);

    expect(result.current.state.records).toEqual(recordsBefore);
    expect(result.current.state.totalCount).toBe(totalCountBefore);
  });

  it('이미 삭제된 ID로 재삭제 시 false, 상태 불변', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));

    const { result } = await renderAndWait();

    // 첫 삭제
    expect(doDelete(result, record.id)).toBe(true);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const recordsAfterFirst = [...result.current.state.records];
    const totalAfterFirst = result.current.state.totalCount;

    // 재삭제
    expect(doDelete(result, record.id)).toBe(false);

    expect(result.current.state.records).toEqual(recordsAfterFirst);
    expect(result.current.state.totalCount).toBe(totalAfterFirst);
  });

  it('빈 저장소에서 삭제 시 false 반환, 상태는 ready + 빈 records', async () => {
    const { result } = await renderAndWait();

    const deleted = doDelete(result, 'any-id');
    expect(deleted).toBe(false);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records).toEqual([]);
    expect(result.current.state.totalCount).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. 마지막 기록 삭제 → 빈 상태
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — 마지막 기록 삭제', () => {
  it('마지막 기록 삭제 후 records는 빈 배열, totalCount는 0', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '64. 미제(未濟)' }));

    const { result } = await renderAndWait();

    expect(doDelete(result, record.id)).toBe(true);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records).toEqual([]);
    expect(result.current.state.totalCount).toBe(0);
  });

  it('마지막 기록 삭제 후에도 상태는 ready를 유지한다', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '63. 기제(旣濟)' }));

    const { result } = await renderAndWait();

    doDelete(result, record.id);

    expect(result.current.state.status).toBe('ready');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. 순차적 다중 삭제
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — 순차적 다중 삭제', () => {
  it('여러 기록을 순차적으로 삭제하면 매번 정확히 하나씩 제거된다', async () => {
    const records = [
      storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' })),
      storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' })),
      storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' })),
      storage.saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' })),
    ];

    const { result } = await renderAndWait();

    // 1번째 삭제
    expect(doDelete(result, records[0].id)).toBe(true);
    if (result.current.state.status !== 'ready') throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(3);
    expect(result.current.state.records.map((r) => r.id)).not.toContain(records[0].id);

    // 2번째 삭제
    expect(doDelete(result, records[1].id)).toBe(true);
    if (result.current.state.status !== 'ready') throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(2);
    const idsAfter2 = result.current.state.records.map((r) => r.id);
    expect(idsAfter2).not.toContain(records[0].id);
    expect(idsAfter2).not.toContain(records[1].id);

    // 3번째 삭제
    expect(doDelete(result, records[2].id)).toBe(true);
    if (result.current.state.status !== 'ready') throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(1);

    // 4번째 삭제 (마지막)
    expect(doDelete(result, records[3].id)).toBe(true);
    if (result.current.state.status !== 'ready') throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(0);
    expect(result.current.state.totalCount).toBe(0);
  });

  it('순차적 삭제 중간에 totalCount가 정확히 추적된다', async () => {
    for (let i = 0; i < 5; i++) {
      storage.saveRecord(makeInput({ mainHexagram: `${i + 1}. test` }));
    }

    const { result } = await renderAndWait();

    if (result.current.state.status !== 'ready') throw new Error('Expected ready');
    const allRecords = [...result.current.state.records];

    for (let i = 0; i < 5; i++) {
      doDelete(result, allRecords[i].id);
      if (result.current.state.status !== 'ready') throw new Error('Expected ready');
      expect(result.current.state.totalCount).toBe(4 - i);
      expect(result.current.state.records).toHaveLength(4 - i);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. localStorage와 상태 간 일관성
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — localStorage-상태 일관성', () => {
  it('삭제 후 localStorage loadRecords와 useHistoryList 상태가 일치한다', async () => {
    const r1 = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));

    const { result } = await renderAndWait();

    doDelete(result, r2.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');

    const stateIds = result.current.state.records.map((r) => r.id).sort();
    const storageIds = storage.loadRecords().map((r) => r.id).sort();

    expect(stateIds).toEqual(storageIds);
    expect(storageIds).not.toContain(r2.id);
    expect(storageIds).toContain(r1.id);
  });

  it('refresh 후에도 삭제된 항목이 복원되지 않는다', async () => {
    const toKeep = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const toDelete = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const { result } = await renderAndWait();

    doDelete(result, toDelete.id);

    // refresh 호출
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('ready');
    });

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    const idsAfterRefresh = result.current.state.records.map((r) => r.id);
    expect(idsAfterRefresh).not.toContain(toDelete.id);
    expect(idsAfterRefresh).toContain(toKeep.id);
    expect(idsAfterRefresh).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. 검색/필터 상태에서의 삭제
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — 검색/필터 상태에서도 정확한 제외', () => {
  it('검색어로 필터링된 상태에서 항목 삭제 시 records와 totalCount 모두 반영된다', async () => {
    storage.saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 하루',
    }));
    storage.saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '좋은 운세',
    }));
    storage.saveRecord(makeInput({
      mainHexagram: '3. 둔(屯)',
      aiInterpretation: '나쁨',
    }));

    const { result } = await renderAndWait({ search: '좋은' });

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(2);
    expect(result.current.state.totalCount).toBe(3);

    const toDelete = result.current.state.records[0];
    doDelete(result, toDelete.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(1);
    expect(result.current.state.totalCount).toBe(2);
    expect(result.current.state.records[0].id).not.toBe(toDelete.id);
  });

  it('필터에 해당하지 않는 항목을 삭제해도 records는 그대로고 totalCount만 감소한다', async () => {
    storage.saveRecord(makeInput({
      mainHexagram: '1. 건(乾)',
      aiInterpretation: '좋은 하루',
    }));
    const toDelete = storage.saveRecord(makeInput({
      mainHexagram: '2. 곤(坤)',
      aiInterpretation: '나쁨',
    }));

    const { result } = await renderAndWait({ search: '좋은' });

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');

    expect(result.current.state.records).toHaveLength(1);
    expect(result.current.state.totalCount).toBe(2);

    doDelete(result, toDelete.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    // records는 그대로 (해당 항목이 애초에 검색 결과에 없었음)
    expect(result.current.state.records).toHaveLength(1);
    // totalCount만 감소
    expect(result.current.state.totalCount).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. 엣지 케이스
// ═════════════════════════════════════════════════════════════════════════════

describe('useHistoryList 삭제 — 엣지 케이스', () => {
  it('50개 저장 후 하나 삭제해도 정상 동작한다', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      const r = storage.saveRecord(makeInput({ mainHexagram: `${i + 1}. test` }));
      ids.push(r.id);
    }

    const { result } = await renderAndWait();

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.totalCount).toBe(50);

    doDelete(result, ids[24]);
    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.totalCount).toBe(49);
    expect(result.current.state.records).toHaveLength(49);
  });

  it('ViewCount가 높은 기록도 정상 삭제된다', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    storage.getRecordById(record.id);
    storage.getRecordById(record.id);
    storage.getRecordById(record.id);

    const { result } = await renderAndWait();

    expect(doDelete(result, record.id)).toBe(true);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(0);
    expect(result.current.state.totalCount).toBe(0);
  });

  it('freeMemo가 있는 기록도 정상 삭제된다', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    storage.updateRecord(record.id, { freeMemo: '중요: 다시 확인할 것' });

    const { result } = await renderAndWait();

    expect(doDelete(result, record.id)).toBe(true);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records).toHaveLength(0);
  });

  it('가장 최신 기록 삭제 후 다음 기록이 최신 위치로 온다', async () => {
    const _r1 = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const _r2 = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const r4 = storage.saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));

    const { result } = await renderAndWait();

    doDelete(result, r4.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');
    expect(result.current.state.records[0].id).toBe(r3.id);
    expect(result.current.state.records).toHaveLength(3);
  });

  it('가장 오래된 기록 삭제 후 나머지 순서 유지', async () => {
    const r1 = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const r3 = storage.saveRecord(makeInput({ mainHexagram: '3. 둔(屯)' }));
    const r4 = storage.saveRecord(makeInput({ mainHexagram: '4. 몽(蒙)' }));

    const { result } = await renderAndWait();

    doDelete(result, r1.id);

    if (result.current.state.status !== 'ready')
      throw new Error('Expected ready');

    const ids = result.current.state.records.map((r) => r.id);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(r4.id);
    expect(ids[1]).toBe(r3.id);
    expect(ids[2]).toBe(r2.id);
  });
});
