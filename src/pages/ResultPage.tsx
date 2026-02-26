import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { DivinationSession } from '@/data/types';
import { useHexagram } from '@/hooks/useHexagram';
import Layout from '@/components/common/Layout';
import HexagramSymbol from '@/components/Hexagram/HexagramSymbol';
import HexagramInfo from '@/components/Hexagram/HexagramInfo';
import HexagramStack from '@/components/Hexagram/HexagramStack';
import ChangingGuide from '@/components/Hexagram/ChangingGuide';
import Interpretation from '@/components/Result/Interpretation';
import LineTexts from '@/components/Result/LineTexts';
import ShareButton from '@/components/common/ShareButton';
import HelpModal, { HelpIcon } from '@/components/common/HelpModal';
import { HexagramHelp, LineTextsHelp, ChangingLineHelp, ChangingHexagramHelp } from '@/components/common/HelpContent';

type ResultPageProps = {
  session: DivinationSession;
  onRestart: () => void;
  onBack: () => void;
};

export default function ResultPage({ session, onRestart, onBack }: ResultPageProps) {
  const { hexagram, changingHexagram, interpretationRule } = useHexagram(session.lines);
  const [showChanging, setShowChanging] = useState(false);
  const [helpModal, setHelpModal] = useState<'hexagram' | 'line' | 'changing' | 'changingHex' | null>(null);

  const bottomCTA = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-bg)',
          fontSize: '16px',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          minHeight: '44px',
        }}
        onClick={onRestart}
      >
        다시 점치기
      </button>
      <ShareButton hexagramName={hexagram?.name} />
    </div>
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
    gap: '28px',
    padding: '24px 0 120px',
  };

  const sectionTitleStyle = (delay: number): CSSProperties => ({
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    letterSpacing: '0.06em',
    padding: '0 20px',
    marginTop: '-8px',
    marginBottom: '4px',
    justifyContent: 'center',
    animation: `slideUp 350ms ease both`,
    animationDelay: `${delay}ms`,
  });

  const animBlock = (delay: number): CSSProperties => ({
    animation: `slideUp 350ms ease both`,
    animationDelay: `${delay}ms`,
  });

  const dividerStyle: CSSProperties = {
    height: '1px',
    backgroundColor: 'var(--color-divider)',
    margin: '0 20px',
  };

  const changingToggleBtnStyle: CSSProperties = {
    margin: '0 20px',
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
    width: 'calc(100% - 40px)',
  };

  const highlightedLines = interpretationRule?.highlightedLines ?? [];

  return (
    <Layout title="점괘 결과" showBack onBack={onBack} bottomCTA={bottomCTA}>
      <div style={pageStyle}>

        {/* Hexagram symbol + info */}
        <div style={{ ...animBlock(0), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '0 20px' }}>
          <HexagramSymbol hexagram={hexagram} size="large" />
          <HexagramInfo hexagram={hexagram} />
        </div>

        <div style={dividerStyle} />

        {/* Hexagram stack (completed lines) */}
        <div style={animBlock(100)}>
          <div style={{ ...sectionTitleStyle(100), display: 'flex', alignItems: 'center' }}>효 구성</div>
          <HexagramStack lines={session.lines} showChanging size="medium" />
        </div>

        {/* Changing guide — only when changing lines exist */}
        {session.changingLineCount > 0 && interpretationRule && (
          <div style={animBlock(150)}>
            <ChangingGuide rule={interpretationRule} onHelp={() => setHelpModal('changing')} />
          </div>
        )}

        <div style={dividerStyle} />

        {/* Interpretation (괘사/단전/상전) */}
        <div style={animBlock(200)}>
          <div style={{ ...sectionTitleStyle(200), display: 'flex', alignItems: 'center' }}>
            괘사
            <HelpIcon onClick={() => setHelpModal('hexagram')} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <Interpretation hexagram={hexagram} />
          </div>
        </div>

        <div style={dividerStyle} />

        {/* Line texts (효사 accordion) */}
        <div style={animBlock(300)}>
          <div style={{ ...sectionTitleStyle(300), display: 'flex', alignItems: 'center' }}>
            효사
            <HelpIcon onClick={() => setHelpModal('line')} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <LineTexts hexagram={hexagram} highlightedLines={highlightedLines} />
          </div>
        </div>

        {/* Changing hexagram toggle — only if changing hexagram exists */}
        {changingHexagram && (
          <>
            <div style={dividerStyle} />
            <div style={animBlock(400)}>
              <button
                style={changingToggleBtnStyle}
                onClick={() => setShowChanging(v => !v)}
              >
                {showChanging ? '변괘 닫기 ▲' : '변괘 보기 ▼'}
              </button>

              {showChanging && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideUp 300ms ease both' }}>
                  <div style={{ ...sectionTitleStyle(0), display: 'flex', alignItems: 'center', animation: 'none', marginTop: '4px', marginBottom: '-12px' }}>
                    변괘
                    <HelpIcon onClick={() => setHelpModal('changingHex')} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '0 20px' }}>
                    <HexagramSymbol hexagram={changingHexagram} size="large" />
                    <HexagramInfo hexagram={changingHexagram} />
                  </div>
                  <Interpretation hexagram={changingHexagram} />
                </div>
              )}
            </div>
          </>
        )}
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
