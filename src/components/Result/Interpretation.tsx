import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Hexagram } from '@/data/types';

type InterpretationProps = {
  hexagram: Hexagram;
};

// type ToggleState = { desc: boolean; judg: boolean; img: boolean };

export default function Interpretation({ hexagram }: InterpretationProps) {
  // const [open, setOpen] = useState<ToggleState>({ desc: false, judg: false, img: false });
  const [judgOpen, setJudgOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: 0,
  };

  const blockStyle: CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-elevated, #F2F4F6)',
  };

  const blockTitleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '8px',
  };

  const accordionHeaderStyle = (isOpen: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    padding: '16px',
    borderRadius: isOpen ? '12px 12px 0 0' : '12px',
    backgroundColor: 'var(--color-bg-elevated, #F2F4F6)',
    textAlign: 'left',
  });

  const accordionArrowStyle = (isOpen: boolean): CSSProperties => ({
    fontSize: '12px',
    color: 'var(--color-text-tertiary)',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 200ms ease',
  });

  const accordionBodyStyle = (isOpen: boolean): CSSProperties => ({
    maxHeight: isOpen ? '600px' : '0',
    overflow: 'hidden',
    transition: 'max-height 300ms ease',
  });

  // const toggleBtnStyle: CSSProperties = {
  //   fontSize: '12px',
  //   color: 'var(--color-text-tertiary)',
  //   cursor: 'pointer',
  //   background: 'none',
  //   border: 'none',
  //   padding: 0,
  //   marginBottom: '8px',
  //   display: 'block',
  // };

  // const originalWrapStyle = (isOpen: boolean): CSSProperties => ({
  //   backgroundColor: '#FFFBF0',
  //   borderLeft: '3px solid #D4A853',
  //   padding: isOpen ? '12px 14px' : '0 14px',
  //   borderRadius: '8px',
  //   marginBottom: isOpen ? '10px' : 0,
  //   overflow: 'hidden',
  //   maxHeight: isOpen ? '600px' : '0',
  //   transition: 'max-height 300ms ease, padding 300ms ease, margin-bottom 300ms ease',
  //   boxSizing: 'border-box',
  // });

  // const originalTextStyle: CSSProperties = {
  //   fontFamily: "'Noto Serif TC', 'Nanum Myeongjo', 'Batang', serif",
  //   fontSize: '16px',
  //   fontWeight: 700,
  //   color: 'var(--color-text-primary)',
  //   lineHeight: 1.9,
  //   marginBottom: 0,
  // };

  // const readingStyle: CSSProperties = {
  //   fontSize: '13px',
  //   color: 'var(--color-text-secondary)',
  //   lineHeight: 1.7,
  //   marginTop: '6px',
  // };

  const textStyle: CSSProperties = {
    fontSize: 'var(--font-size-body1)',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
  };

  const italicTextStyle: CSSProperties = {
    fontSize: 'var(--font-size-body1)',
    color: 'var(--color-text-tertiary)',
    lineHeight: 1.7,
    fontWeight: 400,
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid var(--color-divider)',
  };

  // const toggle = (key: keyof ToggleState) =>
  //   setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  // const renderOriginal = (
  //   original: string | undefined,
  //   reading: string | undefined,
  //   isOpen: boolean,
  // ) => {
  //   if (!original) return null;
  //   return (
  //     <div style={originalWrapStyle(isOpen)}>
  //       <p style={originalTextStyle}>{original}</p>
  //       {reading && <p style={readingStyle}>{reading}</p>}
  //     </div>
  //   );
  // };

  return (
    <div style={wrapStyle}>
      {/* 괘사 — 상시 노출 */}
      <div style={blockStyle}>
        <div style={blockTitleStyle}>
          괘사 <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>· 이번 점괘의 뜻</span>
        </div>
        {/* {hexagram.descriptionOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('desc')}>
            {open.desc ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {renderOriginal(hexagram.descriptionOriginal, hexagram.descriptionReading, open.desc)} */}
        {hexagram.descriptionSimple ? (
          <>
            <p style={textStyle}>{hexagram.descriptionSimple}</p>
            {hexagram.descriptionSimple !== hexagram.description && (
              <p style={italicTextStyle}>{hexagram.description}</p>
            )}
          </>
        ) : (
          <p style={textStyle}>{hexagram.description}</p>
        )}
      </div>

      {/* 단전 — 아코디언 (기본 접힘) */}
      <div>
        <button
          style={accordionHeaderStyle(judgOpen)}
          onClick={() => setJudgOpen(o => !o)}
          aria-expanded={judgOpen}
        >
          <span style={blockTitleStyle}>
            단전 <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>· 공자의 해설</span>
          </span>
          <span style={accordionArrowStyle(judgOpen)}>▼</span>
        </button>
        <div style={accordionBodyStyle(judgOpen)}>
          <div style={{ padding: '0 16px 16px', backgroundColor: 'var(--color-bg-elevated, #F2F4F6)', borderRadius: '0 0 12px 12px' }}>
            {/* {hexagram.judgmentOriginal && (
              <button style={toggleBtnStyle} onClick={() => toggle('judg')}>
                {open.judg ? '원문 접기 ▲' : '원문 보기 ▼'}
              </button>
            )}
            {renderOriginal(hexagram.judgmentOriginal, hexagram.judgmentReading, open.judg)} */}
            <p style={textStyle}>{hexagram.judgment}</p>
          </div>
        </div>
      </div>

      {/* 상전 — 아코디언 (기본 접힘) */}
      <div>
        <button
          style={accordionHeaderStyle(imgOpen)}
          onClick={() => setImgOpen(o => !o)}
          aria-expanded={imgOpen}
        >
          <span style={blockTitleStyle}>
            상전 <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>· 삶의 지혜</span>
          </span>
          <span style={accordionArrowStyle(imgOpen)}>▼</span>
        </button>
        <div style={accordionBodyStyle(imgOpen)}>
          <div style={{ padding: '0 16px 16px', backgroundColor: 'var(--color-bg-elevated, #F2F4F6)', borderRadius: '0 0 12px 12px' }}>
            {/* {hexagram.imageOriginal && (
              <button style={toggleBtnStyle} onClick={() => toggle('img')}>
                {open.img ? '원문 접기 ▲' : '원문 보기 ▼'}
              </button>
            )}
            {renderOriginal(hexagram.imageOriginal, hexagram.imageReading, open.img)} */}
            <p style={textStyle}>{hexagram.image}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
