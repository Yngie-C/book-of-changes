/**
 * Toss Apps-in-Toss SDK abstraction layer.
 * In production, replace stubs with actual SDK calls.
 * @see https://toss.im/developers/docs/appintos
 */

// Environment detection
export function isInTossApp(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.userAgent.includes('TossApp') ||
         window.location.hostname.includes('toss');
}

// Share via Toss native share
export async function shareViaToss(params: {
  title: string;
  text: string;
  imageUrl?: string;
}): Promise<boolean> {
  if (!isInTossApp()) return false;

  // When Toss SDK is available:
  // const { share } = await import('@tossinternals/appintos');
  // await share(params);
  // return true;

  // Fallback: use Web Share API (works in Toss WebView)
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

// Close the mini-app
export function closeTossApp(): void {
  if (!isInTossApp()) return;
  // When SDK available: toss.close();
  window.history.back();
}

// Track event (analytics)
export function trackEvent(event: string, params?: Record<string, string>): void {
  if (!isInTossApp()) return;
  // When SDK available: toss.analytics.track(event, params);
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[toss:track]', event, params);
  }
}
