import type { LineResult, InterpretationResult } from '../data/types';

// 변효 수에 따른 해석 규칙 (주역 전통 해석법)
export function getInterpretationRule(lines: LineResult[]): InterpretationResult {
  const changingPositions = lines
    .map((line, i) => (line.changing ? i + 1 : null))
    .filter((pos): pos is number => pos !== null);

  const count = changingPositions.length;

  switch (count) {
    case 0:
      return {
        type: 'hexagram-only',
        description: '변효 없음 — 본괘의 괘사만 해석합니다.',
        primaryHexagram: 'original',
        highlightedLines: [],
      };

    case 1:
      return {
        type: 'single-line',
        description: `변효 1개(${changingPositions[0]}효) — 해당 변효의 효사를 해석합니다.`,
        primaryHexagram: 'original',
        highlightedLines: changingPositions,
      };

    case 2: {
      // 상위 효(번호 큰 쪽) 우선
      const sorted = [...changingPositions].sort((a, b) => b - a);
      return {
        type: 'double-line',
        description: `변효 2개(${sorted[1]}효, ${sorted[0]}효) — 상위 효(${sorted[0]}효) 효사를 우선 해석합니다.`,
        primaryHexagram: 'original',
        highlightedLines: sorted,
      };
    }

    case 3:
      return {
        type: 'both-hexagrams',
        description: '변효 3개 — 본괘와 변괘의 괘사를 함께 해석합니다.',
        primaryHexagram: 'original',
        highlightedLines: changingPositions,
      };

    case 4: {
      // 변괘 기준 고정 효(비변효) 2개
      const fixedPositions = lines
        .map((line, i) => (!line.changing ? i + 1 : null))
        .filter((pos): pos is number => pos !== null);
      return {
        type: 'changing-fixed-lines',
        description: `변효 4개 — 변괘 기준 고정 효(${fixedPositions.join(', ')}효) 2개의 효사를 해석합니다.`,
        primaryHexagram: 'changing',
        highlightedLines: fixedPositions,
      };
    }

    case 5: {
      // 변괘 기준 고정 효(비변효) 1개
      const fixedPositions = lines
        .map((line, i) => (!line.changing ? i + 1 : null))
        .filter((pos): pos is number => pos !== null);
      return {
        type: 'changing-single-fixed',
        description: `변효 5개 — 변괘 기준 고정 효(${fixedPositions[0]}효) 1개의 효사를 해석합니다.`,
        primaryHexagram: 'changing',
        highlightedLines: fixedPositions,
      };
    }

    case 6:
      return {
        type: 'changing-hexagram-only',
        description: '변효 6개(전변) — 변괘의 괘사만 해석합니다.',
        primaryHexagram: 'changing',
        highlightedLines: [],
      };

    default:
      return {
        type: 'hexagram-only',
        description: '본괘의 괘사를 해석합니다.',
        primaryHexagram: 'original',
        highlightedLines: [],
      };
  }
}
