import { describe, it, expect } from 'vitest';
import { getInterpretationRule } from '@/utils/interpretationRule';
import type { LineResult } from '@/data/types';

function makeLine(type: 'yang' | 'yin', changing = false): LineResult {
  return {
    type,
    changing,
    value: type === 'yang' ? (changing ? 9 : 7) : (changing ? 6 : 8),
  };
}

// Build a 6-line array with specified positions (1-indexed) as changing
function makeLines(changingPositions: number[]): LineResult[] {
  return Array.from({ length: 6 }, (_, i) => {
    const pos = i + 1;
    return makeLine('yang', changingPositions.includes(pos));
  });
}

describe('getInterpretationRule', () => {
  it('0 changing lines → hexagram-only, read original hexagram only', () => {
    const lines = makeLines([]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('hexagram-only');
    expect(result.primaryHexagram).toBe('original');
    expect(result.highlightedLines).toEqual([]);
  });

  it('1 changing line → single-line, highlights that position', () => {
    const lines = makeLines([3]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('single-line');
    expect(result.primaryHexagram).toBe('original');
    expect(result.highlightedLines).toEqual([3]);
  });

  it('2 changing lines → double-line, sorted descending (upper first)', () => {
    const lines = makeLines([2, 5]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('double-line');
    expect(result.primaryHexagram).toBe('original');
    // sorted descending: [5, 2]
    expect(result.highlightedLines).toEqual([5, 2]);
  });

  it('2 changing lines already in order → still sorted descending', () => {
    const lines = makeLines([1, 4]);
    const result = getInterpretationRule(lines);
    expect(result.highlightedLines).toEqual([4, 1]);
  });

  it('3 changing lines → both-hexagrams, highlights all 3 positions', () => {
    const lines = makeLines([1, 3, 5]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('both-hexagrams');
    expect(result.primaryHexagram).toBe('original');
    expect(result.highlightedLines).toEqual([1, 3, 5]);
  });

  it('4 changing lines → changing-fixed-lines, highlights 2 non-changing positions from 변괘', () => {
    // positions 1,2,3,4 changing → non-changing: 5, 6
    const lines = makeLines([1, 2, 3, 4]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('changing-fixed-lines');
    expect(result.primaryHexagram).toBe('changing');
    expect(result.highlightedLines).toEqual([5, 6]);
    expect(result.highlightedLines).toHaveLength(2);
  });

  it('4 changing lines: non-changing set is correct', () => {
    // positions 2,3,5,6 changing → non-changing: 1, 4
    const lines = makeLines([2, 3, 5, 6]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('changing-fixed-lines');
    expect(result.highlightedLines).toEqual([1, 4]);
  });

  it('5 changing lines → changing-single-fixed, highlights 1 non-changing position from 변괘', () => {
    // positions 1,2,3,4,5 changing → non-changing: 6
    const lines = makeLines([1, 2, 3, 4, 5]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('changing-single-fixed');
    expect(result.primaryHexagram).toBe('changing');
    expect(result.highlightedLines).toEqual([6]);
    expect(result.highlightedLines).toHaveLength(1);
  });

  it('5 changing lines: different non-changing position', () => {
    // positions 1,2,3,5,6 changing → non-changing: 4
    const lines = makeLines([1, 2, 3, 5, 6]);
    const result = getInterpretationRule(lines);
    expect(result.highlightedLines).toEqual([4]);
  });

  it('6 changing lines → changing-hexagram-only, read changing hexagram only', () => {
    const lines = makeLines([1, 2, 3, 4, 5, 6]);
    const result = getInterpretationRule(lines);
    expect(result.type).toBe('changing-hexagram-only');
    expect(result.primaryHexagram).toBe('changing');
    expect(result.highlightedLines).toEqual([]);
  });

  it('description field is a non-empty string for all cases', () => {
    for (let count = 0; count <= 6; count++) {
      const positions = Array.from({ length: count }, (_, i) => i + 1);
      const lines = makeLines(positions);
      const result = getInterpretationRule(lines);
      expect(typeof result.description).toBe('string');
      expect(result.description.length).toBeGreaterThan(0);
    }
  });
});
