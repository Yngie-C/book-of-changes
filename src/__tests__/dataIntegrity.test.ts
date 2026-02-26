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
});
