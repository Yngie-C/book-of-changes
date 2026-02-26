import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { DivinationSession, LineResult } from '@/data/types';
import { useCoinToss } from '@/hooks/useCoinToss';
import Layout from '@/components/common/Layout';
import ProgressBar from '@/components/common/ProgressBar';
import CoinToss from '@/components/Coin/CoinToss';
import HexagramStack from '@/components/Hexagram/HexagramStack';

type DivinationPageProps = {
  session: DivinationSession;
  onAddLine: (line: LineResult) => void;
  onBack: () => void;
  onComplete: () => void;
};

export default function DivinationPage({
  session,
  onAddLine,
  onBack,
  onComplete,
}: DivinationPageProps) {
  const { isAnimating, coins, result, toss } = useCoinToss();
  const resultHandled = useRef(false);
  const completeCalled = useRef(false);

  // When coin toss result arrives, add it to session
  useEffect(() => {
    if (result && !resultHandled.current) {
      resultHandled.current = true;
      onAddLine(result);
    }
  }, [result, onAddLine]);

  // Reset the handled flag when a new toss starts
  useEffect(() => {
    if (isAnimating) {
      resultHandled.current = false;
    }
  }, [isAnimating]);

  // When session completes, navigate after short delay
  useEffect(() => {
    if (session.isComplete && !completeCalled.current) {
      completeCalled.current = true;
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  }, [session.isComplete, onComplete]);

  const handleBack = () => {
    if (session.currentStep > 0) {
      const confirmed = window.confirm('점을 중단하시겠습니까?');
      if (!confirmed) return;
    }
    onBack();
  };

  const handleToss = () => {
    if (!isAnimating && !session.isComplete) {
      toss();
    }
  };

  const stepLabel = session.currentStep < 6
    ? `6회 중 ${session.currentStep + 1}회째`
    : '완성!';

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px 120px',
    gap: '8px',
    animation: 'fadeIn 300ms ease both',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    textAlign: 'center',
    letterSpacing: '0.04em',
  };

  const btnStyle: CSSProperties = {
    position: 'fixed',
    bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 40px)',
    maxWidth: '440px',
    padding: '18px',
    borderRadius: '16px',
    backgroundColor: isAnimating || session.isComplete
      ? 'var(--color-text-disabled)'
      : 'var(--color-primary)',
    color: 'var(--color-bg)',
    fontSize: '17px',
    fontWeight: 700,
    border: 'none',
    cursor: isAnimating || session.isComplete ? 'not-allowed' : 'pointer',
    transition: 'background-color 200ms ease',
    boxShadow: isAnimating || session.isComplete
      ? 'none'
      : '0 4px 16px rgba(49,130,246,0.35)',
  };

  const stepLabelStyle: CSSProperties = {
    position: 'fixed',
    bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };

  return (
    <Layout
      title="동전 던지기"
      showBack
      onBack={handleBack}
      rightContent={<ProgressBar current={session.currentStep} total={6} />}
    >
      <div style={pageStyle}>
        <div style={sectionTitleStyle}>쌓인 효</div>
        <HexagramStack
          lines={session.lines}
          currentStep={session.currentStep}
          showChanging
          size="medium"
        />

        <div style={sectionTitleStyle}>동전</div>
        <CoinToss coins={coins} isAnimating={isAnimating} />
      </div>

      <div style={stepLabelStyle}>{stepLabel}</div>
      <button
        style={btnStyle}
        onClick={handleToss}
        disabled={isAnimating || session.isComplete}
      >
        {isAnimating ? '던지는 중...' : session.isComplete ? '완성!' : '동전 던지기'}
      </button>
    </Layout>
  );
}
