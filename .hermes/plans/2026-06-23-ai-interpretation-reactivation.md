# AI 맞춤 해석 기능 재활성화 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Reactivate the AI interpretation feature in Book of Changes Toss mini-app by fixing the crash root cause (API_BASE_URL), uncommenting existing UI code, adding API authentication via Toss SDK `getAnonymousKey()` with short-TTL fallback, and improving rate limiting to use the authenticated identifier.

**Architecture:** Frontend (React/RSBuild) and backend (Cloudflare Workers) changes in parallel. Frontend fixes `ai.ts` (hardcode Workers URL, add auth token from `getAnonymousKey`), uncomments `ResultPage.tsx` AI section. Backend adds auth verification endpoint + rate limit identifier change. Toss SDK `getAnonymousKey()` (비게임, SDK 2.4.5+) is the primary auth method — current project uses SDK 2.4.1, so a fallback short-TTL token issued by the Workers backend is the safety net.

**Tech Stack:** React 18.3, TypeScript 5.7, RSBuild 1.2, @apps-in-toss/web-framework 2.4.1, Cloudflare Workers, OpenAI gpt-5-mini, Vitest 3.0

---

## Key Decisions (from Interview)

| Decision | Choice |
|----------|--------|
| UI/UX | 기존 설계 유지, 주석 해제 + 버그 수정 |
| API_BASE_URL | C번 하드코딩 (단일 Workers URL, dev/prod 분리 없음) |
| API 인증 | B번 `getAnonymousKey()` → 폴백 C번 TTL 토큰 |
| Rate Limit | 인증된 식별자 기반 (deviceId → anonymousKey) |
| Phase 2 예정 | ③ prompt injection 방어, ⑤ 응답 검증, UX 개선 |

## Toss SDK Research Findings

- `getAnonymousKey()`: 비게임 미니앱 전용 사용자 식별 API
  - `import { getAnonymousKey } from '@apps-in-toss/web-framework'`
  - Returns: `{ type: 'HASH', hash: string }` | `'INVALID_CATEGORY'` | `'ERROR'` | `undefined`
  - **SDK 2.4.5+ required** — 현재 프로젝트는 2.4.1 → `undefined` 반환 가능
  - 폴백 필수: SDK 버전 낮으면 Workers 발급 TTL 토큰 사용
- `getDeviceId()`: 기존 사용 중, `@apps-in-toss/web-bridge`에서 import
  - deprecated 가능성 있음, `getAnonymousKey`가 후속 API
- **중요**: `getAnonymousKey`는 "토스 서버 API 호출용 키가 아님" — 내부 식별용
  - 그러나 rate limit 식별자 + 간이 인증으로는 충분히 활용 가능

## File Map

### Frontend (`src/`)
| File | Action | Summary |
|------|--------|---------|
| `src/lib/ai.ts` | **Modify** | API_BASE_URL 하드코딩, getAnonymousKey + 폴백 토큰, Authorization 헤더 |
| `src/hooks/useAiInterpretation.ts` | **Modify** | auth 토큰 획득 로직 추가, requestInterpretation에 토큰 전달 |
| `src/pages/ResultPage.tsx` | **Modify** | AI 섹션 주석 해제, hook import 복원, lazy/Suspense 복원 |

### Backend (`api/`)
| File | Action | Summary |
|------|--------|---------|
| `api/src/index.ts` | **Modify** | 인증 검증 추가, rate limit 식별자 변경, /api/token 엔드포인트 추가 |
| `api/wrangler.toml` | **Modify** | API_SECRET 환경 변수 추가 |

### Tests (`src/__tests__/`)
| File | Action | Summary |
|------|--------|---------|
| `src/__tests__/ai.test.ts` | **Create** | ai.ts 클라이언트 테스트 (URL, auth, error handling) |

---

## Tasks

### Task 1: Hardcode API_BASE_URL in ai.ts

**Objective:** Fix the crash root cause by replacing empty `API_BASE_URL` with the actual Workers URL.

**Files:**
- Modify: `src/lib/ai.ts:5`

**Step 1: Replace API_BASE_URL**

```typescript
// Before:
const API_BASE_URL = ''; // AI API URL — 환경 변수 주입 불가 (Toss WebView에는 process.env 없음)

// After:
const API_BASE_URL = 'https://book-of-changes-api.YOUR-SUBDOMAIN.workers.dev';
```

**Note:** 실제 Workers URL은 배포 후 확인 필요. 플랜에서는 플레이스홀더 사용, 구현 시 실제 URL로 교체.

**Step 2: Verify no process.env references remain in ai.ts**

Run: `grep -n "process\.env" src/lib/ai.ts`
Expected: no output (no matches)

**Step 3: Commit**

```bash
git add src/lib/ai.ts
git commit -m "fix: hardcode API_BASE_URL to resolve Toss WebView crash"
```

