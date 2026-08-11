/**
 * 핀(pin) 고정 — storage 레벨 테스트
 *
 * 핀 기능의 핵심: 저장 상한(MAX_RECORDS=50) 초과 시에도 핀 고정 기록은
 * evict(자동 삭제)로부터 보호된다. 핀 상한은 PIN_LIMIT=25.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isPinned,
  pinRecord,
  unpinRecord,
  togglePinRecord,
  getPinnedCount,
  countPinnedRecords,
  saveRecord,
  loadRecords,
} from '@/lib/storage';
import type { CreateRecordInput } from '@/data/types';

function makeRecordInput(overrides: Partial<CreateRecordInput> = {}): CreateRecordInput {
  return {
    mainHexagram: '1. 건(乾)',
    changingLines: [],
    ...overrides,
  };
}

describe('핀 고정 (storage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isPinned', () => {
    it('pinnedAt이 값이 있으면 핀 상태', () => {
      const record = saveRecord(makeRecordInput());
      const pinned = pinRecord(record.id);
      expect(pinned).toBe(true);
      const [loaded] = loadRecords();
      expect(isPinned(loaded!)).toBe(true);
    });

    it('pinnedAt이 null이면 핀 아님', () => {
      saveRecord(makeRecordInput());
      const [loaded] = loadRecords();
      expect(loaded).toBeDefined();
      expect(isPinned(loaded!)).toBe(false);
    });
  });

  describe('pinRecord / unpinRecord', () => {
    it('핀 고정 후 기록의 pinnedAt이 채워진다', () => {
      const r = saveRecord(makeRecordInput());
      const ok = pinRecord(r.id);
      expect(ok).toBe(true);
      const [loaded] = loadRecords();
      expect(loaded!.pinnedAt).toBeTruthy();
    });

    it('핀 해제 시 pinnedAt이 null이 된다', () => {
      const r = saveRecord(makeRecordInput());
      pinRecord(r.id);
      const ok = unpinRecord(r.id);
      expect(ok).toBe(true);
      const [loaded] = loadRecords();
      expect(loaded!.pinnedAt).toBeNull();
    });

    it('존재하지 않는 ID는 false를 반환', () => {
      expect(pinRecord('nonexistent')).toBe(false);
      expect(unpinRecord('nonexistent')).toBe(false);
    });
  });

  describe('togglePinRecord', () => {
    it('핀 아님 → 핀으로 토글', () => {
      const r = saveRecord(makeRecordInput());
      expect(togglePinRecord(r.id)).toBe(true);
      const [loaded] = loadRecords();
      expect(isPinned(loaded!)).toBe(true);
    });

    it('핀 → 해제로 토글', () => {
      const r = saveRecord(makeRecordInput());
      togglePinRecord(r.id);
      expect(togglePinRecord(r.id)).toBe(true);
      const [loaded] = loadRecords();
      expect(isPinned(loaded!)).toBe(false);
    });
  });

  describe('핀 상한 (PIN_LIMIT = 25)', () => {
    it('25개까지 핀 고정 가능, 26번째는 실패', () => {
      // 26개 저장
      const ids: string[] = [];
      for (let i = 0; i < 26; i++) {
        const r = saveRecord(makeRecordInput({ mainHexagram: `${i + 1}. 건(乾)` }));
        ids.push(r.id);
      }
      // 25개 핀 고정
      let ok = 0;
      for (let i = 0; i < 25; i++) {
        if (pinRecord(ids[i])) ok++;
      }
      expect(ok).toBe(25);
      expect(getPinnedCount()).toBe(25);

      // 26번째 핀 시도는 실패
      expect(pinRecord(ids[25])).toBe(false);
      expect(getPinnedCount()).toBe(25);
    });
  });

  describe('evict 보호 (핀 고정 기록은 밀어내지 않음)', () => {
    it('50건 초과 시 핀 고정 기록은 유지, 핀 없는 오래된 기록부터 제거', () => {
      // 핀 고정할 첫 기록
      const first = saveRecord(makeRecordInput({ mainHexagram: '1. 건(乾)' }));
      pinRecord(first.id);

      // 나머지 49개 채워 총 50개
      for (let i = 0; i < 49; i++) {
        saveRecord(makeRecordInput({ mainHexagram: `${i + 2}. 건(乾)` }));
      }
      expect(loadRecords().length).toBe(50);

      // 하나 더 저장 → 51개 시도, 핀 고정 기록 보존 + 50개 유지
      saveRecord(makeRecordInput({ mainHexagram: '99. 건(乾)' }));

      const records = loadRecords();
      expect(records.length).toBe(50);
      // 핀 고정된 첫 기록이 여전히 존재
      expect(records.some((r) => r.id === first.id)).toBe(true);
      // 핀 고정 기록 개수는 1 유지
      expect(countPinnedRecords(records)).toBe(1);
    });

    it('모든 기록이 핀 고정이면 상한 초과 시 뒤에서부터 잘라낸다', () => {
      // 51개 모두 핀 고정 시도는 상한 25 때문에 불가 → 25개만 핀 가능.
      // 여기서는 핀 25개 + 일반 25개 = 50 채우고 1개 추가 검증
      const pinnedIds: string[] = [];
      for (let i = 0; i < 25; i++) {
        const r = saveRecord(makeRecordInput({ mainHexagram: `P${i}. 건(乾)` }));
        pinnedIds.push(r.id);
        pinRecord(r.id);
      }
      for (let i = 0; i < 25; i++) {
        saveRecord(makeRecordInput({ mainHexagram: `N${i}. 건(乾)` }));
      }
      expect(loadRecords().length).toBe(50);

      saveRecord(makeRecordInput({ mainHexagram: '99. 건(乾)' }));
      const records = loadRecords();
      expect(records.length).toBe(50);
      // 모든 핀 기록 보존
      for (const id of pinnedIds) {
        expect(records.some((r) => r.id === id)).toBe(true);
      }
      expect(countPinnedRecords(records)).toBe(25);
    });
  });

  describe('영속성 (새로고침/재접속 후 유지)', () => {
    it('핀 상태가 localStorage에 영속 저장된다', () => {
      const r = saveRecord(makeRecordInput());
      pinRecord(r.id);

      // localStorage 재읽기 시뮬레이션 (모듈 상태 초기화 없이 직접 재조회)
      const [loaded] = loadRecords();
      expect(isPinned(loaded!)).toBe(true);
      expect(loaded!.pinnedAt).toBeTruthy();
    });
  });
});
