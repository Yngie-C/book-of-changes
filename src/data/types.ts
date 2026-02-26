// 효(Line)의 종류
export type LineType = 'yang' | 'yin';

// 변효 포함 효 종류 (동전 던지기 결과)
export type LineResult = {
  type: LineType;
  changing: boolean;   // 변효 여부 (노양/노음)
  value: 6 | 7 | 8 | 9;  // 6=노음, 7=소양, 8=소음, 9=노양
};

// 8괘 (팔괘, Trigram)
export type Trigram = {
  name: string;        // 건, 태, 리, 진, 손, 감, 간, 곤
  chinese: string;     // 乾, 兌, 離, 震, 巽, 坎, 艮, 坤
  nature: string;      // 하늘, 못, 불, 우뢰, 바람, 물, 산, 땅
  lines: [LineType, LineType, LineType];  // [1효, 2효, 3효] (아래→위)
};

// 개별 효사
export type HexagramLine = {
  position: number;      // 1~6 (초효~상효)
  text: string;          // 효사 원문 (한글 번역)
  interpretation: string; // 효사 해석
};

// 64괘 (Hexagram)
export type Hexagram = {
  number: number;        // 1~64 (King Wen 순서)
  name: string;          // 괘 이름 (한글)
  chinese: string;       // 한자 표기
  unicode: string;       // 유니코드 괘 기호
  upperTrigram: string;  // 상괘 이름
  lowerTrigram: string;  // 하괘 이름
  keyword: string;       // 핵심 키워드
  description: string;   // 괘사
  descriptionOriginal?: string; // 괘사 원문 (한문)
  descriptionReading?: string;  // 괘사 독음 (한글)
  judgment: string;      // 단전
  judgmentOriginal?: string;    // 단전 원문 (한문)
  judgmentReading?: string;     // 단전 독음 (한글)
  image: string;         // 상전
  imageOriginal?: string;       // 상전 원문 (한문)
  imageReading?: string;        // 상전 독음 (한글)
  lines: HexagramLine[]; // 6개 효사
};

// 점 세션 상태
export type DivinationSession = {
  currentStep: number;
  lines: LineResult[];
  isComplete: boolean;
  hexagramNumber: number | null;
  changingHexagramNumber: number | null;
  changingLineCount: number;
};

// 화면 라우팅 상태
export type PageRoute = 'home' | 'divination' | 'result';

// 해석 규칙 결과
export type InterpretationResult = {
  type: 'hexagram-only' | 'single-line' | 'double-line' | 'both-hexagrams' | 'changing-fixed-lines' | 'changing-single-fixed' | 'changing-hexagram-only';
  description: string;
  primaryHexagram: 'original' | 'changing';
  highlightedLines: number[];
};
