# 기록 리스트 + 상세 화면 UI 수정 계획

## 목표

1. **리스트 화면**: 메모가 있는 항목에 메모 미리보기 표시
2. **상세 화면**: 결과 화면(ResultPage)과 동일한 구조로 재구성 — 축약된 UI로 인한 혼동 최소화

---

## 현재 상태 분석

### 리스트 화면 (HistoryListPage.tsx, L214~270)

각 항목 구조:
```
┌──────────────────────────────────────┐
│ 1. 건(乾)  📝                         │  ← 괘명 + 메모 있으면 📝 이모지만 표시
│ 2025년 6월 22일 · 변효 2개  3회 조회 삭제 │  ← 날짜/변효/조회수/삭제
└──────────────────────────────────────┘
```

문제: 📝 이모지만 있고 메모 내용이 뭔지 알 수 없음.

### 상세 화면 (HistoryDetail.tsx)

현재 HistoryDetail은 자체적인 축약 UI:
```
날짜 | 조회수 | 마지막 조회
[본괘 심볼 + 이름]  [변괘 심볼 + 이름]
변효: 2효 · 5효
질문: 💭 ...            ← 있는 경우만
AI 맞춤 해석: ...      ← 있는 경우만
메모: ...              ← 있는 경우만
```

vs ResultPage의 풍부한 UI:
```
Card 1: 괘 심볼 + 정보 + 효 구성(SVG) + 변효 가이드
Card 2: 괘사 (단전/상전 아코디언)
Card 3: 효사 (6효 개별 아코디언, 변효 하이라이트)
Card 4: 변괘 (토글)
```

문제: 상세 화면이 결과 화면과 너무 달라 사용자가 혼동됨.

### 데이터 구조 제약

`DivinationRecord`에 저장된 필드:
- `mainHexagram`: `"1. 건(乾)"` (문자열)
- `changingHexagram`: `"14. 대유(大有)"` (문자열 또는 null)
- `changingLines`: `[2, 5]` (숫자 배열)
- `freeMemo`, `userQuestion`, `aiInterpretation` (선택적 문자열)

**저장되지 않은 것**: `LineResult[]` (동전 던지기 6회 상세 결과)

→ `LineResult[]`를 복원하면 `useHexagram` 훅으로 모든 결과 화면 데이터를 재생성 가능.

---

## 수정 계획

### 수정 1: 리스트 항목에 메모 미리보기 추가

**파일**: `src/pages/HistoryListPage.tsx`

각 리스트 항목의 괘명 아래에, 메모가 있을 경우 첫 줄 미리보기를 표시.

**현재** (L229~243):
```tsx
<div style={hexagramNameStyle}>
  {record.mainHexagram}
  {record.freeMemo && (
    <span style={{ marginLeft: '8px', fontSize: '12px', ... }}>📝</span>
  )}
</div>
```

**변경 후**:
```tsx
<div style={hexagramNameStyle}>
  {record.mainHexagram}
  {record.freeMemo && (
    <span style={{ marginLeft: '8px', fontSize: '12px', ... }}>📝</span>
  )}
</div>
{record.freeMemo && (
  <div style={{
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  }}>
    {record.freeMemo}
  </div>
)}
```

- 1줄로 말줄임 (`text-overflow: ellipsis`, `white-space: nowrap`)
- 메모가 없으면 기존과 동일 (미리보기 영역 없음)
- 기존 📝 이모지 유지 (메모 존재 여부 시각적 표시)

**변경량**: ~10줄 추가

---

### 수정 2: 상세 화면을 결과 화면 구조로 재구성

이것이 핵심 변경사항. 두 가지 접근이 가능:

#### 접근 A: HistoryDetail을 ResultPage 구조로 재작성 (선택)

`DivinationRecord`에서 `LineResult[]`를 복원하여, ResultPage와 동일한 컴포넌트를 렌더링.

**LineResult[] 복원 로직**:

```typescript
function reconstructLines(record: DivinationRecord): LineResult[] {
  // 1. mainHexagram 문자열에서 괘 번호 추출
  const num = parseHexagramNumber(record.mainHexagram);
  if (!num) return [];
  
  // 2. Hexagram 객체 조회 → 상괘/하괘 이름 획득
  const hexagram = HEXAGRAMS[num - 1];
  if (!hexagram) return [];
  
  // 3. 팔괘에서 효 타입 배열 가져오기
  const lowerTrigram = TRIGRAMS.find(t => t.name === hexagram.lowerTrigram);
  const upperTrigram = TRIGRAMS.find(t => t.name === hexagram.upperTrigram);
  if (!lowerTrigram || !upperTrigram) return [];
  
  // 4. 6효 LineResult 배열 생성
  // lines[0~2] = 하괘(1~3효), lines[3~5] = 상괘(4~6효)
  const lineTypes = [...lowerTrigram.lines, ...upperTrigram.lines];
  return lineTypes.map((type, i) => {
    const isChanging = record.changingLines.includes(i + 1);
    const value = type === 'yang' ? (isChanging ? 9 : 7) : (isChanging ? 6 : 8);
    return { type, changing: isChanging, value: value as 6|7|8|9 };
  });
}
```

**HistoryDetail 재구성**:

