# Book of Changes (주역동전점 / app-in-toss)

Toss 미니앱: 가상 동전 3개 × 6회 던지기로 64괘를 생성하고 주역 철학 기반 해석을 제공합니다.

## 기술 스택

| 계층 | 기술 |
|------|------|
| 프레임워크 | React 18.3, TypeScript 5.7 |
| 빌드 | RSBuild 1.2 (rsbuild.config.ts) + Vite |
| Toss 연동 | @apps-in-toss/web-framework v2, @toss/tds-mobile v2 |
| 스타일링 | Emotion (CSS-in-JS) + CSS Modules (.module.css) |
| 테스트 | Vitest 3.0 + React Testing Library + jsdom |
| 린트 | ESLint 9 flat config (eslint.config.js) + typescript-eslint v8 |
| 배포 | Vercel (프론트엔드) + Cloudflare Workers (API) |
| CI/CD | GitHub Actions (.github/workflows/ci.yml, deploy.yml) |

## 전체 디렉토리 구조

```
book-of-changes/
├── index.html                        # 진입점 HTML
├── package.json                      # 의존성 + 스크립트
├── rsbuild.config.ts                 # RSBuild 설정
├── eslint.config.js                  # ESLint flat config
├── tsconfig.json                     # TypeScript 설정
├── vitest.config.ts                  # Vitest 설정
├── granite.config.ts                 # Granite (Toss 내부 도구)
├── CLAUDE.md                         # AI 에이전트 컨텍스트 (이 파일)
├── .gitignore
├── .omc/                             # OMC legacy state (Claude Code 과거 이력)
├── public/assets/                    # 정적 에셋 (coin-front/back.svg, icons)
├── api/                              # Cloudflare Workers 백엔드
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/index.ts                  # API 엔드포인트 (CORS 포함)
│   ├── src/hexagrams.json            # 64괘 JSON 데이터
│   └── scripts/extract-hexagrams.ts
└── src/
    ├── app/
    │   ├── index.tsx                  # ReactDOM entry
    │   └── App.tsx                    # 라우터 + 전역 설정
    ├── pages/
    │   ├── HomePage.tsx              # 메인 화면
    │   ├── DivinationPage.tsx        # 동전 던지기 (6회)
    │   └── ResultPage.tsx            # 결과 + 해석
    ├── components/
    │   ├── Coin/
    │   │   ├── CoinToss.tsx          # 동전 던지기 애니메이션
    │   │   └── Coin.module.css
    │   ├── Hexagram/
    │   │   ├── HexagramSymbol.tsx     # 효(爻) 표시
    │   │   ├── HexagramStack.tsx      # 6효 스택
    │   │   ├── HexagramInfo.tsx       # 괘명, 괘사, 효사
    │   │   ├── ChangingGuide.tsx      # 변효 가이드
    │   │   └── Hexagram.module.css
    │   ├── Result/
    │   │   ├── Interpretation.tsx     # 해석 결과
    │   │   ├── LineTexts.tsx          # 효사 텍스트
    │   │   ├── AiInterpretationCard.tsx  # AI 맞춤 해석 카드
    │   │   └── AiInputForm.tsx        # AI 해석 입력 폼
    │   └── common/
    │       ├── Layout.tsx             # 공통 레이아웃
    │       ├── ProgressBar.tsx        # 진행 표시줄
    │       ├── ShareButton.tsx        # 공유 버튼 (html2canvas)
    │       ├── HelpModal.tsx          # 도움말 모달
    │       ├── HelpContent.tsx        # 도움말 콘텐츠
    │       └── ErrorBoundary.tsx      # 에러 바운더리
    ├── hooks/
    │   ├── useDivination.ts          # 점술 전체 흐름 관리
    │   ├── useCoinToss.ts            # 동전 던지기 상태
    │   ├── useHexagram.ts            # 괘 조회 + 변괘 계산
    │   └── useAiInterpretation.ts    # AI 해석 API 호출
    ├── data/
    │   ├── types.ts                  # 공통 타입 정의
    │   ├── hexagrams.ts              # 64괘 인덱스 통합
    │   ├── hexagrams_part1~8.ts      # 64괘 데이터 (8파트 분할)
    │   ├── trigrams.ts               # 8괘(팔괘) 정의
    │   └── kingWenTable.ts           # 문왕 64괘 서열표
    ├── utils/
    │   ├── coinLogic.ts              # 동전 던지기 → 효 생성 로직
    │   ├── hexagramLookup.ts         # 효 → 괘 조회
    │   ├── changingHexagram.ts       # 변괘 계산
    │   └── interpretationRule.ts     # 해석 규칙 엔진
    ├── lib/
    │   ├── toss.ts                   # Toss SDK 연동 유틸
    │   ├── ads.ts                    # 광고 (전면형) 유틸
    │   └── ai.ts                     # AI API 클라이언트
    ├── styles/
    │   ├── global.css                # 전역 스타일
    │   ├── tokens.css                # 디자인 토큰
    │   └── animations.css            # CSS 애니메이션
    ├── __tests__/
    │   ├── coinLogic.test.ts
    │   ├── hexagramLookup.test.ts
    │   ├── changingHexagram.test.ts
    │   ├── interpretationRule.test.ts
    │   └── dataIntegrity.test.ts     # 64괘 데이터 무결성 검증
    └── env.d.ts                      # 환경 변수 타입 선언
```

