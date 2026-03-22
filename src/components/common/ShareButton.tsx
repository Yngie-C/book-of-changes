import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Toast } from '@toss/tds-mobile';
import { shareViaToss, isInTossApp } from '@/lib/toss';

type ShareButtonProps = {
  hexagramName?: string;
};

export default function ShareButton({ hexagramName }: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false);

  const handleShare = async () => {
    const title = '간편 운세 동전 주역점';
    const text = hexagramName
      ? `간편 운세 동전 주역점 결과: ${hexagramName}`
      : '간편 운세 동전 주역점 결과';

    // Try Toss share first (works inside Toss App)
    if (isInTossApp()) {
      const shared = await shareViaToss({ title, text });
      if (shared) return;
    }

    // Web Share API fallback
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // user cancelled or not supported
      }
    }

    // Clipboard fallback
    await navigator.clipboard.writeText(text).catch(() => null);
    setShowToast(true);
  };

  const btnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-secondary)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  };

  return (
    <>
      <button style={btnStyle} onClick={handleShare}>
        공유하기
      </button>
      <Toast
        open={showToast}
        position="bottom"
        text="결과가 클립보드에 복사되었어요"
        onClose={() => setShowToast(false)}
      />
    </>
  );
}
