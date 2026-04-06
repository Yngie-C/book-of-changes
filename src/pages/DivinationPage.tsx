import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/toss';
import type { CSSProperties } from 'react';
import { Button, AlertDialog } from '@toss/tds-mobile';
import type { DivinationSession, LineResult } from '@/data/types';
import { useCoinToss } from '@/hooks/useCoinToss';
import { preloadInterstitialAd, showInterstitialAd } from '@/lib/ads';
import Layout from '@/components/common/Layout';
import ProgressBar from '@/components/common/ProgressBar';
import CoinToss from '@/components/Coin/CoinToss';
import HexagramStack from '@/components/Hexagram/HexagramStack';
import HelpModal, { HelpIcon } from '@/components/common/HelpModal';
import { LineTypeHelp } from '@/components/common/HelpContent';

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

  // 전면형 광고 사전 로드
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    preloadInterstitialAd().then(c => { cleanup = c; });
    return () => { cleanup?.(); };
  }, []);

  useEffect(() => {
    trackEvent('page_view_divination', 'screen');
  }, []);

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

  // When session completes, show interstitial ad then navigate
  useEffect(() => {
    if (session.isComplete && !completeCalled.current) {
      completeCalled.current = true;
      trackEvent('divination_complete', 'event', {
        hexagram_number: String(session.hexagramNumber ?? ''),
        has_changing: String(session.changingLineCount > 0),
      });
      setTimeout(() => {
        showInterstitialAd(() => {
          onComplete();
        });
      }, 1000);
    }
  }, [session.isComplete, onComplete]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLineTypeHelp, setShowLineTypeHelp] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>효 종류 알아보기</span>
          <HelpIcon onClick={() => setShowLineTypeHelp(true)} />
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
      <HelpModal
        open={showLineTypeHelp}
        onClose={() => setShowLineTypeHelp(false)}
        title="효의 종류"
      >
        <LineTypeHelp />
      </HelpModal>
    </Layout>
  );
}
