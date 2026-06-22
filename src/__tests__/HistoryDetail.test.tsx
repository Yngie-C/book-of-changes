import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HistoryDetail from '@/components/History/HistoryDetail';
import type { DivinationRecord } from '@/data/types';

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * 기본 팩토리: mainHexagram '1. 건(乾)', changingLines [1~6] (전변)
 * → 계산되는 변괘 = 2. 곤(坤)
 */
function makeRecord(
  overrides?: Partial<DivinationRecord>,
): DivinationRecord {
  return {
    id: 'test-id-001',
    timestamp: '2026-06-02T12:00:00.000Z',
    mainHexagram: '1. 건(乾)',
    changingHexagram: '2. 곤(坤)',
    changingLines: [1, 2, 3, 4, 5, 6],
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
  it('renders the hexagram name via HexagramInfo', () => {
    const record = makeRecord({ mainHexagram: '1. 건(乾)' });
    render(<HistoryDetail record={record} />);
    // HexagramInfo renders "제1괘 건" — text split across elements, use regex
    expect(screen.getByText(/제1괘.*건/)).toBeTruthy();
  });

  it('renders the hexagram unicode symbol when valid number', () => {
    const record = makeRecord({ mainHexagram: '1. 건(乾)' });
    render(<HistoryDetail record={record} />);
    // ䷀ is the unicode for hexagram #1 (중천건)
    expect(screen.getByText('䷀')).toBeTruthy();
  });

  it('renders the changing hexagram name (computed from lines)', () => {
    // hexagram 1 (건), all 6 lines changing → hexagram 2 (곤)
    const record = makeRecord({
      mainHexagram: '1. 건(乾)',
      changingLines: [1, 2, 3, 4, 5, 6],
    });
    render(<HistoryDetail record={record} />);
    // HexagramInfo renders "제2괘 곤" for the changing hexagram
    expect(screen.getByText(/제2괘.*곤/)).toBeTruthy();
  });

  it('does not render changing hexagram section when no changing lines', () => {
    const record = makeRecord({ changingLines: [] });
    render(<HistoryDetail record={record} />);
    // "변괘" section title should NOT appear
    expect(screen.queryByText('변괘')).toBeNull();
  });
});

// ─── Card structure ─────────────────────────────────────────────────────────

describe('card structure', () => {
  it('renders 효 구성 section title', () => {
    const record = makeRecord();
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('효 구성')).toBeTruthy();
  });

  it('renders 괘사 section title', () => {
    const record = makeRecord();
    render(<HistoryDetail record={record} />);
    // Interpretation also renders "괘사" label, so use getAllByText
    const labels = screen.getAllByText(/괘사/);
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders 효사 section title', () => {
    const record = makeRecord();
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/효사/)).toBeTruthy();
  });

  it('renders 변괘 section title when changing hexagram exists', () => {
    const record = makeRecord({ changingLines: [1, 2, 3, 4, 5, 6] });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('변괘')).toBeTruthy();
  });
});

// ─── Changing guide ─────────────────────────────────────────────────────────

describe('changing guide', () => {
  it('renders ChangingGuide when changingLines present', () => {
    const record = makeRecord({ changingLines: [2, 5] });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('변효 해석 가이드')).toBeTruthy();
  });

  it('does not render ChangingGuide when changingLines empty', () => {
    const record = makeRecord({ changingLines: [] });
    render(<HistoryDetail record={record} />);
    expect(screen.queryByText('변효 해석 가이드')).toBeNull();
  });
});

// ─── Date formatting ────────────────────────────────────────────────────────

describe('date formatting', () => {
  it('formats timestamp in yyyy.mm.dd HH:MM format', () => {
    const record = makeRecord({ timestamp: '2026-06-02T14:30:00.000Z' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/2026\.06\.02/)).toBeTruthy();
  });

  it('handles invalid timestamp gracefully', () => {
    const record = makeRecord({ timestamp: 'not-a-date' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('not-a-date')).toBeTruthy();
  });
});

// ─── View count ─────────────────────────────────────────────────────────────

describe('view count', () => {
  it('renders view count', () => {
    const record = makeRecord({ viewCount: 5 });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/5.*회.*조회/)).toBeTruthy();
  });

  it('renders zero view count', () => {
    const record = makeRecord({ viewCount: 0 });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText(/0.*회.*조회/)).toBeTruthy();
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

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles invalid hexagram string gracefully (shows fallback)', () => {
    const record = makeRecord({ mainHexagram: 'invalid' });
    render(<HistoryDetail record={record} />);
    expect(screen.getByText('기록 데이터를 불러올 수 없습니다.')).toBeTruthy();
  });

  it('renders with maximal data (all optional fields filled)', () => {
    const record = makeRecord({
      mainHexagram: '30. 이(離)',
      changingLines: [1, 2, 3, 4, 5, 6],
      aiInterpretation: '풍부한 해석입니다.',
      userQuestion: '무엇이든 물어보세요',
      freeMemo: '상세 메모',
      viewCount: 99,
    });
    const { container } = render(<HistoryDetail record={record} />);
    const fullText = container.textContent ?? '';

    // HexagramInfo renders "제30괘 이" and "제29괘 감" for changing hexagram
    expect(fullText).toContain('제30');
    expect(fullText).toContain('이');
    expect(fullText).toContain('제29');
    expect(fullText).toContain('감');
    // Optional sections
    expect(fullText).toContain('풍부한 해석입니다.');
    expect(fullText).toContain('무엇이든 물어보세요');
    expect(fullText).toContain('상세 메모');
    expect(fullText).toContain('99');
    expect(fullText).toContain('회 조회');
  });

  it('renders with minimal data (only required fields)', () => {
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
    expect(screen.getByText(/제1괘.*건/)).toBeTruthy();
    // 변괘 section absent (no changing lines)
    expect(screen.queryByText('변괘')).toBeNull();
    // Optional sections absent
    expect(screen.queryByText('AI 맞춤 해석')).toBeNull();
    expect(screen.queryByText('질문')).toBeNull();
    expect(screen.queryByText('메모')).toBeNull();
  });
});