import { useState, type RefObject } from 'react';
import type { CSSProperties } from 'react';
import { Toast } from '@toss/tds-mobile';
import html2canvas from 'html2canvas';
import { shareViaToss, createShareLink, saveImageToDevice, trackEvent } from '@/lib/toss';

type ShareButtonProps = {
  hexagramName?: string;
  hexagramKeyword?: string;
  captureRef?: RefObject<HTMLDivElement | null>;
};

export default function ShareButton({ hexagramName, hexagramKeyword, captureRef }: ShareButtonProps) {
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [saving, setSaving] = useState(false);

  const showMessage = (msg: string) => {
    setToastText(msg);
    setShowToast(true);
  };

  // 링크 공유: 결과 요약 텍스트 + 앱 링크
  const handleShareLink = async () => {
    trackEvent('share_attempt', 'click', { type: 'link' });

    const resultText = hexagramName
      ? `${hexagramName}${hexagramKeyword ? ` — ${hexagramKeyword}` : ''}`
      : '점괘 결과';

    const shareLink = await createShareLink();
    const message = `나의 점괘: ${resultText}\n\n나도 점쳐보기 👉 ${shareLink}`;

    const result = await shareViaToss({ title: '🪙 간편 운세 동전 주역점', text: message });

    if (result === 'clipboard') {
      showMessage('결과가 클립보드에 복사되었어요');
    } else if (result === 'failed') {
      showMessage('공유에 실패했어요');
    }
    trackEvent('share_result', 'event', { type: 'link', result });
  };

  // 이미지 저장: 결과 카드 캡처 → 기기 저장
  const handleSaveImage = async () => {
    trackEvent('image_save_attempt', 'click');

    if (!captureRef?.current) {
      showMessage('캡처할 영역을 찾을 수 없어요');
      return;
    }

    setSaving(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#F5F5F8',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const base64 = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `divination-${timestamp}.png`;

      const saved = await saveImageToDevice(base64, fileName);
      if (saved) {
        showMessage('이미지가 저장되었어요');
        trackEvent('image_save_success', 'event');
      } else {
        showMessage('이미지 저장에 실패했어요');
        trackEvent('image_save_fail', 'event');
      }
    } catch {
      showMessage('이미지 생성에 실패했어요');
      trackEvent('image_save_fail', 'event');
    } finally {
      setSaving(false);
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
    width: '100%',
    marginTop: '8px',
  };

  const btnBase: CSSProperties = {
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
    transition: 'opacity 150ms ease',
  };

  const linkBtnStyle: CSSProperties = {
    ...btnBase,
    border: '1.5px solid var(--color-primary)',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  };

  const imageBtnStyle: CSSProperties = {
    ...btnBase,
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-secondary)',
    opacity: saving ? 0.6 : 1,
    pointerEvents: saving ? 'none' : 'auto',
  };

  return (
    <>
      <div style={containerStyle}>
        <button style={linkBtnStyle} onClick={handleShareLink}>
          공유하기
        </button>
        <button style={imageBtnStyle} onClick={handleSaveImage} disabled={saving}>
          {saving ? '저장 중...' : '이미지 저장'}
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
