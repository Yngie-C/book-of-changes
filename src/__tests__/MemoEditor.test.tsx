import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MemoEditor from '@/components/History/MemoEditor';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_MEMO_LENGTH = 500;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTextarea(): HTMLTextAreaElement {
  return screen.getByLabelText('메모 입력') as HTMLTextAreaElement;
}

function getSaveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: '저장' }) as HTMLButtonElement;
}

function typeIntoMemo(value: string) {
  fireEvent.change(getTextarea(), { target: { value } });
}

// ─── Basic rendering ────────────────────────────────────────────────────────

describe('basic rendering', () => {
  it('renders a textarea', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(getTextarea()).toBeTruthy();
  });

  it('renders a save button', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(getSaveButton()).toBeTruthy();
  });

  it('renders with default placeholder', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(getTextarea().getAttribute('placeholder')).toBe('기록에 메모를 남겨보세요');
  });

  it('renders with custom placeholder', () => {
    render(
      <MemoEditor
        initialMemo=""
        onSave={vi.fn()}
        placeholder="생각을 기록하세요"
      />,
    );
    expect(getTextarea().getAttribute('placeholder')).toBe('생각을 기록하세요');
  });

  it('renders with custom save label', () => {
    render(
      <MemoEditor
        initialMemo=""
        onSave={vi.fn()}
        saveLabel="수정하기"
      />,
    );
    expect(screen.getByRole('button', { name: '수정하기' })).toBeTruthy();
  });

  it('renders with a form role and accessible label', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(screen.getByRole('form', { name: '자유 메모 편집' })).toBeTruthy();
  });
});

// ─── Initial memo ───────────────────────────────────────────────────────────

describe('initial memo', () => {
  it('loads existing memo text into the textarea', () => {
    render(<MemoEditor initialMemo="기존 메모 내용" onSave={vi.fn()} />);
    expect(getTextarea().value).toBe('기존 메모 내용');
  });

  it('shows empty textarea when initialMemo is null', () => {
    render(<MemoEditor initialMemo={null} onSave={vi.fn()} />);
    expect(getTextarea().value).toBe('');
  });

  it('shows empty textarea when initialMemo is undefined', () => {
    render(<MemoEditor initialMemo={undefined} onSave={vi.fn()} />);
    expect(getTextarea().value).toBe('');
  });

  it('shows empty textarea when initialMemo is empty string', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(getTextarea().value).toBe('');
  });
});

// ─── Character counter ──────────────────────────────────────────────────────

describe('character counter', () => {
  it('renders character counter', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(screen.getByText(`0/${MAX_MEMO_LENGTH}`)).toBeTruthy();
  });

  it('updates character count on typing', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    typeIntoMemo('안녕하세요');
    expect(screen.getByText(`5/${MAX_MEMO_LENGTH}`)).toBeTruthy();
  });

  it('shows counter in red when exceeding max length', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    const longText = '가'.repeat(MAX_MEMO_LENGTH + 1);
    fireEvent.change(getTextarea(), { target: { value: longText } });

    const counter = screen.getByText(`${longText.length}/${MAX_MEMO_LENGTH}`);
    expect(counter.style.color).toBe('rgb(229, 62, 62)');
  });
});

// ─── Text input ─────────────────────────────────────────────────────────────

describe('text input', () => {
  it('allows typing into the textarea', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    typeIntoMemo('새로운 메모');
    expect(getTextarea().value).toBe('새로운 메모');
  });

  it('does not exceed maxLength', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    const longText = '가'.repeat(MAX_MEMO_LENGTH);
    fireEvent.change(getTextarea(), { target: { value: longText } });
    expect(getTextarea().value.length).toBeLessThanOrEqual(MAX_MEMO_LENGTH);
  });
});

// ─── Save button state ──────────────────────────────────────────────────────

describe('save button state', () => {
  it('is disabled when no changes and initial memo is empty', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(getSaveButton().disabled).toBe(true);
  });

  it('is disabled when memo matches initialMemo', () => {
    render(<MemoEditor initialMemo="기존 메모" onSave={vi.fn()} />);
    expect(getSaveButton().disabled).toBe(true);
  });

  it('is enabled when memo differs from initialMemo', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    typeIntoMemo('a');
    expect(getSaveButton().disabled).toBe(false);
  });

  it('is enabled when whitespace diff from empty initialMemo', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    fireEvent.change(getTextarea(), { target: { value: '   ' } });
    expect(getSaveButton().disabled).toBe(false);
  });

  it('is disabled when memo exceeds max length', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    const longText = '가'.repeat(MAX_MEMO_LENGTH + 10);
    fireEvent.change(getTextarea(), { target: { value: longText } });
    expect(getSaveButton().disabled).toBe(true);
  });
});

// ─── Save callback ──────────────────────────────────────────────────────────

describe('save callback', () => {
  it('calls onSave with the memo text when save button is clicked', () => {
    const onSave = vi.fn();
    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('중요한 메모입니다');
    fireEvent.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('중요한 메모입니다');
  });

  it('handles synchronous onSave (no Promise)', () => {
    const onSave = vi.fn();
    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('동기 저장');
    fireEvent.click(getSaveButton());
    expect(onSave).toHaveBeenCalledWith('동기 저장');
  });

  it('shows saving state during async save', async () => {
    let resolveSave!: () => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('비동기 메모');
    fireEvent.click(getSaveButton());

    const btn = getSaveButton();
    expect(btn.disabled).toBe(true);
    expect(getTextarea().disabled).toBe(true);

    await act(async () => {
      resolveSave();
    });

    await waitFor(() => {
      expect(btn.disabled).toBe(false);
    });
  });

  it('shows "저장 완료" after successful save', async () => {
    let resolveSave!: () => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('저장할 메모');
    fireEvent.click(getSaveButton());

    await act(async () => {
      resolveSave();
    });

    await waitFor(() => {
      expect(screen.getByText('✓ 저장 완료')).toBeTruthy();
    });
  });

  it('resets to idle after 2 seconds of showing saved', async () => {
    const onSave = vi.fn();
    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('타임아웃 메모');
    fireEvent.click(getSaveButton());

    expect(screen.getByText('✓ 저장 완료')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.queryByText('✓ 저장 완료')).toBeNull();
    });
  });
});

