import { useState, useCallback } from 'react';
import type { DivinationSession, LineResult } from '@/data/types';
import { linesToHexagramNumber } from '@/utils/hexagramLookup';
import { getChangingHexagram } from '@/utils/changingHexagram';

const initialSession: DivinationSession = {
  currentStep: 0,
  lines: [],
  isComplete: false,
  hexagramNumber: null,
  changingHexagramNumber: null,
  changingLineCount: 0,
};

export function useDivination() {
  const [session, setSession] = useState<DivinationSession>(initialSession);

  const addLine = useCallback((line: LineResult) => {
    setSession(prev => {
      const newLines = [...prev.lines, line];
      const newStep = prev.currentStep + 1;
      const isComplete = newStep >= 6;

      let hexagramNumber = null;
      let changingHexagramNumber = null;
      let changingLineCount = 0;

      if (isComplete) {
        hexagramNumber = linesToHexagramNumber(newLines);
        changingHexagramNumber = getChangingHexagram(newLines);
        changingLineCount = newLines.filter(l => l.changing).length;
      }

      return {
        currentStep: newStep,
        lines: newLines,
        isComplete,
        hexagramNumber,
        changingHexagramNumber,
        changingLineCount,
      };
    });
  }, []);

  const reset = useCallback(() => setSession(initialSession), []);

  return { session, addLine, reset };
}
