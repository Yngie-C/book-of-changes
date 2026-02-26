import type { LineResult } from '../data/types';
import { linesToTrigramIndex } from '../data/trigrams';
import { lookupHexagramNumber } from '../data/kingWenTable';

// 6효 배열 → 64괘 번호
// lines[0]=1효(초효), lines[5]=6효(상효)
export function linesToHexagramNumber(lines: LineResult[]): number {
  // 하괘: 1~3효 (lines[0..2])
  const lowerLines: [LineResult['type'], LineResult['type'], LineResult['type']] = [
    lines[0].type,
    lines[1].type,
    lines[2].type,
  ];
  // 상괘: 4~6효 (lines[3..5])
  const upperLines: [LineResult['type'], LineResult['type'], LineResult['type']] = [
    lines[3].type,
    lines[4].type,
    lines[5].type,
  ];

  const lowerIndex = linesToTrigramIndex(lowerLines);
  const upperIndex = linesToTrigramIndex(upperLines);

  return lookupHexagramNumber(upperIndex, lowerIndex);
}