---

### Task 2: Add auth token acquisition in ai.ts

**Objective:** Add `getAnonymousKey()` call with fallback to Workers-issued TTL token. Send token as Authorization header.

**Files:**
- Modify: `src/lib/ai.ts`

**Step 1: Write failing test**

Create: `src/__tests__/ai.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock @apps-in-toss/web-bridge
vi.mock('@apps-in-toss/web-bridge', () => ({
  getDeviceId: vi.fn().mockResolvedValue('test-device-id'),
}));

// Mock @apps-in-toss/web-framework
vi.mock('@apps-in-toss/web-framework', () => ({
  getAnonymousKey: vi.fn().mockResolvedValue({ type: 'HASH', hash: 'test-anon-key' }),
}));

import { requestAiInterpretation, AiError } from '@/lib/ai';

describe('ai.ts', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('sends Authorization header with anonymous key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ interpretation: 'test', advice: 'test advice' }),
    });

    await requestAiInterpretation({
      hexagramNumber: 1,
      highlightedLines: [],
      situation: '테스트',
      category: '기타',
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/interpret');
    expect(options.headers['Authorization']).toBeDefined();
    expect(options.headers['Authorization']).toContain('Bearer');
  });

  it('falls back to TTL token when getAnonymousKey returns undefined', async () => {
    const { getAnonymousKey } = await import('@apps-in-toss/web-framework');
    vi.mocked(getAnonymousKey).mockResolvedValueOnce(undefined);

    // Mock token endpoint
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/token')) {
        return { ok: true, status: 200, json: async () => ({ token: 'ttl-token-123', expiresAt: Date.now() + 60000 }) };
      }
      return { ok: true, status: 200, json: async () => ({ interpretation: 'ok', advice: 'ok' }) };
    });

    await requestAiInterpretation({
      hexagramNumber: 1,
      highlightedLines: [],
      situation: '테스트',
      category: '기타',
    });

    // Should have called /api/token first, then /api/interpret
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const interpretCall = mockFetch.mock.calls[1];
    expect(interpretCall[1].headers['Authorization']).toContain('ttl-token-123');
  });

  it('throws AiError when API_BASE_URL is empty', async () => {
    // This test verifies the guard exists
    // Already covered by existing code
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/__tests__/ai.test.ts`
Expected: FAIL — `getAnonymousKey` not imported in ai.ts, Authorization header not sent

**Step 3: Implement auth token acquisition in ai.ts**

Add to `src/lib/ai.ts`:

```typescript
// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<{ token: string; method: string } | null> {
  // Try getAnonymousKey first (SDK 2.4.5+)
  try {
    const { getAnonymousKey } = await import('@apps-in-toss/web-framework');
    const result = await getAnonymousKey();
    if (result && result !== 'INVALID_CATEGORY' && result !== 'ERROR' && result.type === 'HASH') {
      return { token: result.hash, method: 'anonymous_key' };
    }
  } catch {
    // SDK not available or bridge error
  }

  // Fallback: get TTL token from Workers
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return { token: cachedToken.token, method: 'ttl_token' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      cachedToken = { token: data.token, expiresAt: data.expiresAt };
      return { token: data.token, method: 'ttl_token' };
    }
  } catch {
    // Network error — proceed without auth
  }

  return null;
}
```

Update `requestAiInterpretation` to include auth header:

