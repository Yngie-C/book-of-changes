import type { CSSProperties } from 'react';
import type { LineResult } from '@/data/types';

function getLineTypeLabel(line: LineResult): { symbol: string; label: string; color: string } {
  switch (line.value) {
    case 6: return { symbol: '⚋', label: '노음', color: '#FA8C16' };
    case 7: return { symbol: '⚊', label: '소양', color: '#D4380D' };
    case 8: return { symbol: '⚋', label: '소음', color: '#0958D9' };
    case 9: return { symbol: '⚊', label: '노양', color: '#FA8C16' };
    default: return { symbol: '', label: '', color: '#000000' };
  }
}

type HexagramStackProps = {
  lines: LineResult[];
  currentStep?: number;
  showChanging?: boolean;
  size?: 'small' | 'medium' | 'large';
};

const POSITION_NAMES = ['초효', '2효', '3효', '4효', '5효', '상효'];

export default function HexagramStack({
  lines,
  currentStep,
  showChanging = false,
  size = 'medium',
}: HexagramStackProps) {
  const lineHeight = size === 'small' ? 10 : size === 'medium' ? 14 : 18;
  const lineGap = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
  const gapWidth = size === 'small' ? 8 : size === 'medium' ? 12 : 16;
  const totalLines = 6;

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: `${lineGap}px`,
    alignItems: 'center',
    padding: '16px',
  };

  // Render all 6 slots; filled slots show actual line, empty slots show placeholder
  const slots = Array.from({ length: totalLines }, (_, i) => i);

  return (
    <div style={wrapStyle}>
      {slots.map(i => {
        const line = lines[i];
        const isActive = currentStep === i;
        const isEmpty = !line;

        return (
          <LineRow
            key={i}
            line={line}
            isEmpty={isEmpty}
            isActive={isActive}
            positionName={POSITION_NAMES[i]}
            lineHeight={lineHeight}
            gapWidth={gapWidth}
            showChanging={showChanging}
          />
        );
      })}
    </div>
  );
}

type LineRowProps = {
  line?: LineResult;
  isEmpty: boolean;
  isActive: boolean;
  positionName: string;
  lineHeight: number;
  gapWidth: number;
  showChanging: boolean;
};

function LineRow({ line, isEmpty, positionName, lineHeight, gapWidth, showChanging }: LineRowProps) {
  const isYin = !isEmpty && line?.type === 'yin';
  const isChanging = line?.changing ?? false;
  const typeInfo = !isEmpty && line ? getLineTypeLabel(line) : null;
  const lineColor = isEmpty ? '#E5E8EB' : typeInfo?.color ?? '#191F28';
  const half = lineHeight / 2;

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    maxWidth: '240px',
  };

  const labelStyle: CSSProperties = {
    fontSize: '11px',
    color: 'var(--color-text-tertiary)',
    width: '28px',
    textAlign: 'right',
    flexShrink: 0,
  };

  // gap: 양효/빈칸=0 (하나로 보임), 음효=gapWidth (두 토막)
  const lineWrap: CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: `${isYin ? gapWidth : 0}px`,
    opacity: isEmpty ? 0.2 : 1,
    transition: 'opacity 300ms ease, gap 300ms ease',
  };

  // 좌측 막대: 양효=왼쪽만 둥글게, 음효=전체 둥글게
  // scaleX 제거 — opacity+color transition만으로 상태 구분 (WebView 안정성)
  const leftBar: CSSProperties = {
    flex: 1,
    height: `${lineHeight}px`,
    backgroundColor: lineColor,
    borderRadius: isYin ? `${half}px` : `${half}px 0 0 ${half}px`,
    transition: 'background-color 300ms ease, border-radius 300ms ease',
  };

  // 우측 막대: 양효=오른쪽만 둥글게, 음효=전체 둥글게
  const rightBar: CSSProperties = {
    flex: 1,
    height: `${lineHeight}px`,
    backgroundColor: lineColor,
    borderRadius: isYin ? `${half}px` : `0 ${half}px ${half}px 0`,
    transition: 'background-color 300ms ease, border-radius 300ms ease',
  };

  const changingDot: CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#FA8C16',
    flexShrink: 0,
    marginLeft: '4px',
  };

  const typeBadgeStyle: CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    color: typeInfo?.color,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: '24px',
    textAlign: 'left',
  };

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{positionName}</span>
      <div style={lineWrap}>
        <div style={leftBar} />
        <div style={rightBar} />
        {showChanging && isChanging && <div style={changingDot} />}
      </div>
      {typeInfo && <span style={typeBadgeStyle}>{typeInfo.label}</span>}
    </div>
  );
}
