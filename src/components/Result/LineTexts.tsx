import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Hexagram, HexagramLine } from '@/data/types';

type LineTextsProps = {
  hexagram: Hexagram;
  highlightedLines?: number[];
};

const POSITION_NAMES: Record<number, string> = {
  1: '초효(初爻)',
  2: '이효(二爻)',
  3: '삼효(三爻)',
  4: '사효(四爻)',
  5: '오효(五爻)',
  6: '상효(上爻)',
};

function LineItem({
  line,
  isHighlighted,
}: {
  line: HexagramLine;
  isHighlighted: boolean;
}) {
  const [open, setOpen] = useState(isHighlighted);

  const itemStyle: CSSProperties = {
    borderRadius: '12px',
    border: isHighlighted ? '1.5px solid var(--color-changing)' : '1px solid var(--color-border)',
    overflow: 'hidden',
    backgroundColor: isHighlighted ? 'var(--color-changing-bg)' : 'var(--color-bg)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  };

  const posNameStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: isHighlighted ? '#D46B08' : 'var(--color-text-primary)',
  };

  const arrowStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-text-tertiary)',
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 200ms ease',
  };

  const bodyStyle: CSSProperties = {
    padding: open ? '0 16px 14px' : '0 16px',
    maxHeight: open ? '400px' : '0',
    overflow: 'hidden',
    transition: 'max-height 300ms ease, padding 300ms ease',
  };

  const textStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    lineHeight: 1.6,
    marginBottom: '8px',
    fontWeight: 500,
  };

  const interpStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.7,
  };

  return (
    <div style={itemStyle}>
      <button style={headerStyle} onClick={() => setOpen(o => !o)}>
        <span style={posNameStyle}>{POSITION_NAMES[line.position]}</span>
        <span style={arrowStyle}>▼</span>
      </button>
      <div style={bodyStyle}>
        <p style={textStyle}>{line.text}</p>
        <p style={interpStyle}>{line.interpretation}</p>
      </div>
    </div>
  );
}

export default function LineTexts({ hexagram, highlightedLines = [] }: LineTextsProps) {
  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '0 20px',
  };

  return (
    <div style={wrapStyle}>
      {hexagram.lines.map(line => (
        <LineItem
          key={line.position}
          line={line}
          isHighlighted={highlightedLines.includes(line.position)}
        />
      ))}
    </div>
  );
}