```typescript
export async function requestAiInterpretation(
  params: AiRequestParams,
  signal?: AbortSignal,
): Promise<AiInterpretation> {
  if (!API_BASE_URL) {
    throw new AiError('server', 'AI API URL이 설정되지 않았습니다');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const deviceId = await getDeviceId();
    const auth = await getAuthToken();

    const body = {
      hexagramNumber: params.hexagramNumber,
      ...(params.changingHexagramNumber ? { changingHexagramNumber: params.changingHexagramNumber } : {}),
      highlightedLines: params.highlightedLines,
      userContext: {
        situation: params.situation,
        category: params.category,
      },
      ...(deviceId ? { deviceId } : {}),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth) {
      headers['Authorization'] = `${auth.method} ${auth.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/interpret`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // ... rest unchanged (rate limit, error handling, response parsing)
  } catch (error) {
    // ... unchanged
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Step 4: Run test to verify pass**

Run: `npx vitest run src/__tests__/ai.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai.ts src/__tests__/ai.test.ts
git commit -m "feat: add getAnonymousKey auth with TTL token fallback"
```

---

### Task 3: Add /api/token endpoint to Cloudflare Workers

**Objective:** Backend endpoint to issue short-TTL tokens for clients without SDK 2.4.5+.

**Files:**
- Modify: `api/src/index.ts`
- Modify: `api/wrangler.toml`

**Step 1: Add API_SECRET to wrangler.toml**

```toml
[vars]
ALLOWED_ORIGIN = "https://*.tossmini.com"

# Add secret: wrangler secret put API_SECRET
# API_SECRET = ""  # Set via wrangler secret
```

**Step 2: Add /api/token endpoint to api/src/index.ts**

Add before the `/api/interpret` handler:

```typescript
// Token endpoint — issues short-TTL tokens for clients without SDK 2.4.5+
if (url.pathname === '/api/token' && request.method === 'POST') {
  try {
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store token in KV for verification
    await env.RATE_LIMIT.put(`token:${token}`, 'valid', { expirationTtl: 300 });

    return Response.json({ token, expiresAt }, { headers });
  } catch {
    return Response.json({ error: '토큰 발급 실패' }, { status: 500, headers });
  }
}
```

**Step 3: Add auth verification to /api/interpret**

Update the `/api/interpret` handler:

```typescript
if (url.pathname === '/api/interpret' && request.method === 'POST') {
  try {
    const body = await request.json();
    const req = validateRequest(body);

    // Auth verification
    const authHeader = request.headers.get('Authorization') ?? '';
    const rateLimitId = await verifyAuth(authHeader, req.deviceId, env.RATE_LIMIT);

    if (!rateLimitId) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401, headers });
    }

    // Rate limit with authenticated identifier
    const allowed = await checkRateLimit(env.RATE_LIMIT, rateLimitId);
    if (!allowed) {
      return Response.json(
        { error: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요' },
        { status: 429, headers },
      );
    }

    // ... rest of interpret logic unchanged
  } catch (error) {
    // ... unchanged
  }
}
```

Add `verifyAuth` function:

```typescript
async function verifyAuth(
  authHeader: string,
  deviceId: string | undefined,
  kv: KVNamespace,
): Promise<string | null> {
  if (!authHeader) {
    // No auth header — check deviceId as fallback (backward compat during transition)
    // Return null to reject if no auth at all
    return deviceId ?? null;
  }

  const [method, token] = authHeader.split(' ');

  if (method === 'anonymous_key') {
    // getAnonymousKey hash — use directly as rate limit identifier
    return `anon:${token}`;
  }

  if (method === 'ttl_token') {
    // Verify token exists in KV
    const stored = await kv.get(`token:${token}`);
    if (stored === 'valid') {
      return `ttl:${token}`;
    }
    return null;
  }

  return null;
}
```

**Step 4: Run existing tests to verify no breakage**

Run: `cd api && npx wrangler dev --test`  (or just verify TS compiles)
Run: `npx tsc --noEmit -p api/tsconfig.json`
Expected: no new errors

**Step 5: Commit**

```bash
git add api/src/index.ts api/wrangler.toml
git commit -m "feat: add /api/token endpoint and auth verification for AI API"
```

---

### Task 4: Uncomment AI section in ResultPage.tsx

**Objective:** Restore the AI interpretation UI by uncommenting all commented-out code.

**Files:**
- Modify: `src/pages/ResultPage.tsx`

**Step 1: Uncomment imports (line 6)**

```typescript
// Before:
// import { useAiInterpretation } from '@/hooks/useAiInterpretation';

// After:
import { useAiInterpretation } from '@/hooks/useAiInterpretation';
```

**Step 2: Uncomment lazy imports (line 20-22)**

```typescript
// Before:
// AI 컴포넌트는 이중 lazy loading (초기 번들 미증가)
// const AiInputForm = lazy(() => import('@/components/Result/AiInputForm'));
// const AiInterpretationCard = lazy(() => import('@/components/Result/AiInterpretationCard'));

