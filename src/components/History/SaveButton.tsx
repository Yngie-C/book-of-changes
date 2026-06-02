import type { CSSProperties } from 'react';

export type SaveButtonStatus = 'idle' | 'loading' | 'success' | 'error';

type SaveButtonProps = {
  /** 현재 저장 상태 */
  saveStatus: SaveButtonStatus;

  /** 저장 버튼 클릭 핸들러 */
  onClick: () => void;

  /** 버튼 레이블 텍스트 (기본값: '저장') */
  saveLabel?: string;

  /**
   * 외부에서 버튼을 비활성화해야 할 때 true.
   * saveStatus 기반 disabled와 OR 연산된다.
   */
  disabled?: boolean;
};

/**
 * 점괘 기록 저장 액션의 presentational 버튼.
 *
 * saveStatus prop에 따라 레이블 텍스트와 disabled 속성이 결정된다:
 * - idle: "저장" (또는 saveLabel), 활성화
 * - loading: "저장 중...", 비활성화
 * - success: "✓ 저장 완료", 비활성화
 * - error: "저장" (또는 saveLabel), 활성화 (재시도 가능)
 */
export default function SaveButton({
  saveStatus,
  onClick,
  saveLabel = '저장',
  disabled = false,
}: SaveButtonProps) {
  const isDisabled = disabled || saveStatus === 'loading' || saveStatus === 'success';

  let label: string;
  if (saveStatus === 'loading') {
    label = '저장 중...';
  } else if (saveStatus === 'success') {
    label = '✓ 저장 완료';
  } else {
    label = saveLabel;
  }

  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '40px',
    padding: '0 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isDisabled ? '#E2E8F0' : '#6B5CE7',
    color: isDisabled ? '#A0AEC0' : '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 200ms ease',
    opacity: saveStatus === 'loading' ? 0.7 : 1,
  };

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-busy={saveStatus === 'loading'}
    >
      {label}
    </button>
  );
}
