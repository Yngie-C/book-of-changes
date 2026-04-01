import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@toss/tds-mobile';
import type { DivinationSession } from '@/data/types';
import { useHexagram } from '@/hooks/useHexagram';
// import { useAiInterpretation } from '@/hooks/useAiInterpretation';
// import { attachBannerAd } from '@/lib/ads';
import Layout from '@/components/common/Layout';
import HexagramSymbol from '@/components/Hexagram/HexagramSymbol';
import HexagramInfo from '@/components/Hexagram/HexagramInfo';
import HexagramStack from '@/components/Hexagram/HexagramStack';
import ChangingGuide from '@/components/Hexagram/ChangingGuide';
import Interpretation from '@/components/Result/Interpretation';
import LineTexts from '@/components/Result/LineTexts';
// import ShareButton from '@/components/common/ShareButton';
import HelpModal, { HelpIcon } from '@/components/common/HelpModal';
import { HexagramHelp, LineTextsHelp, ChangingLineHelp, ChangingHexagramHelp } from '@/components/common/HelpContent';

// AI 컴포넌트는 이중 lazy loading (초기 번들 미증가)
// const AiInputForm = lazy(() => import('@/components/Result/AiInputForm'));
// const AiInterpretationCard = lazy(() => import('@/components/Result/AiInterpretationCard'));

type ResultPageProps = {
  session: DivinationSession;
  onRestart: () => void;
  onBack: () => void;
};

