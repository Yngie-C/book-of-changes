import { useState, type RefObject } from 'react';
import type { CSSProperties } from 'react';
import { Toast } from '@toss/tds-mobile';
import { shareViaToss, isInTossApp, createShareLink } from '@/lib/toss';

type ShareButtonProps = {
  hexagramName?: string;
  hexagramKeyword?: string;
  captureRef?: RefObject<HTMLDivElement | null>;
};

export default function ShareButton({ hexagramName, hexagramKeyword }: ShareButtonProps) {
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);

  const showMessage = (msg: string) => {
    setToastText(msg);
    setShowToast(true);
  };

  // 링크 공유: 결과 요약 텍스트 + 앱 링크
  const handleShareLink = async () => {
    const resultText = hexagramName
      ? `${hexagramName}${hexagramKeyword ? ` — ${hexagramKeyword}` : ''}`
      : '점괘 결과';

    const shareLink = await createShareLink();
    const message = `🪙 간편 운세 동전 주역점\n\n나의 점괘: ${resultText}\n\n나도 점쳐보기 👉 ${shareLink}`;

    if (isInTossApp()) {
      const shared = await shareViaToss({ title: '간편 운세 동전 주역점', text: message });
      if (shared) return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: '간편 운세 동전 주역점', text: message });
        return;
      } catch {
        // user cancelled
      }
    }

    await navigator.clipboard.writeText(message).catch(() => null);
    showMessage('결과가 클립보드에 복사되었어요');
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginTop: '8px',
  };

  const linkBtnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    flex: 1,
    padding: '14px 12px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '44px',
    border: '1.5px solid var(--color-primary)',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    transition: 'opacity 150ms ease',
  };

  return (
    <>
      <div style={containerStyle}>
        <button style={linkBtnStyle} onClick={handleShareLink}>
          공유하기
        </button>
      </div>
      <Toast
        open={showToast}
        position="bottom"
        text={toastText}
        onClose={() => setShowToast(false)}
      />
    </>
  );
}