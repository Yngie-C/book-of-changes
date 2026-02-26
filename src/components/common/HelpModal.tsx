import { useEffect } from 'react';
import type { CSSProperties } from 'react';

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function HelpModal({ open, onClose, title, children }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
    animation: 'fadeIn 200ms ease both',
  };

  const panelStyle: CSSProperties = {
    width: '100%',
    maxWidth: '360px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
    animation: 'scaleIn 250ms ease both',
    maxHeight: '80vh',
    overflowY: 'auto',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  };

  const closeBtnStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-tertiary)',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>{title}</span>
          <button style={closeBtnStyle} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Help Icon Button ─── */

type HelpIconProps = {
  onClick: () => void;
};

export function HelpIcon({ onClick }: HelpIconProps) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    minWidth: '14px',
    minHeight: '14px',
    maxWidth: '14px',
    maxHeight: '14px',
    boxSizing: 'border-box',
    borderRadius: '50%',
    border: '1px solid var(--color-text-tertiary)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-tertiary)',
    fontSize: '9px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    margin: '0 0 0 4px',
    lineHeight: 1,
    verticalAlign: 'middle',
    flexShrink: 0,
    WebkitAppearance: 'none',
    appearance: 'none',
    transition: 'border-color 150ms ease, color 150ms ease',
  };

  return (
    <button
      style={style}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="도움말"
    >
      ?
    </button>
  );
}
