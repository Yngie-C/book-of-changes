import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null; componentStack: string | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100dvh', padding: '24px',
          gap: '16px', textAlign: 'center'
        }}>
          <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            오류가 발생했어요
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
            앱을 다시 실행해 주세요
          </p>
          {/* 디버깅용: 실제 에러 메시지 표시 */}
          <div style={{
            fontSize: '12px', color: '#E5503C', textAlign: 'left',
            backgroundColor: '#FFF5F5', padding: '12px', borderRadius: '8px',
            maxWidth: '100%', overflow: 'auto', wordBreak: 'break-word',
            fontFamily: 'monospace', whiteSpace: 'pre-wrap',
          }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Error:</div>
            <div>{this.state.error?.name}: {this.state.error?.message}</div>
            {this.state.error?.stack && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                {this.state.error.stack.slice(0, 500)}
              </div>
            )}
            {this.state.componentStack && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                {this.state.componentStack.slice(0, 500)}
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px', borderRadius: '12px',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer'
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
