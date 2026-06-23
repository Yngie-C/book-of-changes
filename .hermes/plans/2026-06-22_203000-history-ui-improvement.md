# 기록 기능 UI 수정 계획

## 목표

결과 화면(ResultPage)에서 기록 기능 섹션의 위치를 변경하고,
"이 예측 저장하기" 버튼 클릭 시 바로 메모를 입력할 수 있도록 흐름 개선.

## 현재 상태 분석

### ResultPage 구조 (현재 순서)

1. **Card 1**: 괘 정보 + 효 구성 + 변효 가이드
2. **Card 2**: 괘사 (Interpretation)
3. **Card 2.5**: 예측 저장 (SaveButton) ← 현재 위치
4. **Card 3**: 효사 (LineTexts)
5. **Card 4**: 변괘 (토글)
6. **bottomCTA**: "다시 점치기" 버튼 (Layout의 bottomCTA로 전달)

### 현재 저장 → 메모 흐름

1. 결과 화면에서 "이 예측 저장하기" 클릭 → `saveHook.save()` 호출
2. `useSaveDivination`이 `saveRecord()` 실행 → localStorage 저장
3. `saveHook.state.status === 'success'` → SaveButton이 "✓ 저장 완료" 표시
4. 메모 입력은 **홈 화면 → 기록 보기 → 기록 선택 → MemoEditor** 경로로만 가능
5. 즉, 저장 후 메모를 입력하려면 화면을 떠나야 함

---

## 수정 계획

### 수정 1: 기록 섹션 위치 변경

**목표**: "기록 남기기" 섹션을 모든 해석 아래, "다시 점치기" 버튼 바로 위로 이동.

**현재 ResultPage JSX 순서** (L177~354):

```
Card 1 (괘 정보)
Card 2 (괘사)
Card 2.5 (예측 저장) ← 이걸 아래로 이동
Card 3 (효사)
Card 4 (변괘)
```

**변경 후 순서**:

```
Card 1 (괘 정보)
Card 2 (괘사)
Card 3 (효사)
Card 4 (변괘)
Card 2.5 (예측 저장) ← 모든 해석 아래로 이동
```

**구체적 변경**: ResultPage.tsx에서 "Card 2.5: 예측 저장" 블록(L217~233)을
Card 4(변괘) 블록 뒤(L269 이후)로 이동.

- 이동할 블록: L218~233 (cardStyle + animBlock(150))
- 이동 후 `animBlock` 딜레이 조정: 변괘(300) 다음이므로 `animBlock(400)` 정도가 적절
- "다시 점치기" 버튼은 Layout의 `bottomCTA` prop으로 전달되므로, 페이지 콘텐츠 마지막에 위치하는 것과 자연스럽게 연결됨

**영향 파일**:
- `src/pages/ResultPage.tsx` — JSX 블록 순서 변경 (1개 파일)

---

### 수정 2: 저장 버튼 클릭 시 바로 메모 입력

**목표**: "이 예측 저장하기" 클릭 → 저장 완료 후 메모 입력 textarea가 같은 자리에 나타남.

**현재 동작**:
- 저장 성공 시 SaveButton이 "✓ 저장 완료"로 변경되고 끝
- 메모 입력하려면 홈 → 기록 보기 → 기록 상세로 이동해야 함

**변경 설계**:

저장 성공 후 `saveHook.state.status === 'success'`이면, 기존 "기록 남기기" 섹션 내에서 SaveButton 아래에 `MemoEditor`가 인라인으로 나타나도록 변경.

**ResultPage.tsx 변경 사항**:

1. **MemoEditor import 추가**:
   ```tsx
   import MemoEditor from '@/components/History/MemoEditor';
   ```

2. **updateRecord import 추가** (storage.ts에서):
   ```tsx
   import { updateRecord } from '@/lib/storage';
   ```

3. **저장 성공 상태에서 MemoEditor 표시**:
   - `saveHook.state.status === 'success'`일 때, SaveButton 아래에 MemoEditor 렌더
   - `saveHook.state.record.id`를 사용하여 `updateRecord(recordId, { freeMemo: memo })` 호출
   - MemoEditor의 `onSave` 콜백에서 `updateRecord` 호출

