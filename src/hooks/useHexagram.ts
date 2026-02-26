import { useMemo } from 'react';
import type { LineResult, Hexagram } from '@/data/types';
import { linesToHexagramNumber } from '@/utils/hexagramLookup';
import { getChangingHexagram } from '@/utils/changingHexagram';
import { getInterpretationRule } from '@/utils/interpretationRule';
import { HEXAGRAMS } from '@/data/hexagrams';

export type UseHexagramResult = {
  hexagram: Hexagram | null;
  changingHexagram: Hexagram | null;
  interpretationRule: ReturnType<typeof getInterpretationRule> | null;
};

export function useHexagram(lines: LineResult[]): UseHexagramResult {
  return useMemo(() => {
    if (lines.length < 6) {
      return { hexagram: null, changingHexagram: null, interpretationRule: null };
    }

    const hexagramNumber = linesToHexagramNumber(lines);
    const changingNumber = getChangingHexagram(lines);
    const interpretationRule = getInterpretationRule(lines);

    const hexagram = HEXAGRAMS.find(h => h.number === hexagramNumber) ?? null;
    const changingHexagram = changingNumber
      ? (HEXAGRAMS.find(h => h.number === changingNumber) ?? null)
      : null;

    return { hexagram, changingHexagram, interpretationRule };
  }, [lines]);
}
