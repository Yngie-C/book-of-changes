import { describe, it, expect } from 'vitest';
import { getChangingHexagram } from '@/utils/changingHexagram';
import type { LineResult } from '@/data/types';

function makeLine(type: 'yang' | 'yin', changing = false): LineResult {
  return {
    type,
    changing,
    value: type === 'yang' ? (changing ? 9 : 7) : (changing ? 6 : 8),
  };
}

describe('getChangingHexagram', () => {
  it('returns null when there are no changing lines', () => {
    // value 7 and 8 are non-changing
    const lines: LineResult[] = [
      makeLine('yang', false), // 7
      makeLine('yin', false),  // 8
      makeLine('yang', false), // 7
      makeLine('yin', false),  // 8
      makeLine('yang', false), // 7
      makeLine('yin', false),  // 8
    ];
    expect(getChangingHexagram(lines)).toBeNull();
  });

  it('all yang changing (value 9) flips to all yin → hexagram 2 (중지곤)', () => {
    // 9 (old yang) changes to yin → all yin = 곤 lower + 곤 upper = #2
    const lines: LineResult[] = Array.from({ length: 6 }, () => makeLine('yang', true));
    expect(getChangingHexagram(lines)).toBe(2);
  });

  it('all yin changing (value 6) flips to all yang → hexagram 1 (중천건)', () => {
    // 6 (old yin) changes to yang → all yang = 건 lower + 건 upper = #1
    const lines: LineResult[] = Array.from({ length: 6 }, () => makeLine('yin', true));
    expect(getChangingHexagram(lines)).toBe(1);
  });

  it('returns a number between 1 and 64 when there are changing lines', () => {
    const lines: LineResult[] = [
      makeLine('yang', true),  // changing
      makeLine('yin', false),
      makeLine('yang', false),
      makeLine('yin', false),
      makeLine('yang', false),
      makeLine('yin', false),
    ];
    const result = getChangingHexagram(lines);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(1);
    expect(result!).toBeLessThanOrEqual(64);
  });

  it('single changing line: lower yang→yin changes to different hexagram', () => {
    // Start: all yang (hexagram 1). Change line 1 (yang→yin).
    // changed lower: [yin, yang, yang] → 손(index 3)
    // upper: [yang, yang, yang] = 건(index 7)
    // 건(天) over 손(風) = 天風姤 = #44
    const lines: LineResult[] = [
      makeLine('yang', true),  // line 1 changes: yang → yin
      makeLine('yang', false), // line 2
      makeLine('yang', false), // line 3
      makeLine('yang', false), // line 4
      makeLine('yang', false), // line 5
      makeLine('yang', false), // line 6
    ];
    expect(getChangingHexagram(lines)).toBe(44);
  });

  it('non-changing lines are preserved as-is in the changed hexagram', () => {
    // Two changing lines in upper trigram (lines 3 and 4)
    // Lower: [yin,yin,yin] = 곤(0), Upper orig: [yang,yang,yin] (lines 3=yang changing, 4=yang changing, 5=yin)
    // After change: upper: [yin,yin,yin] = 곤(0)
    // KING_WEN_TABLE[0][0] = 2
    const lines: LineResult[] = [
      makeLine('yin', false),
      makeLine('yin', false),
      makeLine('yin', false),
      makeLine('yang', true),
      makeLine('yang', true),
      makeLine('yin', false),
    ];
    const result = getChangingHexagram(lines);
    expect(result).not.toBeNull();
    expect(result).toBe(2);
  });
});
