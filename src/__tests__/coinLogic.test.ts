import { describe, it, expect } from 'vitest';
import { tossCoin } from '@/utils/coinLogic';

describe('tossCoin', () => {
  it('returns a LineResult object with value, type, and changing fields', () => {
    const result = tossCoin();
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('changing');
  });

  it('value is one of 6, 7, 8, 9', () => {
    for (let i = 0; i < 50; i++) {
      const result = tossCoin();
      expect([6, 7, 8, 9]).toContain(result.value);
    }
  });

  it('type is yang when value is 7 or 9', () => {
    // Run many times and check consistency
    for (let i = 0; i < 200; i++) {
      const result = tossCoin();
      if (result.value === 7 || result.value === 9) {
        expect(result.type).toBe('yang');
      }
    }
  });

  it('type is yin when value is 6 or 8', () => {
    for (let i = 0; i < 200; i++) {
      const result = tossCoin();
      if (result.value === 6 || result.value === 8) {
        expect(result.type).toBe('yin');
      }
    }
  });

  it('changing is true when value is 6 or 9', () => {
    for (let i = 0; i < 200; i++) {
      const result = tossCoin();
      if (result.value === 6 || result.value === 9) {
        expect(result.changing).toBe(true);
      }
    }
  });

  it('changing is false when value is 7 or 8', () => {
    for (let i = 0; i < 200; i++) {
      const result = tossCoin();
      if (result.value === 7 || result.value === 8) {
        expect(result.changing).toBe(false);
      }
    }
  });

  it('produces all 4 values (6,7,8,9) over 100 iterations', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(tossCoin().value);
      if (seen.size === 4) break;
    }
    expect(seen.has(6)).toBe(true);
    expect(seen.has(7)).toBe(true);
    expect(seen.has(8)).toBe(true);
    expect(seen.has(9)).toBe(true);
  });
});
