import { describe, it, expect } from 'vitest';
import { linesToHexagramNumber } from '@/utils/hexagramLookup';
import type { LineResult } from '@/data/types';

function makeLine(type: 'yang' | 'yin', changing = false): LineResult {
  return {
    type,
    changing,
    value: type === 'yang' ? (changing ? 9 : 7) : (changing ? 6 : 8),
  };
}

describe('linesToHexagramNumber', () => {
  it('all yang lines → hexagram 1 (중천건, ☰☰)', () => {
    // 건(☰) = all yang: lower=건(7), upper=건(7) → #1
    const lines: LineResult[] = Array.from({ length: 6 }, () => makeLine('yang'));
    expect(linesToHexagramNumber(lines)).toBe(1);
  });

  it('all yin lines → hexagram 2 (중지곤, ☷☷)', () => {
    // 곤(☷) = all yin: lower=곤(0), upper=곤(0) → #2
    const lines: LineResult[] = Array.from({ length: 6 }, () => makeLine('yin'));
    expect(linesToHexagramNumber(lines)).toBe(2);
  });

  it('lower=건(☰), upper=곤(☷) → hexagram 11 (지천태)', () => {
    // lower trigram (lines 0-2): all yang = 건(index 7)
    // upper trigram (lines 3-5): all yin  = 곤(index 0)
    // 곤(地) over 건(天) = 地天泰 = #11
    const lines: LineResult[] = [
      makeLine('yang'), // line 1 (lower)
      makeLine('yang'), // line 2 (lower)
      makeLine('yang'), // line 3 (lower)
      makeLine('yin'),  // line 4 (upper)
      makeLine('yin'),  // line 5 (upper)
      makeLine('yin'),  // line 6 (upper)
    ];
    expect(linesToHexagramNumber(lines)).toBe(11);
  });

  it('lower=곤(☷), upper=건(☰) → hexagram 12 (천지비)', () => {
    // lower trigram (lines 0-2): all yin  = 곤(index 0)
    // upper trigram (lines 3-5): all yang = 건(index 7)
    // 건(天) over 곤(地) = 天地否 = #12
    const lines: LineResult[] = [
      makeLine('yin'),  // line 1 (lower)
      makeLine('yin'),  // line 2 (lower)
      makeLine('yin'),  // line 3 (lower)
      makeLine('yang'), // line 4 (upper)
      makeLine('yang'), // line 5 (upper)
      makeLine('yang'), // line 6 (upper)
    ];
    expect(linesToHexagramNumber(lines)).toBe(12);
  });

  it('returns a number between 1 and 64 for any valid input', () => {
    const lines: LineResult[] = Array.from({ length: 6 }, () => makeLine('yang'));
    const result = linesToHexagramNumber(lines);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(64);
  });
});
