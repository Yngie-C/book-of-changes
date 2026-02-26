import type { Trigram, LineType } from './types';

// TRIGRAMS[index] — 인덱스: bit[2]=3효(MSB), bit[1]=2효, bit[0]=1효(LSB)
// yang=1, yin=0
// 0(000)=곤, 1(001)=간, 2(010)=감, 3(011)=손,
// 4(100)=진, 5(101)=리, 6(110)=태, 7(111)=건
export const TRIGRAMS: Trigram[] = [
  {
    // index 0: 000
    name: '곤',
    chinese: '坤',
    nature: '땅',
    lines: ['yin', 'yin', 'yin'],
  },
  {
    // index 1: 001
    name: '간',
    chinese: '艮',
    nature: '산',
    lines: ['yang', 'yin', 'yin'],
  },
  {
    // index 2: 010
    name: '감',
    chinese: '坎',
    nature: '물',
    lines: ['yin', 'yang', 'yin'],
  },
  {
    // index 3: 011
    name: '손',
    chinese: '巽',
    nature: '바람',
    lines: ['yang', 'yang', 'yin'],
  },
  {
    // index 4: 100
    name: '진',
    chinese: '震',
    nature: '우뢰',
    lines: ['yin', 'yin', 'yang'],
  },
  {
    // index 5: 101
    name: '리',
    chinese: '離',
    nature: '불',
    lines: ['yang', 'yin', 'yang'],
  },
  {
    // index 6: 110
    name: '태',
    chinese: '兌',
    nature: '못',
    lines: ['yin', 'yang', 'yang'],
  },
  {
    // index 7: 111
    name: '건',
    chinese: '乾',
    nature: '하늘',
    lines: ['yang', 'yang', 'yang'],
  },
];

// 팔괘 이름 → 인덱스
export const trigramNameToIndex: Record<string, number> = Object.fromEntries(
  TRIGRAMS.map((t, i) => [t.name, i])
);

// 3효 배열 → 팔괘 인덱스 (MSB-first: 3효→2효→1효)
// lines[0]=1효, lines[1]=2효, lines[2]=3효
export function linesToTrigramIndex(lines: [LineType, LineType, LineType]): number {
  const bit0 = lines[0] === 'yang' ? 1 : 0; // 1효 → LSB
  const bit1 = lines[1] === 'yang' ? 1 : 0; // 2효
  const bit2 = lines[2] === 'yang' ? 1 : 0; // 3효 → MSB
  return (bit2 << 2) | (bit1 << 1) | bit0;
}
