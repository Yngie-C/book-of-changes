import type { LineResult } from '../data/types';

// 동전 1개: 앞(양)=2, 뒤(음)=3
// 다수결이 직관적으로 작동:  2양+1음=7(소양), 1양+2음=8(소음)
// 극양(3양)=6(노음), 극음(3음)=9(노양) → 물극필반 원리
function tossOneCoin(): 2 | 3 {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % 2 === 0 ? 2 : 3;
}

// 동전 3개를 던져 하나의 효를 결정
// 합산: 6=노음(yin,changing), 7=소양(yang,fixed),
//       8=소음(yin,fixed),    9=노양(yang,changing)
export function tossCoin(): LineResult {
  const sum = (tossOneCoin() + tossOneCoin() + tossOneCoin()) as 6 | 7 | 8 | 9;

  switch (sum) {
    case 6:
      return { type: 'yin', changing: true, value: 6 };
    case 7:
      return { type: 'yang', changing: false, value: 7 };
    case 8:
      return { type: 'yin', changing: false, value: 8 };
    case 9:
      return { type: 'yang', changing: true, value: 9 };
  }
}
