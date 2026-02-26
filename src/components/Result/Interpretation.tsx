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

  const originalTextStyle = (isOpen: boolean): CSSProperties => ({
    fontFamily: "'Nanum Myeongjo', 'Batang', 'Georgia', serif",
    fontSize: '16px',
    color: 'var(--color-text-primary)',
    backgroundColor: '#FFFBF0',
    borderLeft: '3px solid #D4A853',
    padding: isOpen ? '12px 14px' : '0 14px',
    borderRadius: '8px',
    lineHeight: 1.9,
    marginBottom: isOpen ? '10px' : 0,
    overflow: 'hidden',
    maxHeight: isOpen ? '300px' : '0',
    transition: 'max-height 300ms ease, padding 300ms ease, margin-bottom 300ms ease',
    boxSizing: 'border-box',
  });

  const textStyle: CSSProperties = {
    fontSize: '15px',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
  };

  const toggle = (key: keyof ToggleState) =>
    setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={wrapStyle}>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>괘사</div>
        {hexagram.descriptionOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('desc')}>
            {open.desc ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {hexagram.descriptionOriginal && (
          <div style={originalTextStyle(open.desc)}>
            {hexagram.descriptionOriginal}
          </div>
        )}
        <p style={textStyle}>{hexagram.description}</p>
      </div>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>단전</div>
        {hexagram.judgmentOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('judg')}>
            {open.judg ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {hexagram.judgmentOriginal && (
          <div style={originalTextStyle(open.judg)}>
            {hexagram.judgmentOriginal}
          </div>
        )}
        <p style={textStyle}>{hexagram.judgment}</p>
      </div>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>상전</div>
        {hexagram.imageOriginal && (
          <button style={toggleBtnStyle} onClick={() => toggle('img')}>
            {open.img ? '원문 접기 ▲' : '원문 보기 ▼'}
          </button>
        )}
        {hexagram.imageOriginal && (
          <div style={originalTextStyle(open.img)}>
            {hexagram.imageOriginal}
          </div>
        )}
        <p style={textStyle}>{hexagram.image}</p>
      </div>
    </div>
  );
}
