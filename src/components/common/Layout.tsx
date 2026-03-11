import type { ReactNode, CSSProperties } from 'react';
import { Button } from '@toss/tds-mobile';

type LayoutProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
  bottomCTA?: ReactNode;
  children: ReactNode;
};

export default function Layout({
  title,
  showBack = false,
  onBack,
  rightContent,
  bottomCTA,
  children,
}: LayoutProps) {
  const headerStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    padding: '0 16px',
    backgroundColor: 'var(--color-bg)',
    borderBottom: '1px solid var(--color-divider)',
  };

  const titleStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    pointerEvents: 'none',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: bottomCTA ? '80px' : '0',
  };

  const bottomStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: '480px',
    margin: '0 auto',
    padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))',
    backgroundColor: 'var(--color-bg)',
    borderTop: '1px solid var(--color-divider)',
    zIndex: 10,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header style={headerStyle}>
        {showBack ? (
          <Button
            color="light"
            variant="weak"
            size="small"
            onClick={onBack}
            aria-label="뒤로가기"
            style={{ minWidth: '40px', padding: 0 }}
          >
            ←
          </Button>
        ) : (
          <div style={{ width: '40px' }} />
        )}
        <span style={titleStyle}>{title}</span>
        <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
          {rightContent}
        </div>
      </header>

      <main style={mainStyle}>{children}</main>

      {bottomCTA && <div style={bottomStyle}>{bottomCTA}</div>}
    </div>
  );
}
