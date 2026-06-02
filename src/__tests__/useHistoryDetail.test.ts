import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHistoryDetail } from '@/hooks/useHistoryDetail';
import * as storage from '@/lib/storage';
import type { CreateRecordInput } from '@/data/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CreateRecordInput>): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [2, 5],
    ...overrides,
  };
}

beforeEach(() => {
  storage.clearRecords();
  vi.restoreAllMocks();
});

// ─── idle state ────────────────────────────────────────────────────────────

describe('idle state', () => {
  it('returns idle when id is undefined', () => {
    const { result } = renderHook(() => useHistoryDetail(undefined));
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('returns idle when id is null', () => {
    const { result } = renderHook(() => useHistoryDetail(null));
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('returns idle when id is empty string', () => {
    const { result } = renderHook(() => useHistoryDetail(''));
    expect(result.current.state).toEqual({ status: 'idle' });
  });
});

// ─── success state ─────────────────────────────────────────────────────────

describe('success state', () => {
  it('fetches and returns the record matching the given id', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '5. 수(需)' }));

    const { result } = renderHook(() => useHistoryDetail(record.id));

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(result.current.state).toEqual({
      status: 'success',
      record: expect.objectContaining({
        id: record.id,
        mainHexagram: '5. 수(需)',
      }),
    });
  });

  it('returns record with all ontology fields', async () => {
    const record = storage.saveRecord(
      makeInput({
        mainHexagram: '2. 곤(坤)',
        changingHexagram: '3. 둔(屯)',
        changingLines: [1, 2, 3],
        aiInterpretation: '매우 좋은 운세입니다.',
        userQuestion: '취업운이 궁금해요',
      }),
    );

    const { result } = renderHook(() => useHistoryDetail(record.id));

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    if (result.current.state.status !== 'success') {
      throw new Error('Expected success state');
    }

    const r = result.current.state.record;
    expect(r.id).toBe(record.id);
    expect(r.mainHexagram).toBe('2. 곤(坤)');
    expect(r.changingHexagram).toBe('3. 둔(屯)');
    expect(r.changingLines).toEqual([1, 2, 3]);
    expect(r.aiInterpretation).toBe('매우 좋은 운세입니다.');
    expect(r.userQuestion).toBe('취업운이 궁금해요');
    expect(r.freeMemo).toBe('');
    expect(r.viewCount).toBeGreaterThanOrEqual(1);
    expect(r.lastViewedAt).toBeTruthy();
    expect(r.createdAt).toBeTruthy();
    expect(r.updatedAt).toBeTruthy();
  });

  it('increments viewCount on each fetch', async () => {
    const record = storage.saveRecord(makeInput());

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useHistoryDetail(id),
      { initialProps: { id: record.id } },
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    const viewCount1 =
      result.current.state.status === 'success'
        ? result.current.state.record.viewCount
        : -1;

    // force re-render with same id to trigger a second fetch via refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      if (result.current.state.status === 'success') {
        expect(result.current.state.record.viewCount).toBeGreaterThan(viewCount1);
      }
    });
  });
});

// ─── error state ────────────────────────────────────────────────────────────

describe('error state', () => {
  it('returns error when record does not exist', async () => {
    const { result } = renderHook(() =>
      useHistoryDetail('non-existent-id'),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status !== 'error') {
      throw new Error('Expected error state');
    }
    expect(result.current.state.message).toBe('기록을 찾을 수 없습니다.');
  });

  it('returns error when getRecordById throws', async () => {
    const spy = vi
      .spyOn(storage, 'getRecordById')
      .mockImplementation(() => {
        throw new Error('저장소 읽기 실패');
      });

    const { result } = renderHook(() =>
      useHistoryDetail('test-id'),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status !== 'error') {
      throw new Error('Expected error state');
    }
    expect(result.current.state.message).toBe('저장소 읽기 실패');

    spy.mockRestore();
  });

  it('provides fallback message when error is not an Error instance', async () => {
    const spy = vi
      .spyOn(storage, 'getRecordById')
      .mockImplementation(() => {
        throw 'unknown error';
      });

    const { result } = renderHook(() =>
      useHistoryDetail('test-id'),
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status !== 'error') {
      throw new Error('Expected error state');
    }
    expect(result.current.state.message).toBe(
      '기록을 불러오는 중 오류가 발생했습니다.',
    );

    spy.mockRestore();
  });
});

// ─── refetch ────────────────────────────────────────────────────────────────

describe('refetch', () => {
  it('reloads the record and reflects external changes', async () => {
    const record = storage.saveRecord(makeInput({ mainHexagram: '10. 리(履)' }));
    const originalViewCount = record.viewCount;

    const { result } = renderHook(() => useHistoryDetail(record.id));

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    // Trigger an external view (simulates another component viewing the record)
    storage.getRecordById(record.id);

    // Manually call refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    if (result.current.state.status !== 'success') {
      throw new Error('Expected success state');
    }

    // viewCount should reflect the external access + our re-fetch
    expect(result.current.state.record.viewCount).toBeGreaterThan(
      originalViewCount,
    );
  });
});

// ─── id change ─────────────────────────────────────────────────────────────

describe('id change', () => {
  it('transitions to new record when id changes', async () => {
    const recordA = storage.saveRecord(makeInput({ mainHexagram: '1. 건(乾)' }));
    const recordB = storage.saveRecord(makeInput({ mainHexagram: '2. 곤(坤)' }));

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useHistoryDetail(id),
      { initialProps: { id: recordA.id } },
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    if (result.current.state.status !== 'success') {
      throw new Error('Expected success state');
    }
    expect(result.current.state.record.mainHexagram).toBe('1. 건(乾)');

    // Change id to recordB
    rerender({ id: recordB.id });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    if (result.current.state.status !== 'success') {
      throw new Error('Expected success state');
    }
    expect(result.current.state.record.mainHexagram).toBe('2. 곤(坤)');
  });

  it('returns to idle when id changes to null', async () => {
    const record = storage.saveRecord(makeInput());

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useHistoryDetail(id),
      { initialProps: { id: record.id } },
    );

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    rerender({ id: null });

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'idle' });
    });
  });
});