export default function ResultPage({ session, onRestart, onBack }: ResultPageProps) {
  const { hexagram, changingHexagram, interpretationRule } = useHexagram(session.lines);
  const [showChanging, setShowChanging] = useState(false);
  // const [showAi, setShowAi] = useState(false);
  const [helpModal, setHelpModal] = useState<'hexagram' | 'line' | 'changing' | 'changingHex' | null>(null);

  const highlightedLines = interpretationRule?.highlightedLines ?? [];

  // const aiHook = useAiInterpretation({
  //   hexagramNumber: session.hexagramNumber ?? 1,
  //   changingHexagramNumber: session.changingHexagramNumber ?? null,
  //   highlightedLines,
  // });

  // const lastInputRef = useRef<{ situation: string; category: string } | null>(null);

  // 배너 광고 (임시 비활성화)
  // const bannerCleanupRef = useRef<(() => void) | null>(null);

  // const attachBanner = useCallback((node: HTMLDivElement | null) => {
  //   bannerCleanupRef.current?.();
  //   bannerCleanupRef.current = null;
  //   if (!node) return;
  //   attachBannerAd(node).then(cleanup => {
  //     bannerCleanupRef.current = cleanup;
  //   });
  // }, []);

  // useEffect(() => {
  //   return () => { bannerCleanupRef.current?.(); };
  // }, []);

  const bottomCTA = (
    <Button
      color="primary"
      variant="fill"
      size="xlarge"
      display="block"
      onClick={onRestart}
    >
      다시 점치기
    </Button>
  );

  if (!hexagram) {
    return (
      <Layout title="점괘 결과" showBack onBack={onBack} bottomCTA={bottomCTA}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          결과를 불러오는 중...
        </div>
      </Layout>
    );
  }

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px 16px 24px',
    backgroundColor: 'var(--color-bg-secondary)',
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 20px',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    letterSpacing: '0.06em',
    marginBottom: '12px',
    justifyContent: 'center',
  };

  const animBlock = (delay: number): CSSProperties => ({
    animation: `slideUp 350ms ease both`,
    animationDelay: `${delay}ms`,
  });

  const changingToggleBtnStyle: CSSProperties = {
    margin: 0,
    padding: '14px',
    borderRadius: '12px',
    border: '1.5px solid var(--color-primary)',
    backgroundColor: showChanging ? 'var(--color-primary)' : 'var(--color-bg)',
    color: showChanging ? 'var(--color-bg)' : 'var(--color-primary)',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 200ms ease, color 200ms ease',
    minHeight: '44px',
    width: '100%',
  };

  // const aiToggleBtnStyle: CSSProperties = {
  //   margin: '0 20px',
  //   padding: '14px',
  //   borderRadius: '12px',
  //   border: '1.5px solid #6B5CE7',
  //   backgroundColor: showAi ? '#6B5CE7' : 'var(--color-bg)',
  //   color: showAi ? 'var(--color-bg)' : '#6B5CE7',
  //   fontSize: '15px',
  //   fontWeight: 600,
  //   cursor: 'pointer',
  //   transition: 'background-color 200ms ease, color 200ms ease',
  //   minHeight: '44px',
  //   width: 'calc(100% - 40px)',
  // };

  return (
    <Layout title="점괘 결과" showBack onBack={onBack} bottomCTA={bottomCTA}>
      <div style={pageStyle}>

        {/* Card 1: 괘 정보 + 효 구성 + 변효 가이드 */}
        <div style={{ ...cardStyle, ...animBlock(0) }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <HexagramSymbol hexagram={hexagram} size="large" />
            <HexagramInfo hexagram={hexagram} />
          </div>

          <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>효 구성</div>
          <HexagramStack lines={session.lines} showChanging size="medium" />

          {session.changingLineCount > 0 && interpretationRule && (
            <div style={{ marginTop: '16px' }}>
              <ChangingGuide rule={interpretationRule} onHelp={() => setHelpModal('changing')} />
            </div>
          )}
        </div>

        {/* Card 2: 괘사 (Interpretation) */}
        <div style={{ ...cardStyle, ...animBlock(100) }}>
          <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>
            괘사
            <HelpIcon onClick={() => setHelpModal('hexagram')} />
          </div>
          <Interpretation hexagram={hexagram} />
        </div>

        {/* Card 3: 효사 (LineTexts) */}
        <div style={{ ...cardStyle, ...animBlock(200) }}>
          <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>
            효사 <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '6px' }}>· 각 효의 의미</span>
            <HelpIcon onClick={() => setHelpModal('line')} />
          </div>
          <LineTexts hexagram={hexagram} highlightedLines={highlightedLines} />
        </div>

        {/* Card 4: 변괘 (only when changing hexagram exists) */}
        {changingHexagram && (
          <div style={{ ...cardStyle, ...animBlock(300) }}>
            <button
              style={changingToggleBtnStyle}
              onClick={() => setShowChanging(v => !v)}
              aria-expanded={showChanging}
            >
              {showChanging ? '변괘 닫기 ▲' : '변괘 보기 ▼'}
            </button>

            {showChanging && (
              <div role="region" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideUp 300ms ease both' }}>
                <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>
                  변괘
                  <HelpIcon onClick={() => setHelpModal('changingHex')} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <HexagramSymbol hexagram={changingHexagram} size="large" />
                  <HexagramInfo hexagram={changingHexagram} />
                </div>
                <Interpretation hexagram={changingHexagram} />
              </div>
            )}
          </div>
        )}

        {/* 배너 광고 (임시 비활성화) */}
        {/* <div
          ref={attachBanner}
          style={{ minHeight: '50px', margin: '0 20px' }}
          aria-label="광고"
        /> */}

        {/* AI 맞춤 해석 섹션 (임시 비활성화) */}
        {/* <div style={dividerStyle} />
        <div style={animBlock(500)}>
          <button
            style={aiToggleBtnStyle}
            onClick={() => setShowAi(v => !v)}
            aria-expanded={showAi}
          >
            {showAi ? 'AI 맞춤 해석 닫기 ▲' : 'AI 맞춤 해석 받기 ▼'}
          </button>

          {showAi && (
            <Suspense fallback={null}>
              <div role="region" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {aiHook.state.status === 'idle' && (
                  <AiInputForm
                    onSubmit={(situation, category) => {
                      lastInputRef.current = { situation, category };
                      aiHook.requestInterpretation(situation, category);
                    }}
                    isLoading={false}
                  />
                )}
                {aiHook.state.status === 'processing' && (
                  <AiInputForm
                    onSubmit={() => {}}
                    isLoading={true}
                  />
                )}
                <AiInterpretationCard
                  state={aiHook.state}
                  onRetry={() => {
                    const last = lastInputRef.current;
                    if (last) {
                      aiHook.requestInterpretation(last.situation, last.category);
                    }
                  }}
                  onReset={aiHook.reset}
                />
              </div>
            </Suspense>
          )}
        </div> */}
      </div>

      {/* Help Modals */}
      <HelpModal
        open={helpModal === 'hexagram'}
        onClose={() => setHelpModal(null)}
        title="괘사·단전·상전이란?"
      >
        <HexagramHelp />
      </HelpModal>

      <HelpModal
        open={helpModal === 'line'}
        onClose={() => setHelpModal(null)}
        title="효사란?"
      >
        <LineTextsHelp />
      </HelpModal>

      <HelpModal
        open={helpModal === 'changing'}
        onClose={() => setHelpModal(null)}
        title="변효란?"
      >
        <ChangingLineHelp />
      </HelpModal>

      <HelpModal
        open={helpModal === 'changingHex'}
        onClose={() => setHelpModal(null)}
        title="변괘란?"
      >
        <ChangingHexagramHelp />
      </HelpModal>
    </Layout>
  );
}
