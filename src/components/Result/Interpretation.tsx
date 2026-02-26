import type { CSSProperties } from 'react';
import type { Hexagram } from '@/data/types';

type InterpretationProps = {
  hexagram: Hexagram;
};

export default function Interpretation({ hexagram }: InterpretationProps) {
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
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const textStyle: CSSProperties = {
    fontSize: '15px',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
  };

  return (
    <div style={wrapStyle}>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>괘사</div>
        <p style={textStyle}>{hexagram.description}</p>
      </div>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>단전</div>
        <p style={textStyle}>{hexagram.judgment}</p>
      </div>
      <div style={blockStyle}>
        <div style={blockTitleStyle}>상전</div>
        <p style={textStyle}>{hexagram.image}</p>
      </div>
    </div>
  );
}
