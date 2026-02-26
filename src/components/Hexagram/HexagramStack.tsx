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
  const fill = isEmpty ? '#E5E8EB' : typeInfo?.color ?? '#191F28';
  const fillOpacity = isEmpty ? 0.2 : 1;
  const r = lineHeight / 2;
  const svgWidth = 160;
  const segWidth = (svgWidth - gapWidth) / 2;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      width: '100%', maxWidth: '240px',
    }}>
      <span style={{
        fontSize: '11px', color: 'var(--color-text-tertiary)',
        width: '28px', textAlign: 'right', flexShrink: 0,
      }}>
        {positionName}
      </span>
      <svg
        width={svgWidth}
        height={lineHeight}
        viewBox={`0 0 ${svgWidth} ${lineHeight}`}
        style={{ flexShrink: 0 }}
      >
        {isYin ? (
          <>
            <rect x={0} y={0} width={segWidth} height={lineHeight}
              rx={r} ry={r} fill={fill} opacity={fillOpacity} />
            <rect x={segWidth + gapWidth} y={0} width={segWidth} height={lineHeight}
              rx={r} ry={r} fill={fill} opacity={fillOpacity} />
          </>
        ) : (
          <rect x={0} y={0} width={svgWidth} height={lineHeight}
            rx={r} ry={r} fill={fill} opacity={fillOpacity} />
        )}
      </svg>
      {showChanging && isChanging && (
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          backgroundColor: '#FA8C16', flexShrink: 0,
        }} />
      )}
      {typeInfo && (
        <span style={{
          fontSize: '10px', fontWeight: 600, color: typeInfo.color,
          whiteSpace: 'nowrap', flexShrink: 0, minWidth: '24px', textAlign: 'left',
        }}>
          {typeInfo.label}
        </span>
      )}
    </div>
  );
}
