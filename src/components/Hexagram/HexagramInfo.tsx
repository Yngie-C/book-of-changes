import type { CSSProperties } from 'react';
import type { Hexagram } from '@/data/types';

type HexagramInfoProps = {
  hexagram: Hexagram;
};

export default function HexagramInfo({ hexagram }: HexagramInfoProps) {
  const wrapStyle: CSSProperties = {
    textAlign: 'center',
    padding: '8px 0',
  };

  const nameStyle: CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: '4px',
  };

  const chineseStyle: CSSProperties = {
    fontSize: '16px',
    color: 'var(--color-text-secondary)',
    marginBottom: '8px',
  };

  const trigramStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--color-text-tertiary)',
    marginBottom: '8px',
  };

  const keywordStyle: CSSProperties = {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '9999px',
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    fontSize: '13px',
    fontWeight: 600,
  };

  return (
    <div style={wrapStyle}>
      <div style={nameStyle}>
        제{hexagram.number}괘 {hexagram.name}
      </div>
      <div style={chineseStyle}>{hexagram.chinese}</div>
      <div style={trigramStyle}>
        상괘: {hexagram.upperTrigram} &nbsp;|&nbsp; 하괘: {hexagram.lowerTrigram}
      </div>
      <span style={keywordStyle}>{hexagram.keyword}</span>
    </div>
  );
}
