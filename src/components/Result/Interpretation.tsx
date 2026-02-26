import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Hexagram } from '@/data/types';

type InterpretationProps = {
  hexagram: Hexagram;
};

type ToggleState = { desc: boolean; judg: boolean; img: boolean };

export default function Interpretation({ hexagram }: InterpretationProps) {
  const [open, setOpen] = useState<ToggleState>({ desc: false, judg: false, img: false });

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '0 20px',
  };

  const blockStyle: CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-secondary)',
  };

  const blockTitleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const toggleBtnStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    marginBottom: '8px',
    display: 'block',
  };

  const originalWrapStyle = (isOpen: boolean): CSSProperties => ({
    backgroundColor: '#FFFBF0',
    borderLeft: '3px solid #D4A853',
    padding: isOpen ? '12px 14px' : '0 14px',
    borderRadius: '8px',
    marginBottom: isOpen ? '10px' : 0,
    overflow: 'hidden',
    maxHeight: isOpen ? '600px' : '0',
    transition: 'max-height 300ms ease, padding 300ms ease, margin-bottom 300ms ease',
    boxSizing: 'border-box',
  });

  const originalTextStyle: CSSProperties = {
    fontFamily: "'Noto Serif TC', 'Nanum Myeongjo', 'Batang', serif",
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    lineHeight: 1.9,
    marginBottom: 0,
  };

  const readingStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.7,
    marginTop: '6px',
  };

  const textStyle: CSSProperties = {
    fontSize: '15px',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
  };

  const toggle = (key: keyof ToggleState) =>
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const renderOriginal = (
    original: string | undefined,
    reading: string | undefined,
    isOpen: boolean,
  ) => {
    if (!original) return null;
    return (
      <div style={originalWrapStyle(isOpen)}>
        <p style={originalTextStyle}>{original}</p>
        {reading && <p style={readingStyle}>{reading}</p>}
      </div>
    );
  };

  return (
    <div style={wrapStyle}>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>괘사</div>
        {hexagram.descriptionOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('desc')}>
            {open.desc ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {renderOriginal(hexagram.descriptionOriginal, hexagram.descriptionReading, open.desc)}
        <p style={textStyle}>{hexagram.description}</p>
      </div>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>단전</div>
        {hexagram.judgmentOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('judg')}>
            {open.judg ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {renderOriginal(hexagram.judgmentOriginal, hexagram.judgmentReading, open.judg)}
        <p style={textStyle}>{hexagram.judgment}</p>
      </div>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>상전</div>
        {hexagram.imageOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('img')}>
            {open.img ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {renderOriginal(hexagram.imageOriginal, hexagram.imageReading, open.img)}
        <p style={textStyle}>{hexagram.image}</p>
      </div>
    </div>
  );
}
