/**
 * Toss Apps-in-Toss SDK abstraction layer.
 * Uses @apps-in-toss/web-framework bridge APIs.
 * 로그인 불필요: 사용자 데이터를 수집하지 않는 순수 클라이언트 앱
 */

import { share, closeView } from '@apps-in-toss/web-framework';

// 토스 앱 환경 감지
export function isInTossApp(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes('TossApp') ||
         window.location.hostname.includes('tossmini.com');
}

// 공유 기능 (Granite SDK bridge)
export async function shareViaToss(params: {
  title: string;
  text: string;
  imageUrl?: string;
}): Promise<boolean> {
  // 토스 앱 내부: SDK share API 사용
  if (isInTossApp()) {
    try {
      await share({ message: `${params.title}\n${params.text}` });
      return true;
    } catch {
      return false;
    }
  }

  // 토스 앱 외부: Web Share API 폴백
  if (navigator.share) {
    try {
      await navigator.share({ title: params.title, text: params.text });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// 앱 닫기 (Granite SDK bridge)
export function closeTossApp(): void {
  if (isInTossApp()) {
    closeView().catch(() => {
      window.history.back();
    });
  } else {
    window.history.back();
  }
}

// 이벤트 추적 (향후 analytics 연동 예정)
export function trackEvent(event: string, params?: Record<string, string>): void {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[toss:track]', event, params);
  }
}
