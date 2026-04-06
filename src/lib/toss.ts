/**
 * Toss Apps-in-Toss SDK abstraction layer.
 * Uses @apps-in-toss/web-framework bridge APIs.
 * 로그인 불필요: 사용자 데이터를 수집하지 않는 순수 클라이언트 앱
 */

import { share, closeView, getTossShareLink, saveBase64Data, setClipboardText, Analytics } from '@apps-in-toss/web-framework';

// 토스 앱 환경 감지
export function isInTossApp(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes('TossApp') ||
         window.location.hostname.includes('tossmini.com');
}

// 공유 기능 (3단계 폴백: SDK share → Web Share API → 클립보드)
export async function shareViaToss(params: {
  title: string;
  text: string;
}): Promise<'shared' | 'clipboard' | 'failed'> {
  const message = `${params.title}\n${params.text}`;

  // 1차: 토스 SDK share
  if (isInTossApp()) {
    try {
      await share({ message });
      return 'shared';
    } catch (err) {
      trackEvent('share_sdk_error', 'event', { error: String(err) });
    }
  }

  // 2차: Web Share API 폴백
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: params.title, text: params.text });
      return 'shared';
    } catch (err) {
      // 사용자가 명시적으로 취소한 경우 클립보드 폴백 안 함
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'failed';
      }
    }
  }

  // 3차: 클립보드 복사 폴백
  try {
    if (isInTossApp()) {
      await setClipboardText(message);
    } else {
      await navigator.clipboard.writeText(message);
    }
    return 'clipboard';
  } catch {
    return 'failed';
  }
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

// OG 이미지 URL (토스 콘솔에 업로드 후 실제 URL로 교체)
const OG_IMAGE_URL = '';

// 토스 공유 링크 생성
export async function createShareLink(path?: string): Promise<string> {
  const deepLink = path ?? 'intoss://book-of-changes';
  if (isInTossApp()) {
    try {
      return OG_IMAGE_URL
        ? await getTossShareLink(deepLink, OG_IMAGE_URL)
        : await getTossShareLink(deepLink);
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

// 이벤트 추적 (토스 Analytics SDK 연동)
type LogType = 'screen' | 'click' | 'impression' | 'event';

export function trackEvent(
  logName: string,
  logType: LogType = 'event',
  params?: Record<string, string | number | boolean>,
): void {
  const mergedParams = { log_name: logName, ...params };
  try {
    switch (logType) {
      case 'screen':
        Analytics.screen(mergedParams);
        break;
      case 'click':
        Analytics.click(mergedParams);
        break;
      case 'impression':
        Analytics.impression(mergedParams);
        break;
      default:
        // 'event' — Analytics.click을 범용 이벤트로 사용
        Analytics.click(mergedParams);
        break;
    }
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[toss:track]', logName, logType, params);
    }
  }
}