4. **섹션 내 조건부 렌더링 구조**:
   ```tsx
   {/* Card: 기록 남기기 (모든 해석 아래) */}
   <div style={{ ...cardStyle, ...animBlock(400) }}>
     <div style={{ ...sectionTitleStyle }}>기록 남기기</div>
     <p>이 점괘 결과를 저장하고 나중에 다시 확인할 수 있어요.</p>
     <SaveButton
       saveStatus={saveStatus}
       onClick={handleSave}
       saveLabel="이 예측 저장하기"
     />
     {/* 저장 성공 후 메모 입력 인라인 표시 */}
     {saveHook.state.status === 'success' && (
       <div style={{ marginTop: '16px' }}>
         <MemoEditor
           initialMemo={null}
           onSave={(memo) => {
             updateRecord(saveHook.state.record.id, { freeMemo: memo });
           }}
           placeholder="이 점괘에 대한 생각을 남겨보세요"
           saveLabel="메모 저장"
         />
       </div>
     )}
   </div>
   ```

5. **saveStatus 'success' 시 SaveButton 표시 유지**:
   - "✓ 저장 완료" 상태로 두고, 그 아래에 MemoEditor가 나타남
   - 사용자 경험: 저장 → 완료 확인 → 바로 메모 입력 → 메모 저장

**고려사항**:
- `saveHook.state`는 discriminated union이므로 `status === 'success'` 분기 내에서 `record` 접근이 타입 안전함
- MemoEditor는 이미 `HistoryListPage`에서 사용 중이므로 재사용 가능
- `updateRecord`는 동기 함수(localStorage)이므로 `onSave`에서 Promise 불필요하지만, MemoEditor가 Promise도 지원하므로 문제 없음
- 중복 저장 방지 로직은 `useSaveDivination`의 fingerprint로 이미 처리됨

**영향 파일**:
- `src/pages/ResultPage.tsx` — import 추가 + 저장 성공 시 MemoEditor 렌더링 (1개 파일)

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/ResultPage.tsx` | 1. 기록 섹션 JSX 블록을 변괘(Card 4) 뒤로 이동<br>2. `MemoEditor`, `updateRecord` import 추가<br>3. 저장 성공 시 MemoEditor 인라인 렌더링 |

**총 1개 파일만 수정하면 됨** — 모든 변경이 ResultPage.tsx 내에서 완결됨.

---

## 테스트 / 검증

### 기존 테스트 영향도

- `useSaveDivination.test.ts` — 훅 자체는 변경 없음, 영향 없음
- `MemoEditor.test.tsx` — 컴포넌트 자체는 변경 없음, 영향 없음
- `SaveButton` 관련 테스트 — 컴포넌트 자체는 변경 없음

### 검증 단계

1. `npm run test` — 기존 테스트 통과 확인
2. `npm run typecheck` — TypeScript 에러 확인 (신규 import 포함)
3. `npm run lint` — ESLint 검사
4. `npm run build` — 빌드 성공
5. `npx ait build` — Toss AIT 아티팩트 생성

### 수동 확인 시나리오

1. 점 치기 → 결과 화면 진입
2. 스크롤: 괘 정보 → 괘사 → 효사 → 변괘 → **기록 남기기** → (하단) 다시 점치기
   - 기록 섹션이 모든 해석 아래에 위치하는지 확인
3. "이 예측 저장하기" 클릭 → "✓ 저장 완료" 표시 → **바로 아래에 메모 입력창 나타남**
4. 메모 입력 → "메모 저장" 클릭 → "✓ 저장 완료" 표시 확인
5. 홈 → 기록 보기 → 해당 기록 상세 → 메모가 저장되어 있는지 확인

---

## 리스크 / 트레이드오프

1. **SaveButton 비활성화 유지**: 저장 성공 후 SaveButton은 "✓ 저장 완료"로 비활성화됨. MemoEditor가 그 아래 나타나므로 시각적으로 "저장됨 → 메모 입력" 흐름이 자연스러움.

2. **MemoEditor 초기값 null**: 새로 저장한 기록이므로 기존 메모가 없음. `initialMemo={null}`이면 빈 textarea로 시작 (MemoEditor가 이미 처리함).

3. **저장 실패 시**: `saveHook.state.status === 'error'`이면 MemoEditor가 나타나지 않음. SaveButton이 재시도 가능 상태로 돌아감. 자연스러운 동작.

4. **Layout bottomCTA와의 간격**: "기록 남기기" 섹션이 페이지 콘텐츠의 마지막이 되고, "다시 점치기" 버튼은 Layout의 fixed/sticky bottomCTA로 표시됨. 충분한 간격 확보 필요 (pageStyle의 padding-bottom 24px + Layout 자체 여백).

---

## 구현 메모

- worktree 모드 사용 (`hermes -w`)
- 작은 diff: ResultPage.tsx 1개 파일만 변경
- 새로운 의존성 추가 없음 (MemoEditor, updateRecord 모두 기존 코드)
- `process.env` 관련 없음 (이 파일은 서버 사이드 아님)