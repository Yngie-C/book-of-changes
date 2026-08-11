/**
 * useHistoryList 핀(pin) 토글 상태 갱신 테스트
 *
 * 검증 범위:
 * 1. togglePin 호출 시 localStorage + 로컬 상태가 함께 갱신
 * 2. 핀 상태가 즉시 반영되어 목록 최상단으로 이동
 * 3. 핀 해제 시 원래 위치로 복귀
 * 4. 핀 상한(PIN_LIMIT=25) 도달 시 togglePin false 반환
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHistoryList } from '@/hooks/useHistoryList';
import { saveRecord, pinRecord, isPinned, PIN_LIMIT } from '@/lib/storage';
import type { CreateRecordInput } from '@/data/types';

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

async function renderAndWait(options?: Parameters<typeof useHistoryList>[0]) {
  const hook = renderHook(() => useHistoryList(options));
  await waitFor(() => {
    expect(hook.result.current.state.status).toBe('ready');
  });
  return hook;
}

describe('useHistoryList 핀 토글', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('togglePin 호출 시 localStorage와 상태가 함께 갱신된다', async () => {
    const r = saveRecord(makeInput());
    const hook = await renderAndWait();

    let ok = false;
    act(() => {
      ok = hook.result.current.togglePin(r.id);
    });

    expect(ok).toBe(true);
    // localStorage 반영
    const loaded = await import('@/lib/storage').then((m) => m.loadRecords());
    expect(isPinned(loaded.find((x) => x.id === r.id)!)).toBe(true);
    // 상태 반영
    const rec = hook.result.current.state.status === 'ready'
      ? hook.result.current.state.records.find((x) => x.id === r.id)
      : undefined;
    expect(isPinned(rec!)).toBe(true);
  });

  it('핀 고정 시 목록 최상단으로 이동한다', async () => {
    // 두 기록 저장 (r2가 더 최신)
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const r2 = saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));
    const hook = await renderAndWait();

    // r1을 핀 고정
    act(() => {
      hook.result.current.togglePin(r1.id);
    });

    const records = hook.result.current.state.status === 'ready'
      ? hook.result.current.state.records
      : [];
    // r1이 맨 앞
    expect(records[0].id).toBe(r1.id);
    expect(isPinned(records[0])).toBe(true);
    // r2는 그 뒤
    expect(records[1].id).toBe(r2.id);
  });

  it('핀 해제 시 핀 고정 섹션에서 제외된다', async () => {
    const r1 = saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    pinRecord(r1.id);
    const hook = await renderAndWait();

    // r1 핀 해제
    act(() => {
      hook.result.current.togglePin(r1.id);
    });

    const records = hook.result.current.state.status === 'ready'
      ? hook.result.current.state.records
      : [];
    expect(isPinned(records.find((x) => x.id === r1.id)!)).toBe(false);
  });

  it('핀 상한(PIN_LIMIT=25) 도달 시 추가 핀은 실패한다', async () => {
    // PIN_LIMIT만큼 핀 고정 + 1개는 일반
    const pinnedIds: string[] = [];
    for (let i = 0; i < PIN_LIMIT; i++) {
      const r = saveRecord(makeInput({ mainHexagram: `P${i}. 건(乾)` }));
      pinnedIds.push(r.id);
      pinRecord(r.id);
    }
    const extra = saveRecord(makeInput({ mainHexagram: 'extra. 건(乾)' }));
    const hook = await renderAndWait();

    // 상한 초과 핀 시도
    let ok = true;
    act(() => {
      ok = hook.result.current.togglePin(extra.id);
    });
    expect(ok).toBe(false);

    // 핀 개수는 여전히 PIN_LIMIT 유지
    const records = hook.result.current.state.status === 'ready'
      ? hook.result.current.state.records
      : [];
    expect(records.filter((x) => isPinned(x)).length).toBe(PIN_LIMIT);
  });
});
