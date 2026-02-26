import { useState, useCallback } from 'react';
import type { LineResult } from '@/data/types';
import { tossCoin } from '@/utils/coinLogic';

export type CoinFace = 'front' | 'back';

export type CoinTossState = {
  isAnimating: boolean;
  coins: CoinFace[];
  result: LineResult | null;
};

export function useCoinToss() {
  const [state, setState] = useState<CoinTossState>({
    isAnimating: false,
    coins: ['front', 'front', 'front'],
    result: null,
  });

  const toss = useCallback(() => {
    setState(prev => ({ ...prev, isAnimating: true, result: null }));

    // Animate coins for 1.5 seconds then settle
    const result = tossCoin();

    // front(양)=2, back(음)=3
    // value 6 = 2+2+2 (all front/양) → 노음
    // value 7 = 2+2+3 (2양+1음)     → 소양
    // value 8 = 2+3+3 (1양+2음)     → 소음
    // value 9 = 3+3+3 (all back/음) → 노양
    const coins = randomCoinsForResult(result);

    // 1500ms animation + 300ms stagger for the third coin
    setTimeout(() => {
      setState({ isAnimating: false, coins, result });
    }, 1800);
  }, []);

  const reset = useCallback(() => {
    setState({
      isAnimating: false,
      coins: ['front', 'front', 'front'],
      result: null,
    });
  }, []);

  return { ...state, toss, reset };
}

// Generate 3 coin faces that sum to the result value
// front(양)=2, back(음)=3; sum range 6-9
function randomCoinsForResult(result: LineResult): CoinFace[] {
  const value = result.value; // 6|7|8|9
  // Enumerate possible combinations
  // value 6: [front,front,front] (2+2+2) 극양→노음
  // value 7: two front, one back (2+2+3) 2양+1음→소양
  // value 8: one front, two back (2+3+3) 1양+2음→소음
  // value 9: [back,back,back]   (3+3+3) 극음→노양
  const combinations: Record<number, CoinFace[][]> = {
    6: [['front', 'front', 'front']],
    7: [
      ['front', 'front', 'back'],
      ['front', 'back', 'front'],
      ['back', 'front', 'front'],
    ],
    8: [
      ['back', 'back', 'front'],
      ['back', 'front', 'back'],
      ['front', 'back', 'back'],
    ],
    9: [['back', 'back', 'back']],
  };

  const options = combinations[value];
  return options[Math.floor(Math.random() * options.length)];
}
