import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
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
            오류가 발생했습니다
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
            앱을 다시 실행해 주세요
          </p>
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
