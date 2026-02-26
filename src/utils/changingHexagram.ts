import type { LineResult, LineType } from '../data/types';
import { linesToHexagramNumber } from './hexagramLookup';

// 변효를 반전하여 변괘 번호를 산출
// 변효가 없으면 null 반환
export function getChangingHexagram(lines: LineResult[]): number | null {
  const hasChanging = lines.some((l) => l.changing);
  if (!hasChanging) return null;

  const changedLines: LineResult[] = lines.map((line) => {
    if (!line.changing) return line;

    const flipped: LineType = line.type === 'yang' ? 'yin' : 'yang';
    // 변괘의 효는 더 이상 변효가 아님 (값도 비변효 값으로 교정)
    const newValue = flipped === 'yang' ? 7 : 8;
    return { type: flipped, changing: false, value: newValue } as LineResult;
  });

  return linesToHexagramNumber(changedLines);
}
