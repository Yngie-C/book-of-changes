import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ConfirmDialog from '@/components/common/ConfirmDialog';

// ─── 기본 렌더링 ───────────────────────────────────────────────────────────

describe('basic rendering', () => {
  it('open=true일 때 다이얼로그가 화면에 표시된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="이 기록을 정말 삭제하시겠습니까?"
      />,
    );

    // role="dialog"로 다이얼로그 존재 확인
    expect(screen.getByRole('dialog')).toBeTruthy();
    // aria-modal 속성 확인
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });

  it('open=false일 때 다이얼로그가 렌더링되지 않는다', () => {
    render(
      <ConfirmDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="이 기록을 정말 삭제하시겠습니까?"
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// ─── 확인 메시지 표시 ─────────────────────────────────────────────────────

describe('confirm message rendering', () => {
  it('title이 확인 다이얼로그에 표시된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="이 기록을 정말 삭제하시겠습니까?"
      />,
    );

    expect(screen.getByText('기록 삭제')).toBeTruthy();
  });

  it('message가 확인 다이얼로그에 표시된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="이 기록을 정말 삭제하시겠습니까?"
      />,
    );

    expect(
      screen.getByText('이 기록을 정말 삭제하시겠습니까?'),
    ).toBeTruthy();
  });

  it('title이 id="confirm-dialog-title"로 설정되어 aria-labelledby와 연결된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="메시지"
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    const titleEl = screen.getByText('기록 삭제');
    expect(titleEl.id).toBe('confirm-dialog-title');
  });

  it('message가 id="confirm-dialog-message"로 설정되어 aria-describedby와 연결된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="제목"
        message="메시지 내용"
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBe(
      'confirm-dialog-message',
    );
    const msgEl = screen.getByText('메시지 내용');
    expect(msgEl.id).toBe('confirm-dialog-message');
  });
});

// ─── 확인/취소 버튼 ───────────────────────────────────────────────────────

describe('confirm and cancel buttons', () => {
  it('확인(confirm) 버튼이 표시된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    const confirmBtn = screen.getByTestId('confirm-dialog-confirm');
    expect(confirmBtn).toBeTruthy();
  });

  it('취소(cancel) 버튼이 표시된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    const cancelBtn = screen.getByTestId('confirm-dialog-cancel');
    expect(cancelBtn).toBeTruthy();
  });

  it('기본 confirmLabel은 "삭제"이다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    const confirmBtn = screen.getByTestId('confirm-dialog-confirm');
    expect(confirmBtn.textContent).toBe('삭제');
  });

  it('기본 cancelLabel은 "취소"이다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    const cancelBtn = screen.getByTestId('confirm-dialog-cancel');
    expect(cancelBtn.textContent).toBe('취소');
  });

  it('confirmLabel과 cancelLabel을 커스텀 설정할 수 있다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="초기화 확인"
        message="모든 기록을 초기화할까요?"
        confirmLabel="초기화"
        cancelLabel="아니오"
      />,
    );

    expect(screen.getByTestId('confirm-dialog-confirm').textContent).toBe(
      '초기화',
    );
    expect(screen.getByTestId('confirm-dialog-cancel').textContent).toBe(
      '아니오',
    );
  });
});

// ─── 버튼 상호작용 ────────────────────────────────────────────────────────

describe('button interactions', () => {
  it('확인 버튼 클릭 시 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('확인 버튼 클릭 시 onConfirm이 호출되고 다이얼로그가 닫힌다 (제어형 컴포넌트 통합)', () => {
    const onConfirmAction = vi.fn();

    // 제어형 래퍼: 부모가 open=false로 전환하는 현실 UX 재현
    function TestWrapper() {
      const [open, setOpen] = React.useState(true);
      const handleConfirm = () => {
        onConfirmAction();
        setOpen(false); // 부모가 다이얼로그 닫음
      };
      return (
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
          title="기록 삭제"
          message="정말 삭제하시겠습니까?"
        />
      );
    }

    render(<TestWrapper />);

    // 다이얼로그가 열려 있음
    expect(screen.getByRole('dialog')).toBeTruthy();

    // 확인 버튼 클릭
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    // onConfirm 콜백이 정확히 1회 호출됨
    expect(onConfirmAction).toHaveBeenCalledTimes(1);

    // 다이얼로그가 DOM에서 제거됨 (닫힘)
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('취소 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('취소 버튼 클릭 시 onClose가 호출되고 다이얼로그가 닫힌다 (제어형 컴포넌트 통합)', () => {
    const onCloseAction = vi.fn();

    // 제어형 래퍼: 부모가 open=false로 전환하는 현실 UX 재현
    function TestWrapper() {
      const [open, setOpen] = React.useState(true);
      const handleClose = () => {
        onCloseAction();
        setOpen(false); // 부모가 다이얼로그 닫음
      };
      return (
        <ConfirmDialog
          open={open}
          onClose={handleClose}
          onConfirm={vi.fn()}
          title="기록 삭제"
          message="정말 삭제하시겠습니까?"
        />
      );
    }

    render(<TestWrapper />);

    // 다이얼로그가 열려 있음
    expect(screen.getByRole('dialog')).toBeTruthy();

    // 취소 버튼 클릭
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));

    // onClose 콜백이 정확히 1회 호출됨
    expect(onCloseAction).toHaveBeenCalledTimes(1);

    // 다이얼로그가 DOM에서 제거됨 (닫힘)
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('백드롭 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    // 백드롭은 role="presentation"인 외부 div
    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape 키 누르면 onClose가 호출된다', () => {
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('다이얼로그 내부 클릭으로는 onClose가 호출되지 않는다', () => {
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    // 다이얼로그 패널(role="dialog") 클릭
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('패널 내 텍스트 클릭으로도 onClose가 호출되지 않는다', () => {
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    fireEvent.click(screen.getByText('기록 삭제'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── 포커스 관리 ──────────────────────────────────────────────────────────

describe('focus management', () => {
  it('open=true일 때 취소 버튼에 초기 포커스가 설정된다 (파괴적 동작 실수 방지)', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="정말 삭제하시겠습니까?"
      />,
    );

    const cancelBtn = screen.getByTestId('confirm-dialog-cancel');
    expect(document.activeElement).toBe(cancelBtn);
  });
});

// ─── 포털 렌더링 ──────────────────────────────────────────────────────────

describe('portal rendering', () => {
  it('다이얼로그가 document.body에 포털로 렌더링된다', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="기록 삭제"
        message="메시지"
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });
});
