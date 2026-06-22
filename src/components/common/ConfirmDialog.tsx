import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  onConfirm,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 포커스 복원: 모달 열릴 때 이전 포커스 저장, 닫힐 때 복원
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Escape 닫기 + 포커스 트랩
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    // 취소 버튼에 초기 포커스 (의도적 — 파괴적 동작 실수 방지)
    const cancelBtn = panel.querySelector<HTMLButtonElement>(
      '[data-testid="confirm-dialog-cancel"]',
    );
    cancelBtn?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // ─── Styles ──────────────────────────────────────────────────────────────

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '24px',
    animation: 'fadeIn 200ms ease both',
  };

  const panelStyle: CSSProperties = {
    width: '100%',
    maxWidth: '320px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
    animation: 'scaleIn 250ms ease both',
  };

  const titleStyle: CSSProperties = {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: '8px',
  };

  const messageStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
    marginBottom: '20px',
    wordBreak: 'keep-all',
  };

  const buttonRowStyle: CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const cancelBtnStyle: CSSProperties = {
    flex: 1,
    height: '44px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'var(--color-bg-secondary, #F2F4F6)',
    color: 'var(--color-text-primary)',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  };

  const confirmBtnStyle: CSSProperties = {
    flex: 1,
    height: '44px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#E53E3E',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  };

  return createPortal(
    <div
      style={backdropStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        ref={panelRef}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div style={titleStyle} id="confirm-dialog-title">
          {title}
        </div>
        <div style={messageStyle} id="confirm-dialog-message">
          {message}
        </div>
        <div style={buttonRowStyle}>
          <button
            style={cancelBtnStyle}
            onClick={onClose}
            data-testid="confirm-dialog-cancel"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            style={confirmBtnStyle}
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm"
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
