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
  description: string;   // 괘사 (해석/번역)
  descriptionSimple?: string;   // 괘사 쉬운 설명 (현대적 보충 해석)
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
export type PageRoute = 'home' | 'divination' | 'result' | 'history';

// 점술 기록 (localStorage 저장용)
export interface DivinationRecord {
  id: string;                         // UUID
  timestamp: string;                  // 점술 실행 일시 (ISO 8601)
  mainHexagram: string;               // 본괘 번호 및 이름 (예: "1. 건(乾)")
  changingHexagram: string | null;    // 변괘 번호 및 이름, 변효 없으면 null
  changingLines: number[];            // 변효 위치 (1-6 중 0~6개)
  aiInterpretation?: string;          // AI 해석 전문, 없으면 빈 문자열
  userQuestion?: string;              // 사용자 질문, 없으면 빈 문자열
  freeMemo?: string;                  // 자유 메모, 없으면 빈 문자열
  lastViewedAt?: string | null;       // 마지막 조회 일시 (ISO 8601), 미조회 시 null
  pinnedAt: string | null;            // 핀 고정 시점 (ISO 8601), null이면 핀 아님, 값 있으면 핀 고정됨
  viewCount: number;                  // 기록 상세 조회 횟수, 생성 시 0
  createdAt: string;                  // 생성 일시 (ISO 8601)
  updatedAt: string;                  // 마지막 수정 일시 (ISO 8601)
}

// 기록 생성 입력 타입 (id/timestamps/viewCount는 자동 생성)
export type CreateRecordInput = Pick<
  DivinationRecord,
  'mainHexagram' | 'changingLines'
> & {
  changingHexagram?: string | null;
  aiInterpretation?: string;
  userQuestion?: string;
};

// 기록 수정 입력 타입
export type UpdateRecordInput = Pick<
  DivinationRecord,
  'freeMemo'
>;

// 해석 규칙 결과
export type InterpretationResult = {
  type: 'hexagram-only' | 'single-line' | 'double-line' | 'both-hexagrams' | 'changing-fixed-lines' | 'changing-single-fixed' | 'changing-hexagram-only';
  description: string;
  primaryHexagram: 'original' | 'changing';
  highlightedLines: number[];
};