// ─── Error handling ─────────────────────────────────────────────────────────

describe('error handling', () => {
  it('shows error message when onSave throws synchronously', async () => {
    const onSave = vi.fn().mockImplementation(() => {
      throw new Error('저장 실패!');
    });

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('실패할 메모');
    fireEvent.click(getSaveButton());

    await waitFor(() => {
      expect(screen.getByText('저장 실패!')).toBeTruthy();
    });
  });

  it('shows error message when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('네트워크 오류'));

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('실패할 메모');
    fireEvent.click(getSaveButton());

    await waitFor(() => {
      expect(screen.getByText('네트워크 오류')).toBeTruthy();
    });
  });

  it('shows fallback error message for non-Error rejection', async () => {
    const onSave = vi.fn().mockRejectedValue('unknown');

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('실패할 메모');
    fireEvent.click(getSaveButton());

    await waitFor(() => {
      expect(
        screen.getByText('메모 저장에 실패했습니다. 다시 시도해 주세요.'),
      ).toBeTruthy();
    });
  });

  it('clears error on re-typing after error', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('에러'))
      .mockResolvedValue(undefined);

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('실패');
    fireEvent.click(getSaveButton());

    await waitFor(() => {
      expect(screen.getByText('에러')).toBeTruthy();
    });

    // Re-type — error should clear
    typeIntoMemo('실패 다시 시도');
    expect(screen.queryByText('에러')).toBeNull();
    expect(getSaveButton().disabled).toBe(false);
  });

  it('clears saved status on re-typing after save', () => {
    const onSave = vi.fn();
    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('첫 메모');
    fireEvent.click(getSaveButton());

    expect(screen.getByText('✓ 저장 완료')).toBeTruthy();

    // Re-type — saved status should clear
    typeIntoMemo('첫 메모 추가');
    expect(screen.queryByText('✓ 저장 완료')).toBeNull();
  });
});

// ─── Disabled state ─────────────────────────────────────────────────────────

describe('disabled state', () => {
  it('disables textarea when disabled prop is true', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} disabled={true} />);
    expect(getTextarea().disabled).toBe(true);
  });

  it('disables save button when disabled prop is true', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} disabled={true} />);
    expect(getSaveButton().disabled).toBe(true);
  });

  it('does not call onSave when disabled', () => {
    const onSave = vi.fn();
    render(<MemoEditor initialMemo="" onSave={onSave} disabled={true} />);
    fireEvent.change(getTextarea(), { target: { value: '무시될 메모' } });
    fireEvent.click(getSaveButton());
    expect(onSave).not.toHaveBeenCalled();
  });
});

// ─── Status transitions ─────────────────────────────────────────────────────

describe('status transitions', () => {
  it('shows "수정된 내용이 있습니다" when there are unsaved changes', () => {
    render(<MemoEditor initialMemo="원본" onSave={vi.fn()} />);
    typeIntoMemo('원본 수정');
    expect(screen.getByText('수정된 내용이 있습니다')).toBeTruthy();
  });

  it('does not show status text when no changes', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    expect(screen.queryByText('수정된 내용이 있습니다')).toBeNull();
  });

  it('does not call onSave twice on double-click during async save', async () => {
    let resolveSave!: () => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('중복 클릭 방지');
    fireEvent.click(getSaveButton());

    // After first click, button is disabled (saving in progress)
    expect(getSaveButton().disabled).toBe(true);

    // Second click should be ignored (button is disabled)
    fireEvent.click(getSaveButton());
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles very long initial memo', () => {
    const longMemo = '가'.repeat(MAX_MEMO_LENGTH);
    render(<MemoEditor initialMemo={longMemo} onSave={vi.fn()} />);
    expect(getTextarea().value).toBe(longMemo);
  });

  it('handles multiline memo text', () => {
    const multiline = '첫째 줄\n둘째 줄\n셋째 줄';
    render(<MemoEditor initialMemo={multiline} onSave={vi.fn()} />);
    expect(getTextarea().value).toBe(multiline);
  });

  it('handles Korean characters correctly', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    typeIntoMemo('오늘 점괘는 매우 좋았다. 앞으로도 좋은 일만 있기를!');
    expect(getTextarea().value).toBe(
      '오늘 점괘는 매우 좋았다. 앞으로도 좋은 일만 있기를!',
    );
  });

  it('handles emoji in memo', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    typeIntoMemo('좋은 운세 😊✨');
    expect(getTextarea().value).toBe('좋은 운세 😊✨');
  });

  it('has correct aria-describedby linking textarea to counter', () => {
    render(<MemoEditor initialMemo="" onSave={vi.fn()} />);
    const textarea = getTextarea();
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBe('memo-char-counter');
    expect(document.getElementById('memo-char-counter')).toBeTruthy();
  });

  it('save button shows "저장 중..." during save', async () => {
    let resolveSave!: () => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(<MemoEditor initialMemo="" onSave={onSave} />);
    typeIntoMemo('로딩 테스트');
    fireEvent.click(getSaveButton());

    // Button text changes to "저장 중..." and is disabled
    expect(screen.getByRole('button', { name: '저장' }).textContent).toBe('저장 중...');
    expect(getSaveButton().disabled).toBe(true);

    await act(async () => {
      resolveSave();
    });
  });
});
