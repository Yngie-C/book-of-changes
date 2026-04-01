import { describe, it, expect } from 'vitest';
import { HEXAGRAMS } from '@/data/hexagrams';

describe('HEXAGRAMS data integrity', () => {
  it('has exactly 64 hexagrams', () => {
    expect(HEXAGRAMS).toHaveLength(64);
  });

  it('contains all numbers from 1 to 64 with no duplicates', () => {
    const numbers = HEXAGRAMS.map((h) => h.number);
    const unique = new Set(numbers);
    expect(unique.size).toBe(64);
    for (let n = 1; n <= 64; n++) {
      expect(unique.has(n)).toBe(true);
    }
  });

  it('each hexagram has a number field between 1 and 64', () => {
    for (const h of HEXAGRAMS) {
      expect(h.number).toBeGreaterThanOrEqual(1);
      expect(h.number).toBeLessThanOrEqual(64);
    }
  });

  it('each hexagram has a non-empty name field', () => {
    for (const h of HEXAGRAMS) {
      expect(typeof h.name).toBe('string');
      expect(h.name.length).toBeGreaterThan(0);
    }
  });

  it('each hexagram has a non-empty chinese field', () => {
    for (const h of HEXAGRAMS) {
      expect(typeof h.chinese).toBe('string');
      expect(h.chinese.length).toBeGreaterThan(0);
    }
  });

  it('each hexagram has a unicode field', () => {
    for (const h of HEXAGRAMS) {
      expect(typeof h.unicode).toBe('string');
      expect(h.unicode.length).toBeGreaterThan(0);
    }
  });

  it('each hexagram has a non-empty keyword field', () => {
    for (const h of HEXAGRAMS) {
      expect(typeof h.keyword).toBe('string');
      expect(h.keyword.length).toBeGreaterThan(0);
    }
  });

  it('each hexagram has interpretation fields: description, judgment, image', () => {
    for (const h of HEXAGRAMS) {
      expect(typeof h.description).toBe('string');
      expect(h.description.length).toBeGreaterThan(0);
      expect(typeof h.judgment).toBe('string');
      expect(h.judgment.length).toBeGreaterThan(0);
      expect(typeof h.image).toBe('string');
      expect(h.image.length).toBeGreaterThan(0);
    }
  });

  it('each hexagram has exactly 6 lines', () => {
    for (const h of HEXAGRAMS) {
      expect(h.lines).toHaveLength(6);
    }
  });

  it('each line has position 1-6', () => {
    for (const h of HEXAGRAMS) {
      const positions = h.lines.map((l) => l.position);
      expect(positions).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('each line has non-empty text and interpretation fields', () => {
    for (const h of HEXAGRAMS) {
      for (const line of h.lines) {
        expect(typeof line.text).toBe('string');
        expect(line.text.length).toBeGreaterThan(0);
        expect(typeof line.interpretation).toBe('string');
        expect(line.interpretation.length).toBeGreaterThan(0);
      }
    }
  });

  it('each hexagram has upperTrigram and lowerTrigram fields', () => {
    for (const h of HEXAGRAMS) {
      expect(typeof h.upperTrigram).toBe('string');
      expect(h.upperTrigram.length).toBeGreaterThan(0);
      expect(typeof h.lowerTrigram).toBe('string');
      expect(h.lowerTrigram.length).toBeGreaterThan(0);
    }
  });

  it('hexagram #1 is 중천건', () => {
    const h1 = HEXAGRAMS.find((h) => h.number === 1);
    expect(h1).toBeDefined();
    expect(h1!.name).toContain('건');
  });

  it('hexagram #2 is 중지곤', () => {
    const h2 = HEXAGRAMS.find((h) => h.number === 2);
    expect(h2).toBeDefined();
    expect(h2!.name).toContain('곤');
  });

  const hexagrams = HEXAGRAMS;

  it('각 괘에 descriptionSimple 필드가 존재하고 비어있지 않다', () => {
    hexagrams.forEach((hex) => {
      expect(hex.descriptionSimple).toBeDefined();
      expect(typeof hex.descriptionSimple).toBe('string');
      expect(hex.descriptionSimple!.length).toBeGreaterThan(0);
    });
  });

  it('descriptionSimple은 description과 같거나 description의 원문 부분을 제외한 내용이다', () => {
    // 분리된 경우: descriptionSimple !== description (약 31개 괘)
    // 미분리(전체 캐주얼) 경우: descriptionSimple === description (약 33개 괘)
    const splitCount = hexagrams.filter(h => h.descriptionSimple !== h.description).length;
    const sameCount = hexagrams.filter(h => h.descriptionSimple === h.description).length;
    expect(splitCount + sameCount).toBe(64);
    expect(splitCount).toBeGreaterThan(20); // at least 20+ hexagrams have actual splits
    expect(sameCount).toBeGreaterThan(20);  // at least 20+ hexagrams are all-casual
  });

  it('분리된 괘의 description은 캐주얼 마커(~요)로 끝나지 않는다', () => {
    const splitHexagrams = hexagrams.filter(h => h.descriptionSimple !== h.description);
    splitHexagrams.forEach((hex) => {
      // The classical/formal description should not end with casual markers
      const lastChar = hex.description.trimEnd().slice(-1);
      expect(lastChar).not.toBe('요');
    });
  });
});
