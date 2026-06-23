# History/Memo 기능 재구현 계획

## 목표

과거 점술 기록 저장 + 조회 + 메모 + 삭제 기능을 단계적으로 재구현한다.
이전 구현(13,000줄 한꺼번에)에서 `process.env` ReferenceError로 토스 앱이 크래시됐던 문제를 교훈삼아,
**각 Phase마다 빌드 → 토스 제출 → 정상 작동 확인**을 거치며 안전하게 증분 추가한다.

## 현재 상태

- **Working tree**: `8624381` (detached HEAD) — history/memo 없는 깨끗한 상태
- **master**: `360ccbc` — history/memo 머지됨 (하지만 `process.env` 문제 + 중첩 lazy 포함)
- **이미 수정 완료한 것** (working tree에 반영됨):
  - `html2canvas` 의존성 제거
  - `@apps-in-toss/web-framework` 2.0.6 → 2.4.1 업데이트
  - `useAiInterpretation` 광고 SDK useEffect에 `isInTossApp()` 가드 추가
  - `ErrorBoundary` 디버그 모드 (에러 메시지 + stack trace 표시)
  - `process.env` 참조 2곳 제거 (`toss.ts`, `ai.ts`)
- **토스 제출**: 현재 상태에서 정상 작동 확인 완료 ✅

## 이전 master 코드 분석 결과

| 파일 | 줄 수 | `process.` 참조 | `lazy()` | `Suspense` | 재사용 가능? |
|------|-------|-----------------|----------|------------|-------------|
| `storage.ts` | 585 | 0 | 0 | 0 | ✅ 그대로 |
| `migration.ts` | 240 | 0 | 0 | 0 | ✅ 그대로 |
| `queryRecords.ts` | 374 | 0 | 0 | 0 | ✅ 그대로 |
| `serializer.ts` | 152 | 0 | 0 | 0 | ✅ 그대로 |
| `recordRecovery.ts` | 422 | 0 | 0 | 0 | ✅ 그대로 |
| `deleteRecordApi.ts` | 172 | **2** | 0 | 0 | ⚠️ `process.env` 제거 필요 |
| `handleDeleteResponse.ts` | 86 | 0 | 0 | 0 | ✅ 그대로 |
| `useHistoryList.ts` | 142 | 0 | 0 | 0 | ✅ 그대로 |
| `useHistoryDetail.ts` | 82 | 0 | 0 | 0 | ✅ 그대로 |
| `useSaveDivination.ts` | 119 | 0 | 0 | 0 | ✅ 그대로 |
| `HistoryDetail.tsx` | 258 | 0 | 0 | 0 | ✅ 그대로 |
| `MemoEditor.tsx` | 236 | 0 | 0 | 0 | ✅ 그대로 |
| `SaveButton.tsx` | 78 | 0 | 0 | 0 | ✅ 그대로 |
| `ConfirmDialog.tsx` | 193 | 0 | 0 | 0 | ✅ 그대로 |
| `HistoryListPage.tsx` | 289 | 0 | 0 | 0 | ✅ 그대로 |

### 수정이 필요한 master 코드

1. **`deleteRecordApi.ts`** — `process.env.PUBLIC_AI_API_URL` 참조 2곳 → 빈 문자열로 변경
2. **`App.tsx`** (master 버전) — `HistoryListPage`를 lazy 로딩 + `onHistory` prop 추가. **하지만 중첩 lazy 주의**
3. **`ResultPage.tsx`** (master 버전) — `SaveButton` lazy import + `useSaveDivination` hook 추가. **SaveButton lazy는 안전 (단일 레벨)**. 단, ResultPage 내부에 이미 lazy(AiInputForm, AiInterpretationCard)가 있어서 **SaveButton만 추가 lazy하면 중첩 lazy 3개**. → SaveButton은 직접 import 권장
4. **`HomePage.tsx`** (master 버전) — `onHistory` prop + "기록 보기" 버튼 추가

### 중첩 lazy loading 위험도 분석

| 레벨 | 컴포넌트 | lazy? | 위험도 |
|------|---------|-------|--------|
| App → ResultPage | lazy | ✅ 안전 (단일) |
| App → HistoryListPage | lazy | ✅ 안전 (단일) |
| ResultPage → AiInputForm | lazy | ⚠️ 중첩 (App→ResultPage→AiInputForm) |
| ResultPage → AiInterpretationCard | lazy | ⚠️ 중첩 |
| ResultPage → SaveButton | lazy (master) | ⚠️ 중첩 → **직접 import로 변경** |

**결론**: ResultPage 내부의 컴포넌트는 lazy를 유지하되, SaveButton만 직접 import로 변경.
AiInputForm/AiInterpretationCard는 주석 처리된 상태이므로 현재는 영향 없음.

---

## Phase별 계획

### Phase 0: 커밋 정리 (5분)

**목표**: 현재 수정사항을 git에 커밋하여 안전한 복구점 확보