## 핵심 비즈니스 로직

```
1. 사용자가 동전 3개를 6회 던짐 (coinLogic.ts → 각 회차마다 효 생성)
2. 6개 효를 조합해 본괘(本卦) 식별 (hexagramLookup.ts → 문왕 64괘 조회)
3. 변효(變爻) 확인 → 변괘(變卦) 계산 (changingHexagram.ts)
4. 해석 규칙 적용 (interpretationRule.ts):
   - 변효 없음 → 본괘 괘사
   - 변효 1개 → 해당 효사
   - 변효 2개 → 상효 위주 + 본괘 괘사
   - 변효 3개 → 본괘 + 변괘 괘사
   - 변효 4개 → 변괘 괘사 + 변하지 않은 2효
   - 변효 5개 → 변괘 괘사 + 변하지 않은 1효
   - 변효 6개 → 변괘 괘사 (건곤은 용구/용육)
5. AI 맞춤 해석 (선택): 사용자 입력 → api/src/index.ts → 외부 AI API → AiInterpretationCard 표시
```

## 개발 명령어

```bash
npm run dev         # RSBuild HMR 개발 서버
npm run build       # 프로덕션 빌드 → dist/
npm run test        # Vitest 전체 테스트
npm run test:watch  # Vitest watch 모드
npm run typecheck   # tsc --noEmit 타입 체크
npm run lint        # ESLint 검사 (src/)
```

## Hermes Agent 작업 컨벤션

- **항상 worktree 모드 사용**: `hermes -w`로 새 worktree를 만들어 코드 편집. 절대 원본 파일을 직접 수정하지 않음.
- **작은 diff**: 변경은 작고 되돌릴 수 있게.
- **기존 유틸리티 재사용**: 새 추상화보다 기존 코드 활용.
- **의존성 추가 금지**: 명시적 요청 없이 새 npm 패키지 추가하지 않음.
- **git push 금지**: 명시적 요청이 있을 때만 push.
- **시크릿 노출 금지**: API 키, 토큰 등은 절대 출력하지 않음.
- **사용자 변경사항 보존**: 작업 중 사용자가 수정한 파일이나 untracked 아티팩트 보존.
- **delegate_task**: 복잡한 코드 변경은 delegate_task로 서브에이전트에 위임.

## 레거시 노트

- `.omc/`: OMC (oh-my-claudecode) → Claude Code 시절 작업 이력. 보존 중, 사용하지 않음.
- `dist/`: 빌드 아티팩트 (RSBuild 출력). 직접 편집하지 않음.
- `book-of-changes.ait`: Toss AIT 설정 파일.

## YC-Vault 연동

- 볼트 프로젝트 파일: `projects/book-of-changes.md`
- 관련 프로젝트: [[projects/saju-strength]] (같은 app-in-toss)
- 필요 시 Obsidian vault 조회 가능 (파일 시스템 직접 접근)
- 의사결정/리서치는 볼트의 `decisions/`, `research/` 에 기록
