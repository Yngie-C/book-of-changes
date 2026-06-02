import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistoryDetail from '@/components/History/HistoryDetail';
import type { DivinationRecord } from '@/data/types';

// ─── Factory ────────────────────────────────────────────────────────────────

function makeRecord(
  overrides?: Partial<DivinationRecord>,
): DivinationRecord {
  return {
    id: 'test-id-001',
    timestamp: '2026-06-02T12:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: '2. 곤(坤)',
    changingLines: [2, 5],
    aiInterpretation: '이것은 테스트 해석입니다.',
    userQuestion: '오늘의 운세',
    freeMemo: '',
    lastViewedAt: null,
    viewCount: 0,
    createdAt: '2026-06-02T12:00:00.000Z',
    updatedAt: '2026-06-02T12:00:00.000Z',
    ...overrides,
  };
}

// ─── Basic rendering ────────────────────────────────────────────────────────

describe('basic rendering', () => {
  it('renders the main hexagram name', () => {
    const record = makeRecord({ mainHexagram: '1. 건(乾)' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('1. 건(乾)')).toBeTruthy();
  });

  it('renders the hexagram unicode symbol when valid number', () => {
    const record = makeRecord({ mainHexagram: '1. 건(乾)' });
    render(<HistoryDetail record={record} />);
    // ䷀ is the unicode for hexagram #1 (중천건)
    expect(screen.getByText('䷀')).toBeTruthy();
  });

  it('renders the changing hexagram when present', () => {
    const record = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingHexagram: '2. 곤(坤)',
    });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('2. 곤(坤)')).toBeTruthy();
  });

  it('does not render changing hexagram when null', () => {
    const record = makeRecord({ changingHexagram: null });
    render(<HistoryDetail record={record} />);
    // "본괘" label appears only once in the header
    const benGwaLabels = screen.getAllByText('본괘');
    expect(benGwaLabels.length).toBe(1);
    // "변괘" should NOT appear as a label
    expect(screen.queryByText('변괘')).toBeNull();
  });
});

// ─── Changing lines ────────────────────────────────────────────────────────

describe('changing lines', () => {
  it('renders changing line positions in Korean', () => {
    const record = makeRecord({ changingLines: [1, 3, 6] });
    render(<HistoryDetail record={record} />);
    // 초효 · 3효 · 상효
    expect(screen.getByText(/초효/)).toBeTruthy();
    expect(screen.getByText(/3효/)).toBeTruthy();
    expect(screen.getByText(/상효/)).toBeTruthy();
  });

  it('renders "없음" when no changing lines', () => {
    const record = makeRecord({ changingLines: [] });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/없음/)).toBeTruthy();
  });
});

// ─── Date formatting ────────────────────────────────────────────────────────

describe('date formatting', () => {
  it('formats timestamp in yyyy.mm.dd HH:MM format', () => {
    const record = makeRecord({ timestamp: '2026-06-02T14:30:00.000Z' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/2026\.06\.02/)).toBeTruthy();
  });

  it('renders lastViewedAt when present', () => {
    const record = makeRecord({
      lastViewedAt: '2026-06-01T09:00:00.000Z',
    });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('마지막 조회')).toBeTruthy();
  });
});

// ─── View count ─────────────────────────────────────────────────────────────

describe('view count', () => {
  it('renders view count', () => {
    const record = makeRecord({ viewCount: 5 });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('5회')).toBeTruthy();
  });

  it('renders zero view count', () => {
    const record = makeRecord({ viewCount: 0 });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('0회')).toBeTruthy();
  });
});

// ─── User question ──────────────────────────────────────────────────────────

