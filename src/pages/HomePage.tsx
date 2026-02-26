import { useState } from 'react';
import type { CSSProperties } from 'react';
import Layout from '@/components/common/Layout';

type HomePageProps = {
  onStart: () => void;
};

export default function HomePage({ onStart }: HomePageProps) {
  const [showGuide, setShowGuide] = useState(false);

  const contentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100dvh - 56px)',
    padding: '40px 24px',
    gap: '32px',
    animation: 'slideUp 350ms ease both',
  };

  const symbolStyle: CSSProperties = {
    fontSize: '96px',
    lineHeight: 1,
    animation: 'pulse 1.8s ease-in-out infinite',
    userSelect: 'none',
  };

  const taglineStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    textAlign: 'center',
    lineHeight: 1.5,
    whiteSpace: 'pre-line',
  };

  const startBtnStyle: CSSProperties = {
    width: '100%',
    maxWidth: '320px',
    padding: '18px',
    borderRadius: '16px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-bg)',
    fontSize: '18px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(49,130,246,0.35)',
    transition: 'transform 150ms ease, box-shadow 150ms ease',
  };

  const guideBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--color-primary)',
    fontWeight: 500,
    padding: '4px 0',
    animation: 'fadeIn 350ms ease both',
    animationDelay: '100ms',
  };

  const guideBoxStyle: CSSProperties = {
    width: '100%',
    maxWidth: '320px',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-secondary)',
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.7,
    animation: 'slideUp 250ms ease both',
  };

  return (
    <Layout title="주역 동전점" showBack={false}>
      <div style={contentStyle}>
        <div style={symbolStyle}>䷀</div>

        <p style={taglineStyle}>{'마음을 가다듬고\n질문을 떠올리세요'}</p>

        <button
          style={startBtnStyle}
          onClick={onStart}
          onMouseDown={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(49,130,246,0.25)';
          }}
          onMouseUp={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(49,130,246,0.35)';
          }}
        >
          점 시작하기
        </button>

        <button style={guideBtnStyle} onClick={() => setShowGuide(v => !v)}>
          사용 방법 보기 {showGuide ? '▲' : '▼'}
        </button>

        {showGuide && (
          <div style={guideBoxStyle}>
            동전 3개를 6번 던져 점괘를 완성합니다. 각 던지기가 하나의 효를 만들고,
            6개의 효가 모여 하나의 괘가 됩니다.
          </div>
        )}
      </div>
    </Layout>
  );
}
