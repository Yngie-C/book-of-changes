import type { CSSProperties } from 'react';
import { Button } from '@toss/tds-mobile';
import type { AiState } from '@/hooks/useAiInterpretation';

type AiInterpretationCardProps = {
  state: AiState;
  onRetry: () => void;
  onReset: () => void;
};

export default function AiInterpretationCard({ state, onRetry, onReset }: AiInterpretationCardProps) {
  if (state.status === 'idle') return null;

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '0 20px',
    animation: 'slideUp 300ms ease both',
  };

  // 로딩 스켈레톤
  if (state.status === 'processing') {
    const skeletonLine = (width: string, delay: string): CSSProperties => ({
      height: '14px',
      borderRadius: '7px',
      backgroundColor: 'var(--color-bg-secondary)',
      width,
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      animationDelay: delay,
    });

    return (
      <div style={wrapStyle} aria-live="polite" aria-busy="true">
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            marginBottom: '4px',
          }}>
            점괘를 분석하고 있어요...
          </div>
          <div style={skeletonLine('100%', '0ms')} />
          <div style={skeletonLine('92%', '100ms')} />
          <div style={skeletonLine('85%', '200ms')} />
          <div style={skeletonLine('60%', '300ms')} />
        </div>
      </div>
    );
  }

  // 에러
  if (state.status === 'error') {
    return (
      <div style={wrapStyle} aria-live="assertive">
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: '#FFF5F5',
          border: '1px solid #FED7D7',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#C53030',
            lineHeight: 1.6,
          }}>
            {state.message}
          </div>
          {state.canRetry && (
            <Button
              color="primary"
              variant="weak"
              size="medium"
              onClick={onRetry}
            >
              다시 시도
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 성공
  const { data } = state;

  const cardStyle: CSSProperties = {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  const interpretationStyle: CSSProperties = {
    fontSize: '15px',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  };

  const adviceBoxStyle: CSSProperties = {
    padding: '14px 16px',
    borderRadius: '10px',
    backgroundColor: '#6B5CE710',
    borderLeft: '3px solid #6B5CE7',
  };

  const adviceStyle: CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#6B5CE7',
    lineHeight: 1.6,
  };

  return (
    <div style={wrapStyle} aria-live="polite">
      <div style={cardStyle}>
        <div style={titleStyle}>AI 맞춤 해석</div>
        <p style={interpretationStyle}>{data.interpretation}</p>
      </div>

      <div style={adviceBoxStyle}>
        <div style={{ ...titleStyle, color: '#6B5CE7', marginBottom: '6px' }}>핵심 조언</div>
        <p style={adviceStyle}>{data.advice}</p>
      </div>

      <Button
        color="primary"
        variant="weak"
        size="medium"
        display="block"
        onClick={onReset}
      >
        다시 분석하기
      </Button>
    </div>
  );
}