describe('user question', () => {
  it('renders user question when present', () => {
    const record = makeRecord({ userQuestion: '취업운이 궁금해요' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('취업운이 궁금해요')).toBeTruthy();
  });

  it('does not render question section when empty string', () => {
    const record = makeRecord({ userQuestion: '' });
    render(<HistoryDetail record={record} />);
    expect(screen.queryByText('질문')).toBeNull();
  });
});

// ─── AI interpretation ──────────────────────────────────────────────────────

describe('AI interpretation', () => {
  it('renders AI interpretation text', () => {
    const record = makeRecord({
      aiInterpretation: '매우 좋은 운세입니다. 모든 일이 순조로울 것입니다.',
    });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/매우 좋은 운세입니다/)).toBeTruthy();
  });

  it('does not render AI section when empty string', () => {
    const record = makeRecord({ aiInterpretation: '' });
    render(<HistoryDetail record={record} />);
    expect(screen.queryByText('AI 맞춤 해석')).toBeNull();
  });

  it('renders multi-line AI interpretation preserving whitespace', () => {
    const record = makeRecord({
      aiInterpretation: '첫째 줄\n둘째 줄\n셋째 줄',
    });
    render(<HistoryDetail record={record} />);
    const elem = screen.getByText(/첫째 줄/);
    expect(elem.style.whiteSpace).toBe('pre-wrap');
  });
});

// ─── Free memo ──────────────────────────────────────────────────────────────

describe('free memo', () => {
  it('renders free memo when non-empty', () => {
    const record = makeRecord({ freeMemo: '중요한 메모입니다' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('중요한 메모입니다')).toBeTruthy();
  });

  it('does not render memo section when empty string', () => {
    const record = makeRecord({ freeMemo: '' });
    render(<HistoryDetail record={record} />);
    expect(screen.queryByText('메모')).toBeNull();
  });
});

// ─── Section labels ─────────────────────────────────────────────────────────

describe('section labels', () => {
  it('renders 본괘 label for main hexagram', () => {
    const record = makeRecord();
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('본괘')).toBeTruthy();
  });

  it('does not render 변괘 label when changingHexagram is null', () => {
    const record = makeRecord({ changingHexagram: null });
    render(<HistoryDetail record={record} />);
    expect(screen.queryByText('변괘')).toBeNull();
  });

  it('renders 변괘 label when changingHexagram is present', () => {
    const record = makeRecord({ changingHexagram: '2. 곤(坤)' });
    render(<HistoryDetail record={record} />);
    // 본괘 + 변괘 labels
    const labels = screen.getAllByText(/괘$/);
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles invalid hexagram string gracefully (still renders text)', () => {
    const record = makeRecord({ mainHexagram: 'invalid' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('invalid')).toBeTruthy();
    // Should not crash if unicode lookup fails
  });

  it('handles invalid timestamp gracefully', () => {
    const record = makeRecord({ timestamp: 'not-a-date' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('not-a-date')).toBeTruthy();
  });

  it('renders with maximal data (all ontology fields filled)', () => {
    const record = makeRecord({
      mainHexagram: '30. 이(離)',
      changingHexagram: '31. 함(咸)',
      changingLines: [1, 2, 3, 4, 5, 6],
      aiInterpretation: '풍부한 해석입니다.',
      userQuestion: '무엇이든 물어보세요',
      freeMemo: '상세 메모',
      lastViewedAt: '2026-06-02T10:00:00.000Z',
      viewCount: 99,
    });
    render(<HistoryDetail record={record} />);

    expect(screen.getByText('30. 이(離)')).toBeTruthy();
    expect(screen.getByText('31. 함(咸)')).toBeTruthy();
    expect(screen.getByText('풍부한 해석입니다.')).toBeTruthy();
    expect(screen.getByText('무엇이든 물어보세요')).toBeTruthy();
    expect(screen.getByText('상세 메모')).toBeTruthy();
    expect(screen.getByText('99회')).toBeTruthy();
  });

  it('renders with minimal data (only required ontology fields)', () => {
    const record: DivinationRecord = {
      id: 'minimal-001',
      timestamp: '2026-06-02T00:00:00.000Z',
      mainHexagram: '1. 건(乾)',
      changingHexagram: null,
      changingLines: [],
      aiInterpretation: '',
      userQuestion: '',
      freeMemo: '',
      lastViewedAt: null,
      viewCount: 0,
      createdAt: '2026-06-02T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
    };
    render(<HistoryDetail record={record} />);

    // Core hexagram info renders
    expect(screen.getByText('1. 건(乾)')).toBeTruthy();
    // 변괘 section absent
    expect(screen.queryByText('변괘')).toBeNull();
    // Optional sections absent
    expect(screen.queryByText('AI 맞춤 해석')).toBeNull();
    expect(screen.queryByText('질문')).toBeNull();
    expect(screen.queryByText('메모')).toBeNull();
  });
});