- [ ] 현재 working tree 변경사항 커밋 (html2canvas 제거, SDK 2.4.1, process.env 제거, ErrorBoundary 디버그, 광고 가드)
- [ ] 커밋 메시지: `fix: process.env ReferenceError + html2canvas 제거 + SDK 2.4.1 + ErrorBoundary 디버그`

### Phase 1: 타입 + 저장 모듈 (30분)

**목표**: DivinationRecord 타입 정의 + localStorage CRUD 모듈 추가

**추가 파일** (master에서 복사, 수정 없이 그대로):
- [ ] `src/data/types.ts` — `DivinationRecord`, `CreateRecordInput`, `UpdateRecordInput` 타입 추가 (기존 타입 유지)
- [ ] `src/lib/serializer.ts` (152줄) — 그대로 복사
- [ ] `src/lib/migration.ts` (240줄) — 그대로 복사
- [ ] `src/lib/storage.ts` (585줄) — 그대로 복사
- [ ] `src/lib/queryRecords.ts` (374줄) — 그대로 복사
- [ ] `src/lib/recordRecovery.ts` (422줄) — 그대로 복사

**수정 파일**:
- [ ] `src/lib/deleteRecordApi.ts` (172줄) — 복사 후 `process.env` 2곳 → 빈 문자열로 수정
- [ ] `src/lib/handleDeleteResponse.ts` (86줄) — 그대로 복사

**테스트 파일** (master에서 복사):
- [ ] `src/__tests__/storage.test.ts`
- [ ] `src/__tests__/serializer.test.ts`
- [ ] `src/__tests__/migration.test.ts`
- [ ] `src/__tests__/queryRecords.test.ts`
- [ ] `src/__tests__/recordRecovery.test.ts`

**검증**:
- [ ] `npm run test` 통과
- [ ] `npm run build` 성공
- [ ] `npx ait build` 성공
- [ ] **토스 제출 → 첫 화면 정상 로드 확인**

### Phase 2: 저장 버튼 (20분)

**목표**: ResultPage에 "이 예측 저장하기" 버튼 추가

**추가 파일**:
- [ ] `src/components/History/SaveButton.tsx` (78줄) — 그대로 복사
- [ ] `src/hooks/useSaveDivination.ts` (119줄) — 그대로 복사

**수정 파일**:
- [ ] `src/pages/ResultPage.tsx` — SaveButton **직접 import** (lazy ❌), useSaveDivination hook 추가, 저장 카드 섹션 추가
  - `import SaveButton from '@/components/History/SaveButton'` (직접)
  - `import { useSaveDivination } from '@/hooks/useSaveDivination'`
  - `import type { SaveButtonStatus } from '@/components/History/SaveButton'`
  - handleSave 함수 추가
  - Card 2.5: "기록 남기기" 섹션 추가

**검증**:
- [ ] `npm run test` 통과
- [ ] `npm run build` 성공
- [ ] `npx ait build` 성공
- [ ] **토스 제출 → 점 치기 → 결과 화면 → 저장 버튼 클릭 → 정상 작동 확인**

### Phase 3: 기록 목록 페이지 (30분)

**목표**: HomePage에 "기록 보기" 버튼 + HistoryListPage 라우팅

**추가 파일**:
- [ ] `src/pages/HistoryListPage.tsx` (289줄) — 그대로 복사
- [ ] `src/components/History/HistoryDetail.tsx` (258줄) — 그대로 복사
- [ ] `src/hooks/useHistoryList.ts` (142줄) — 그대로 복사
- [ ] `src/hooks/useHistoryDetail.ts` (82줄) — 그대로 복사
- [ ] `src/components/common/ConfirmDialog.tsx` (193줄) — 그대로 복사

**수정 파일**:
- [ ] `src/app/App.tsx` — `HistoryListPage` lazy import 추가, `history` PageRoute 추가, 라우팅 로직
  - `const HistoryListPage = lazy(() => import('@/pages/HistoryListPage'))` — 단일 lazy, 안전
  - `case 'history':` 브랜치 추가 (Suspense 포함)
- [ ] `src/pages/HomePage.tsx` — `onHistory` prop 추가, "📋 기록 보기" 버튼 추가
- [ ] `src/data/types.ts` — `PageRoute` 타입에 `'history'` 추가

**테스트 파일**:
- [ ] `src/__tests__/ConfirmDialog.test.tsx`
- [ ] `src/__tests__/HistoryDetail.test.tsx`
- [ ] `src/__tests__/useHistoryDetail.test.ts`
- [ ] `src/__tests__/useHistoryListDeleteState.test.ts`

**검증**:
- [ ] `npm run test` 통과
- [ ] `npm run build` 성공
- [ ] `npx ait build` 성공
- [ ] **토스 제출 → 홈 → 기록 보기 → 목록 표시 → 상세 보기 → 뒤로 → 정상 작동 확인**

### Phase 4: 메모 편집 + 삭제 (20분)

**목표**: 기록 상세에서 메모 편집 + 삭제 기능

