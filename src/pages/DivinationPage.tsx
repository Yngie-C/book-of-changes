import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, AlertDialog } from '@toss/tds-mobile';
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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleBack = () => {
    if (session.currentStep > 0) {
      setShowConfirmDialog(true);
      return;
    }
    onBack();
  };

  const handleConfirmBack = () => {
    setShowConfirmDialog(false);
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

  const stepLabelStyle: CSSProperties = {
    position: 'fixed',
    bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
    left: '20px',
    right: '20px',
    textAlign: 'center',
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
        <div aria-live="polite">
          <CoinToss coins={coins} isAnimating={isAnimating} />
        </div>
      </div>

      <div style={stepLabelStyle} aria-live="polite">{stepLabel}</div>
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          left: '20px',
          right: '20px',
          maxWidth: '440px',
          margin: '0 auto',
          zIndex: 5,
        }}
      >
        <Button
          color="primary"
          variant="fill"
          size="xlarge"
          display="block"
          onClick={handleToss}
          disabled={isAnimating || session.isComplete}
          aria-disabled={isAnimating || session.isComplete}
          loading={isAnimating}
        >
          {isAnimating ? '던지는 중...' : session.isComplete ? '완성!' : '동전 던지기'}
        </Button>
      </div>
      <AlertDialog
        open={showConfirmDialog}
        title="점 중단"
        description="점을 중단하시겠어요?"
        alertButton={
          <>
            <AlertDialog.AlertButton onClick={() => setShowConfirmDialog(false)} variant="clear">
              계속하기
            </AlertDialog.AlertButton>
            <AlertDialog.AlertButton onClick={handleConfirmBack}>
              중단하기
            </AlertDialog.AlertButton>
          </>
        }
        onClose={() => setShowConfirmDialog(false)}
      />
    </Layout>
  );
}
