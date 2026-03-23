/**
 * 보상형 광고 추상화 (fire-and-forget 패턴)
 * 광고 결과는 UX에 영향을 주지 않으며, 수익 트래킹만 수행
 */
import { trackEvent } from '@/lib/toss';

// GoogleAdMob SDK 타입 (web-bridge에서 타입이 re-export 안 되므로 직접 정의)
interface AdMobSDK {
  isSupported?: () => boolean;
  loadAppsInTossAdMob: (params: Record<string, unknown>) => (() => void) | undefined;
  showAppsInTossAdMob: (params: Record<string, unknown>) => void;
}

// 개발용 테스트 광고 ID
const TEST_AD_GROUP_ID = 'ait-ad-test-rewarded-id';

// 프로덕션 광고 ID (콘솔에서 발급 후 교체)
export const AD_GROUP_ID = process.env.NODE_ENV === 'production'
  ? (process.env.PUBLIC_AD_GROUP_ID ?? TEST_AD_GROUP_ID)
  : TEST_AD_GROUP_ID;

/**
 * GoogleAdMob SDK 동적 로드 (lazy)
 * web-bridge는 web-framework의 하위 의존성이므로 동적 import
 */
async function getGoogleAdMob(): Promise<AdMobSDK | null> {
  try {
    const { GoogleAdMob } = await import('@apps-in-toss/web-bridge');
    return GoogleAdMob as unknown as AdMobSDK;
  } catch {
    return null;
  }
}

/**
 * 광고 SDK 지원 여부 확인
 */
export async function isAdSupported(): Promise<boolean> {
  try {
    const AdMob = await getGoogleAdMob();
    if (!AdMob) return false;
    return typeof AdMob.isSupported === 'function' ? AdMob.isSupported() : true;
  } catch {
    return false;
  }
}

/**
 * 보상형 광고 사전 로드 (ResultPage 진입 시 호출)
 * @returns cleanup 함수
 */
export async function preloadRewardedAd(adGroupId: string = AD_GROUP_ID): Promise<(() => void) | null> {
  try {
    const AdMob = await getGoogleAdMob();
    if (!AdMob) return null;

    const cleanup = AdMob.loadAppsInTossAdMob({
      adGroupId,
      type: 'rewarded',
      onLoaded: () => {
        trackEvent('ad_preloaded', { adGroupId });
      },
      onError: () => {
        // 조용히 무시 — fire-and-forget
      },
    });

    return cleanup ?? null;
  } catch {
    return null;
  }
}

/**
 * 보상형 광고 fire-and-forget 표시
 * 결과와 무관하게 반환, UX 비차단
 */
export function showRewardedAdFireAndForget(adGroupId: string = AD_GROUP_ID): void {
  (async () => {
    try {
      const supported = await isAdSupported();
      if (!supported) return;

      const AdMob = await getGoogleAdMob();
      if (!AdMob) return;

      AdMob.showAppsInTossAdMob({
        adGroupId,
        type: 'rewarded',
        onRewarded: () => {
          trackEvent('ad_rewarded', { adGroupId });
        },
        onDismissed: () => {
          trackEvent('ad_dismissed', { adGroupId });
        },
        onError: () => {
          // 조용히 무시
        },
      });
    } catch {
      // fire-and-forget: 모든 에러 조용히 무시
    }
  })();
}