**추가 파일**:
- [ ] `src/components/History/MemoEditor.tsx` (236줄) — 그대로 복사

**수정 파일** (이미 Phase 3에서 복사한 파일들):
- [ ] `src/pages/HistoryListPage.tsx` — 이미 MemoEditor import 포함, ConfirmDialog 포함 (master 버전 그대로)
- [ ] `src/lib/toss.ts` — `trackEvent` 함수 확인 (이미 존재, process.env 제거됨)

**테스트 파일**:
- [ ] `src/__tests__/MemoEditor.test.tsx`
- [ ] `src/__tests__/deleteHistoryItem.test.ts`
- [ ] `src/__tests__/deleteRecordApi.test.ts` — `process.env` 수정 반영 확인
- [ ] `src/__tests__/handleDeleteResponse.test.ts`
- [ ] `src/__tests__/useSaveDivination.test.ts`

**검증**:
- [ ] `npm run test` 통과 (전체)
- [ ] `npm run build` 성공
- [ ] `npx ait build` 성공
- [ ] **토스 제출 → 전체 플로우 테스트**:
  1. 점 치기 → 결과 → 저장
  2. 홈 → 기록 보기 → 목록 → 상세 → 메모 작성 → 저장
  3. 기록 삭제 → 확인
  4. 모든 화면 정상 작동

### Phase 5: 마무리 (10분)

- [ ] ErrorBoundary 디버그 모드 → 프로덕션용으로 복구 (에러 메시지 숨김)
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] 최종 커밋
- [ ] **최종 토스 제출**

---

## 리스크 & 주의사항

### ⚠️ 반드시 확인할 것

1. **`process.env` 절대 사용 금지** — Toss WebView에 `process` 객체 없음
   - `deleteRecordApi.ts`에 2곳 있음 → 반드시 수정
   - 다른 파일에도 있는지 grep으로 확인
2. **SaveButton은 직접 import** — ResultPage 내부의 중첩 lazy 방지
3. **HistoryListPage는 lazy OK** — App 직접 lazy 로딩이므로 단일 레벨
4. **localStorage 가용성** — storage.ts에 이미 폴백 로직 있음 (인메모리)
5. **각 Phase마다 토스 제출** — 한 번에 여러 Phase 올리지 말 것

### 🔍 토스 제출 시 확인 사항

- 첫 화면 정상 로드
- 에러 화면(ErrorBoundary) 안 나타남
- 각 기능별 동작 확인
- 에러 발생 시 빨간 박스 메시지 캡처

### 📦 번들 사이즈

- 현재: ~1,400 KB (gzip ~442 KB)
- Phase 1 완료 후: ~1,400 KB (lib 모듈은 작음)
- Phase 4 완료 후: ~1,500-1,600 KB 예상 (UI 컴포넌트 추가)
- 100MB 제한에 여유 있음

---

## 파일별 상세 작업

### Phase 1 파일 카피 리스트

```bash
# 그대로 복사 (수정 불필요)
git show master:src/lib/serializer.ts > src/lib/serializer.ts
git show master:src/lib/migration.ts > src/lib/migration.ts
git show master:src/lib/storage.ts > src/lib/storage.ts
git show master:src/lib/queryRecords.ts > src/lib/queryRecords.ts
git show master:src/lib/recordRecovery.ts > src/lib/recordRecovery.ts
git show master:src/lib/handleDeleteResponse.ts > src/lib/handleDeleteResponse.ts

# 복사 후 process.env 수정 필요
git show master:src/lib/deleteRecordApi.ts > src/lib/deleteRecordApi.ts
# → process.env.PUBLIC_AI_API_URL → '' 로 변경 (2곳)

# types.ts는 기존 파일에追加 (기존 타입 유지 + DivinationRecord 추가)
# 수동 편집 필요

# 테스트 파일 복사
git show master:src/__tests__/storage.test.ts > src/__tests__/storage.test.ts
git show master:src/__tests__/serializer.test.ts > src/__tests__/serializer.test.ts
git show master:src/__tests__/migration.test.ts > src/__tests__/migration.test.ts
git show master:src/__tests__/queryRecords.test.ts > src/__tests__/queryRecords.test.ts
git show master:src/__tests__/recordRecovery.test.ts > src/__tests__/recordRecovery.test.ts
```

### Phase 2-4도 동일한 패턴 (git show master: → 복사 → 필요시 수정)

---

## 예상 소요 시간

| Phase | 시간 | 누적 |
|-------|------|------|
| Phase 0: 커밋 | 5분 | 5분 |
| Phase 1: 타입 + 저장 | 30분 | 35분 |
| Phase 2: 저장 버튼 | 20분 | 55분 |
| Phase 3: 목록 페이지 | 30분 | 1시간 25분 |
| Phase 4: 메모 + 삭제 | 20분 | 1시간 45분 |
| Phase 5: 마무리 | 10분 | 1시간 55분 |
| **총 예상** | | **~2시간** |

각 Phase 사이 토스 제출/확인 시간 별도 (10-15분/회).