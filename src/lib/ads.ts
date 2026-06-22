/**
 * 광고 추상화 모듈
 * - 보상형 (Rewarded): fire-and-forget, UX 비차단
 * - 전면형 (Interstitial): 페이지 전환 사이에 표시, 닫힘 후 진행
 * - 배너형 (Banner): DOM 요소에 부착, 인라인 표시
 */
import { trackEvent } from '@/lib/toss';

// GoogleAdMob SDK 타입 (web-bridge에서 타입이 re-export 안 되므로 직접 정의)
interface AdMobSDK {
  isSupported?: () => boolean;
  loadAppsInTossAdMob: (params: Record<string, unknown>) => (() => void) | undefined;
  showAppsInTossAdMob: (params: Record<string, unknown>) => void;
}

// TossAds SDK 타입
interface TossAdsSDK {
  initialize: ((options?: {
    callbacks?: {
      onInitialized?: () => void;
      onInitializationFailed?: (error: Error) => void;
    };
  }) => void) & { isSupported?: () => boolean };
  attachBanner: ((
    adGroupId: string,
    target: string | HTMLElement,
    options?: {
      theme?: 'auto' | 'light' | 'dark';
      tone?: 'blackAndWhite' | 'grey';
      variant?: 'card' | 'expanded';
      callbacks?: Record<string, unknown>;
    },
  ) => { destroy: () => void }) & { isSupported?: () => boolean };
  destroy: (slotId: string) => void;
  destroyAll: () => void;
}

// FullScreenAd 함수 타입
interface FullScreenAdLoader {
  (args: {
    onEvent: (data: { type: string }) => void;
    onError: (err: unknown) => void;
    options?: { adGroupId: string };
  }): () => void;
  isSupported?: () => boolean;
}

// 개발용 테스트 광고 ID
const TEST_AD_GROUP_ID = 'ait-ad-test-rewarded-id';
const _TEST_INTERSTITIAL_AD_GROUP_ID = 'ait-ad-test-interstitial-id';
const PROD_INTERSTITIAL_AD_GROUP_ID = 'ait.v2.live.96270e5f78604766';
const _TEST_BANNER_AD_GROUP_ID = 'ait-ad-test-banner-id';
const PROD_BANNER_AD_GROUP_ID = 'ait.v2.live.73acf2d008f94e8f';

// 보상형 광고 ID (프로덕션 ID 발급 후 교체)
export const AD_GROUP_ID = TEST_AD_GROUP_ID;

export const INTERSTITIAL_AD_GROUP_ID = PROD_INTERSTITIAL_AD_GROUP_ID;

export const BANNER_AD_GROUP_ID = PROD_BANNER_AD_GROUP_ID;


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
        trackEvent('ad_preloaded', 'event', { adGroupId });
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
          trackEvent('ad_rewarded', 'event', { adGroupId });
        },
        onDismissed: () => {
          trackEvent('ad_dismissed', 'event', { adGroupId });
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

// ─── 전면형 광고 (Interstitial / FullScreen) ───

/**
 * 전면형 광고 사전 로드
 * @returns cleanup 함수
 */
export async function preloadInterstitialAd(
  adGroupId: string = INTERSTITIAL_AD_GROUP_ID,
): Promise<(() => void) | null> {
  try {
    const { loadFullScreenAd } = await import('@apps-in-toss/web-bridge');
    const loader = loadFullScreenAd as unknown as FullScreenAdLoader;
    if (typeof loader.isSupported === 'function' && !loader.isSupported()) return null;

    const cleanup = loader({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          trackEvent('interstitial_preloaded', 'event', { adGroupId });
        }
      },
      onError: () => {
        // 조용히 무시
      },
    });

    return cleanup ?? null;
  } catch {
    return null;
  }
}

/**
 * 전면형 광고 표시
 * 광고 닫힘/실패 시 onDone 콜백 호출 → 페이지 전환에 사용
 */
export async function showInterstitialAd(
  onDone: () => void,
  adGroupId: string = INTERSTITIAL_AD_GROUP_ID,
): Promise<void> {
  try {
    const { showFullScreenAd } = await import('@apps-in-toss/web-bridge');
    const shower = showFullScreenAd as unknown as FullScreenAdLoader;
    if (typeof shower.isSupported === 'function' && !shower.isSupported()) {
      onDone();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };

    shower({
      options: { adGroupId },
      onEvent: (event) => {
        trackEvent('interstitial_event', 'event', { adGroupId, type: event.type });
        if (event.type === 'dismissed' || event.type === 'failedToShow') {
          finish();
        }
      },
      onError: () => {
        finish();
      },
    });

    // 안전망: 10초 후 강제 진행
    setTimeout(finish, 10_000);
  } catch {
    onDone();
  }
}

// ─── 배너형 광고 (TossAds Banner) ───

let tossAdsInitialized = false;

/**
 * TossAds SDK 동적 로드
 */
async function getTossAds(): Promise<TossAdsSDK | null> {
  try {
    const { TossAds } = await import('@apps-in-toss/web-bridge');
    return TossAds as unknown as TossAdsSDK;
  } catch {
    return null;
  }
}

/**
 * 배너 광고를 DOM 요소에 부착
 * @param target - 배너를 부착할 HTML 요소
 * @returns destroy 함수 (cleanup용)
 */
export async function attachBannerAd(
  target: HTMLElement,
  adGroupId: string = BANNER_AD_GROUP_ID,
): Promise<(() => void) | null> {
  try {
    const ads = await getTossAds();
    if (!ads) return null;
    if (typeof ads.attachBanner.isSupported === 'function' && !ads.attachBanner.isSupported()) {
      return null;
    }

    // 최초 1회 초기화
    if (!tossAdsInitialized) {
      ads.initialize({
        callbacks: {
          onInitialized: () => {
            trackEvent('toss_ads_initialized', 'event');
          },
        },
      });
      tossAdsInitialized = true;
    }

    const result = ads.attachBanner(adGroupId, target, {
      theme: 'auto',
      variant: 'card',
      callbacks: {
        onAdRendered: () => {
          trackEvent('banner_rendered', 'event', { adGroupId });
        },
        onAdFailedToRender: () => {
          trackEvent('banner_failed', 'event', { adGroupId });
        },
      },
    });

    return () => result.destroy();
  } catch {
    return null;
  }
}
