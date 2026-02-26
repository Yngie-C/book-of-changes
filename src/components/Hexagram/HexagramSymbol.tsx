import type { CSSProperties } from 'react';
import type { Hexagram } from '@/data/types';

type HexagramSymbolProps = {
  hexagram: Hexagram;
  size?: 'small' | 'medium' | 'large';
};

export default function HexagramSymbol({ hexagram, size = 'large' }: HexagramSymbolProps) {
  const fontSize = size === 'small' ? '48px' : size === 'medium' ? '72px' : '96px';

  const style: CSSProperties = {
    fontSize,
    lineHeight: 1,
    textAlign: 'center',
    userSelect: 'none',
    animation: 'scaleIn 400ms ease both',
  };

  return <div style={style}>{hexagram.unicode}</div>;
}