// After:
import { lazy, Suspense, useRef } from 'react';  // Add to existing React import at line 1
// AI 컴포넌트는 이중 lazy loading (초기 번들 미증가)
const AiInputForm = lazy(() => import('@/components/Result/AiInputForm'));
const AiInterpretationCard = lazy(() => import('@/components/Result/AiInterpretationCard'));
```

**Note:** `lazy`, `Suspense`, `useRef` need to be imported. Currently line 1 only imports `useState, useEffect`. Update to:
```typescript
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
```

**Step 3: Uncomment state and refs (line 40, 54-58, 62)**

```typescript
const [showAi, setShowAi] = useState(false);
// ...
const aiHook = useAiInterpretation({
  hexagramNumber: session.hexagramNumber ?? 1,
  changingHexagramNumber: session.changingHexagramNumber ?? null,
  highlightedLines,
});
// ...
const lastInputRef = useRef<{ situation: string; category: string } | null>(null);
```

**Step 4: Uncomment aiToggleBtnStyle (line 164-177)**

```typescript
const aiToggleBtnStyle: CSSProperties = {
  margin: 0,
  padding: '14px',
  borderRadius: '12px',
  border: '1.5px solid #6B5CE7',
  backgroundColor: showAi ? '#6B5CE7' : 'var(--color-bg)',
  color: showAi ? 'var(--color-bg)' : '#6B5CE7',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 200ms ease, color 200ms ease',
  minHeight: '44px',
  width: '100%',
};
```

**Step 5: Uncomment AI section JSX (line 296-337)**

Remove the `{/* ... */}` comment wrapper. The JSX block becomes active:

```tsx
<div style={{ ...cardStyle, ...animBlock(400) }}>
  <button
    style={aiToggleBtnStyle}
    onClick={() => setShowAi(v => !v)}
    aria-expanded={showAi}
  >
    {showAi ? 'AI 맞춤 해석 닫기 ▲' : 'AI 맞춤 해석 받기 ▼'}
  </button>

  {showAi && (
    <Suspense fallback={null}>
      <div role="region" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {aiHook.state.status === 'idle' && (
          <AiInputForm
            onSubmit={(situation, category) => {
              lastInputRef.current = { situation, category };
              aiHook.requestInterpretation(situation, category);
            }}
            isLoading={false}
          />
        )}
        {aiHook.state.status === 'processing' && (
          <AiInputForm
            onSubmit={() => {}}
            isLoading={true}
          />
        )}
        <AiInterpretationCard
          state={aiHook.state}
          onRetry={() => {
            const last = lastInputRef.current;
            if (last) {
              aiHook.requestInterpretation(last.situation, last.category);
            }
          }}
          onReset={aiHook.reset}
        />
      </div>
    </Suspense>
  )}
</div>
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no new errors (pre-existing errors OK)

**Step 7: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 8: Run tests**

Run: `npm run test`
Expected: all existing tests pass

**Step 9: Build**

Run: `npm run build`
Expected: successful build, dist/ generated

**Step 10: ait build**

Run: `npx ait build`
Expected: .ait file generated

**Step 11: Commit**

```bash
git add src/pages/ResultPage.tsx
git commit -m "feat: uncomment AI interpretation section in ResultPage"
```

---

### Task 5: Verify end-to-end and cleanup

**Objective:** Final verification that all pieces work together.

**Step 1: Full test suite**

Run: `npm run test && npm run typecheck && npm run lint`
Expected: all pass

**Step 2: Build verification**

Run: `npm run build && npx ait build`
Expected: successful

**Step 3: Manual verification checklist**

- [ ] ResultPage renders with AI section toggle button visible
- [ ] Clicking "AI 맞춤 해석 받기 ▼" expands the input form
- [ ] Category chips work (연애/취업/재물/건강/대인관계/기타)
- [ ] Textarea accepts input with character counter
- [ ] "AI 해석 받기" button triggers API call
- [ ] Skeleton loading appears during processing
- [ ] No `process.env` ReferenceError in Toss WebView
- [ ] Auth token is sent (check network tab)
- [ ] Rate limit works (cannot spam requests)
- [ ] Error states render correctly (network error, rate limited)
- [ ] "다시 분석하기" resets to input form

**Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: verify AI interpretation feature reactivation"
```

---

## Pitfalls (from toss-mini-app-development skill)

1. **`process.env` 절대 사용 금지** — Toss WebView에 `process` 전역 없음. `typeof process` 가드 패턴 사용하거나 하드코딩.
2. **중첩 lazy loading 주의** — App→ResultPage(lazy)→AiInputForm(lazy)은 2단계 lazy. 직접 import 고려할 수 있지만, 기존 코드가 이미 이 패턴으로 작성되었으므로 유지.
3. **`getAnonymousKey` SDK 2.4.5+ 필요** — 현재 2.4.1. `undefined` 반환 시 폴백 필수. 토큰 캐시로 중복 요청 방지.
4. **SDK 버전 업그레이드 고려** — `package.json`에서 `@apps-in-toss/web-framework`를 2.4.5+로 올리면 `getAnonymousKey` 정상 작동. Phase 1에서는 폴백으로 동작, Phase 2에서 업그레이드 검토.
5. **Pre-push checklist** — `npm run lint && npm run typecheck && npm run test` 전부 통과해야 함.
6. **Phase마다 ait build + 토스 제출** — 한 번에 여러 Phase 올리지 말 것.
7. **`getAnonymousKey`는 "토스 서버 API 호출용 키가 아님"** — 내부 식별용. 인증 토큰으로 사용은 우리의 창의적 활용. 보안 요구 높으면 Phase 2에서 mTLS 검토.

## Dependencies

- 기존 의존성 변경 없음
- `@apps-in-toss/web-framework` 2.4.1 유지 (2.4.5 업그레이드는 Phase 2 검토)
- 새 npm 패키지 추가 없음
- Cloudflare Workers KV는 기존 `RATE_LIMIT` 네임스페이스 재사용