```tsx
export default function HistoryDetail({ record }: HistoryDetailProps) {
  const lines = useMemo(() => reconstructLines(record), [record]);
  const { hexagram, changingHexagram, interpretationRule } = useHexagram(lines);
  const highlightedLines = interpretationRule?.highlightedLines ?? [];
  
  // ResultPage와 동일한 카드 구조 렌더링
  return (
    <div>
      {/* Card 1: 괘 정보 + 효 구성 */}
      <Card>
        <HexagramSymbol hexagram={hexagram} size="large" />
        <HexagramInfo hexagram={hexagram} />
        <HexagramStack lines={lines} showChanging size="medium" />
        {record.changingLines.length > 0 && interpretationRule && (
          <ChangingGuide rule={interpretationRule} />
        )}
      </Card>
      
      {/* Card 2: 괘사 */}
      <Card>
        <Interpretation hexagram={hexagram} />
      </Card>
      
      {/* Card 3: 효사 */}
      <Card>
        <LineTexts hexagram={hexagram} highlightedLines={highlightedLines} />
      </Card>
      
      {/* Card 4: 변괘 (있을 경우) */}
      {changingHexagram && (
        <Card>
          <HexagramSymbol hexagram={changingHexagram} size="large" />
          <HexagramInfo hexagram={changingHexagram} />
          <Interpretation hexagram={changingHexagram} />
        </Card>
      )}
      
      {/* 기존 데이터: 질문, AI 해석 */}
      {record.userQuestion && (...)}
      {record.aiInterpretation && (...)}
    </div>
  );
}
```

**차이점 (ResultPage vs HistoryDetail)**:
- HelpModal 없음 (도움말은 결과 화면에서만)
- 변괘 토글 없음 (항상 펼쳐져 있음 — 과거 기록이므로 한눈에 보는 게 낫다)
- 애니메이션 없음 (기록 조회이므로 슬라이드업 불필요)
- 날짜/조회수 메타는 상단에 유지
- 질문/AI 해석은 기존대로 표시
- MemoEditor는 HistoryListPage에서 이미 HistoryDetail 아래에 렌더 중

**새로 import할 컴포넌트** (HistoryDetail.tsx):
- `useHexagram` (이미 ResultPage에서 사용)
- `HexagramSymbol`, `HexagramInfo`, `HexagramStack`, `ChangingGuide`
- `Interpretation`, `LineTexts`
- `TRIGRAMS` (from `@/data/trigrams`)
- `HEXAGRAMS` (이미 import 중)

**영향 파일**:
- `src/components/History/HistoryDetail.tsx` — 대대적 재작성
- 새 파일 없음 (reconstructLines 함수는 HistoryDetail 내부에 포함)

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/HistoryListPage.tsx` | 리스트 항목에 메모 미리보기 추가 (~10줄) |
| `src/components/History/HistoryDetail.tsx` | 결과 화면 구조로 재작성 (대규모 변경) |

---

## 테스트 / 검증

### 기존 테스트 영향도

- `HistoryDetail.test.tsx` (24 tests) — HistoryDetail이 대규모 변경되므로 테스트 수정 필요
  - 기존 테스트: 축약 UI 요소(메타칩, 섹션블록 등) 검증
  - 신규 테스트: HexagramSymbol, HexagramStack, Interpretation, LineTexts 렌더링 검증
  - `reconstructLines` 함수 테스트 추가
- `MemoEditor.test.tsx` (42 tests) — 영향 없음
- `useSaveDivination.test.ts` — 영향 없음
- 리스트 화면 관련 테스트 — 미리보기 추가에 따른 선택적 업데이트

### 검증 단계

1. `npm run test` — 테스트 통과 (HistoryDetail 테스트 수정 포함)
2. `npm run typecheck` — 타입 에러 확인
3. `npm run lint` — ESLint
4. `npm run build` — 빌드
5. `npx ait build` — AIT 아티팩트

### 수동 확인 시나리오

**리스트 화면**:
1. 홈 → 기록 보기
2. 메모가 있는 항목: 괘명 아래에 메모 첫 줄이 말줄임으로 표시되는지
3. 메모가 없는 항목: 기존과 동일하게 표시되는지

**상세 화면**:
1. 기록 항목 클릭 → 상세 화면 진입
2. 결과 화면과 동일한 구조: 괘 심볼 + 정보 + 효 구성(SVG) + 변효 가이드
3. 괘사 (단전/상전 아코디언)
4. 효사 (6효 개별 아코디언, 변효 하이라이트)
5. 변괘 (있을 경우, 펼쳐져 있음)
6. 질문/AI 해석 (있을 경우)
7. 메모 입력 (MemoEditor — 기존 위치 유지)
8. 날짜/조회수 메타 정보

---

## 리스크 / 트레이드오프

1. **reconstructLines 정확성**: 저장된 mainHexagram 문자열에서 괘 번호를 추출하고, HEXAGRAMS에서 상/하괘 이름으로 팔괘를 조회하여 라인 타입을 복원. 이 과정은 결정적(deterministic)이므로 정확함. 단, mainHexagram 문자열 포맷이 `"N. 이름(한자)"` 패턴을 따르지 않는 레거시 데이터가 있을 수 있음 → `parseHexagramNumber`가 이미 이 패턴을 처리하고 있음.

2. **HistoryDetail 테스트 재작성**: 기존 24개 테스트가 축약 UI를 검증하므로 대부분 폐기. 새 구조에 맞게 재작성 필요. 작업량 증가하지만 필수.

3. **변괘 토글 생략**: ResultPage에서는 변괘를 토글로 접을 수 있지만, HistoryDetail에서는 펼쳐진 상태로 표시. 과거 기록을 조회하는 맥락에서는 한눈에 보는 것이 더 적절하다고 판단.

4. **성능**: `useHexagram`은 `useMemo`로 메모이제이션되어 있어 재계산 부담 없음. `reconstructLines`도 `useMemo`로 감쌀 것.

---

## 구현 메모

- 같은 worktree(`~/Github/book-of-changes-history-ui`)에서 계속 작업
- 기존 브랜치 `feature/history-ui-improvement`에 추가 커밋
- 새 의존성 없음 (모든 컴포넌트/훅/유틸이 기존 코드)
- `process.env` 관련 없음