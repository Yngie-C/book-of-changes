import type { CSSProperties } from 'react';

type ProgressBarProps = {
  current: number;
  total?: number;
};

export default function ProgressBar({ current, total = 6 }: ProgressBarProps) {
  const percent = Math.min((current / total) * 100, 100);

  const wrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const trackStyle: CSSProperties = {
    width: '60px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-border)',
    overflow: 'hidden',
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${percent}%`,
    borderRadius: '2px',
    backgroundColor: 'var(--color-primary)',
    transition: 'width 300ms ease',
  };

  const labelStyle: CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={wrapStyle}>
      <div
        style={trackStyle}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="점 진행 상태"
      >
        <div style={fillStyle} />
      </div>
      <span style={labelStyle}>
        {current}/{total}
      </span>
    </div>
  );
}
