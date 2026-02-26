import type { Hexagram } from './types';
import { hexagramsPart1 } from './hexagrams_part1';
import { hexagramsPart2 } from './hexagrams_part2';
import { hexagramsPart3 } from './hexagrams_part3';
import { hexagramsPart4 } from './hexagrams_part4';
import { hexagramsPart5 } from './hexagrams_part5';
import { hexagramsPart6 } from './hexagrams_part6';
import { hexagramsPart7 } from './hexagrams_part7';
import { hexagramsPart8 } from './hexagrams_part8';

// 64괘 전체 데이터 (King Wen 순서)
export const HEXAGRAMS: Hexagram[] = [
  ...hexagramsPart1,  // #1-8:   중천건 ~ 수지비
  ...hexagramsPart2,  // #9-16:  풍천소축 ~ 뇌지예
  ...hexagramsPart3,  // #17-24: 택뢰수 ~ 지뢰복
  ...hexagramsPart4,  // #25-32: 천뢰무망 ~ 뇌풍항
  ...hexagramsPart5,  // #33-40: 천산둔 ~ 뇌수해
  ...hexagramsPart6,  // #41-48: 산택손 ~ 수풍정
  ...hexagramsPart7,  // #49-56: 택화혁 ~ 화산여
  ...hexagramsPart8,  // #57-64: 중풍손 ~ 화수미제
];
