/**
 * 클라이언트 TS 괘 데이터 → 서버 JSON 변환 스크립트
 * Usage: npx tsx scripts/extract-hexagrams.ts
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// tsx가 TS를 직접 실행하므로 import 가능
import { hexagramsPart1 } from '../../src/data/hexagrams_part1';
import { hexagramsPart2 } from '../../src/data/hexagrams_part2';
import { hexagramsPart3 } from '../../src/data/hexagrams_part3';
import { hexagramsPart4 } from '../../src/data/hexagrams_part4';
import { hexagramsPart5 } from '../../src/data/hexagrams_part5';
import { hexagramsPart6 } from '../../src/data/hexagrams_part6';
import { hexagramsPart7 } from '../../src/data/hexagrams_part7';
import { hexagramsPart8 } from '../../src/data/hexagrams_part8';

interface HexagramLine {
  position: number;
  text: string;
  interpretation: string;
}

interface HexagramJSON {
  number: number;
  name: string;
  chinese: string;
  keyword: string;
  description: string;
  judgment: string;
  image: string;
  lines: HexagramLine[];
}

const allParts = [
  ...hexagramsPart1,
  ...hexagramsPart2,
  ...hexagramsPart3,
  ...hexagramsPart4,
  ...hexagramsPart5,
  ...hexagramsPart6,
  ...hexagramsPart7,
  ...hexagramsPart8,
];

// 필요한 필드만 추출 (서버에 불필요한 unicode, trigram 등 제외)
const hexagrams: HexagramJSON[] = allParts
  .map(hex => ({
    number: hex.number,
    name: hex.name,
    chinese: hex.chinese,
    keyword: hex.keyword,
    description: hex.description,
    judgment: hex.judgment,
    image: hex.image,
    lines: hex.lines.map(l => ({
      position: l.position,
      text: l.text,
      interpretation: l.interpretation,
    })),
  }))
  .sort((a, b) => a.number - b.number);

if (hexagrams.length !== 64) {
  throw new Error(`Expected 64 hexagrams, got ${hexagrams.length}`);
}

const outPath = resolve(__dirname, '../src/hexagrams.json');
writeFileSync(outPath, JSON.stringify(hexagrams, null, 2), 'utf-8');
console.log(`✅ ${hexagrams.length}괘 → ${outPath}`);
