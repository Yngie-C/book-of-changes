/**
 * Toss Apps-in-Toss SDK abstraction layer.
 * Uses @apps-in-toss/web-framework bridge APIs.
 * 로그인 불필요: 사용자 데이터를 수집하지 않는 순수 클라이언트 앱
 */

import { share, closeView, getTossShareLink, saveBase64Data } from '@apps-in-toss/web-framework';

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

// 토스 공유 링크 생성
export async function createShareLink(path?: string): Promise<string> {
  const deepLink = path ?? 'intoss://book-of-changes';
  if (isInTossApp()) {
    try {
      return await getTossShareLink(deepLink);
    } catch {
      return 'https://minion.toss.im/dtLlHFID';
    }
  }
  return 'https://minion.toss.im/dtLlHFID';
}

// 이미지 기기 저장 (Base64 → 갤러리)
export async function saveImageToDevice(base64Data: string, fileName: string): Promise<boolean> {
  if (isInTossApp()) {
    try {
      // data:image/png;base64, 프리픽스 제거
      const pureBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      await saveBase64Data({
        data: pureBase64,
        fileName,
        mimeType: 'image/png',
      });
      return true;
    } catch {
      return false;
    }
  }

  // 토스 외부: 다운로드 링크로 폴백
  try {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    link.click();
    return true;
  } catch {
    return false;
  }
}

// 이벤트 추적 (향후 analytics 연동 예정)
type LogType = 'screen' | 'click' | 'impression' | 'event';

export function trackEvent(
  logName: string,
  logTypeOrParams?: LogType | Record<string, string | number | boolean>,
  params?: Record<string, string | number | boolean>,
): void {
  let logType: LogType = 'event';
  let mergedParams: Record<string, string | number | boolean> | undefined;

  if (typeof logTypeOrParams === 'string') {
    logType = logTypeOrParams;
    mergedParams = params;
  } else if (logTypeOrParams && typeof logTypeOrParams === 'object') {
    mergedParams = logTypeOrParams;
  }

  if (typeof window !== 'undefined') {
    console.debug('[toss:track]', logType, logName, mergedParams);
  }
}
