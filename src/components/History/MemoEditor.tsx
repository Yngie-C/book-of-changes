import { useState } from 'react';
import type { CSSProperties } from 'react';

const MAX_MEMO_LENGTH = 100;

export type MemoEditorSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type MemoEditorProps = {
  /**
   * 초기 메모 텍스트.
   * null 또는 undefined인 경우 빈 메모로 시작한다.
   */
  initialMemo: string | null | undefined;

  /**
   * 메모 저장 콜백.
   * 새 메모 텍스트를 인자로 받는다. 비동기 저장을 지원하며,
   * Promise가 resolve되면 'saved' 상태로, reject되면 'error' 상태로 전환된다.
   */
  onSave: (memo: string) => void | Promise<void>;

  /**
   * 텍스트 영역 플레이스홀더. 기본값은 "기록에 메모를 남겨보세요".
   */
  placeholder?: string;

  /**
   * 저장 버튼 텍스트. 기본값은 "저장".
   */
  saveLabel?: string;

  /**
   * 컴포넌트가 비활성화 상태인지 여부.
   * true이면 입력과 저장이 모두 비활성화된다.
   */
  disabled?: boolean;
};

/**
 * 점괘 기록에 자유 메모를 작성/수정하는 컴포넌트.
 *
 * 상태:
 * - idle: 메모가 수정되지 않았거나, 초기 상태
 * - saving: 저장 중 (onSave가 Promise를 반환한 경우)
 * - saved: 저장 완료 (2초 후 idle로 복귀)
 * - error: 저장 실패
 *
 * @example
 * ```tsx
 * <MemoEditor
 *   initialMemo={record.freeMemo}
 *   onSave={async (memo) => {
 *     await updateRecord(record.id, { freeMemo: memo });
 *   }}
 * />
 * ```
 */
export default function MemoEditor({
  initialMemo,
  onSave,
  placeholder = '기록에 메모를 남겨보세요',
  saveLabel = '저장',
  disabled = false,
}: MemoEditorProps) {
  const [memo, setMemo] = useState(initialMemo ?? '');
  const [status, setStatus] = useState<MemoEditorSaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const hasChanges = memo !== (initialMemo ?? '');
  const isValid = hasChanges && memo.length <= MAX_MEMO_LENGTH;
  const isSaving = status === 'saving';

  const handleSave = async () => {
    if (!isValid || isSaving || disabled) return;

    setStatus('saving');
    setErrorMessage('');

    try {
      const result = onSave(memo);
      if (result instanceof Promise) {
        await result;
      }
      setStatus('saved');

      // 2초 후 idle로 복귀
      setTimeout(() => {
        setStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '메모 저장에 실패했습니다. 다시 시도해 주세요.',
      );
    }
  };

  // ─── Styles ──────────────────────────────────────────────────────────────

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const textareaWrapStyle: CSSProperties = {
    position: 'relative',
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    minHeight: '100px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-primary)',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 200ms ease',
  };

  const counterStyle: CSSProperties = {
    position: 'absolute',
    bottom: '10px',
    right: '12px',
    fontSize: '12px',
    color:
      memo.length > MAX_MEMO_LENGTH
        ? '#E53E3E'
        : 'var(--color-text-tertiary)',
  };

  const saveButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '40px',
    padding: '0 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isValid && !disabled && !isSaving ? '#6B5CE7' : '#E2E8F0',
    color: isValid && !disabled && !isSaving ? '#FFFFFF' : '#A0AEC0',
    fontSize: '14px',
    fontWeight: 600,
    cursor: (isValid && !disabled && !isSaving) ? 'pointer' : 'not-allowed',
    transition: 'all 200ms ease',
    opacity: isSaving ? 0.7 : 1,
  };

  const statusTextStyle: CSSProperties = {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  };

  const errorTextStyle: CSSProperties = {
    fontSize: '13px',
    color: '#E53E3E',
  };

  const savedTextStyle: CSSProperties = {
    fontSize: '13px',
    color: '#38A169',
    fontWeight: 500,
  };

  const actionRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div style={containerStyle} role="form" aria-label="자유 메모 편집">
      <div style={textareaWrapStyle}>
        <textarea
          style={textareaStyle}
          placeholder={placeholder}
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            // 사용자가 다시 타이핑 시작하면 saved/error 상태 초기화
            if (status === 'saved' || status === 'error') {
              setStatus('idle');
              setErrorMessage('');
            }
          }}
          maxLength={MAX_MEMO_LENGTH}
          aria-label="메모 입력"
          aria-describedby="memo-char-counter"
          disabled={disabled || isSaving}
        />
        <span id="memo-char-counter" style={counterStyle}>
          {memo.length}/{MAX_MEMO_LENGTH}
        </span>
      </div>

      <div style={actionRowStyle}>
        <button
          type="button"
          style={saveButtonStyle}
          onClick={handleSave}
          disabled={!isValid || disabled || isSaving}
          aria-label={saveLabel}
        >
          {isSaving ? '저장 중...' : saveLabel}
        </button>

        {status === 'saved' && (
          <span style={savedTextStyle} role="status" aria-live="polite">
            ✓ 저장 완료
          </span>
        )}

        {status === 'error' && (
          <span style={errorTextStyle} role="alert" aria-live="assertive">
            {errorMessage}
          </span>
        )}

        {status === 'idle' && hasChanges && (
          <span style={statusTextStyle} aria-live="polite">
            수정된 내용이 있습니다
          </span>
        )}
      </div>
    </div>
  );
}
