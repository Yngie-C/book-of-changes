import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { DivinationRecord } from '@/data/types';
import { useHistoryList } from '@/hooks/useHistoryList';
import HistoryDetail from '@/components/History/HistoryDetail';
import MemoEditor from '@/components/History/MemoEditor';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Layout from '@/components/common/Layout';
import { updateRecord, isPinned } from '@/lib/storage';
import { trackEvent } from '@/lib/toss';

type HistoryListPageProps = {
  onBack: () => void;
};

export default function HistoryListPage({ onBack }: HistoryListPageProps) {
  const { state, deleteRecord, refresh, togglePin, pinLimit } = useHistoryList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DivinationRecord | null>(null);
  const [memoEditing, setMemoEditing] = useState(false);
  const [pinLimitNotice, setPinLimitNotice] = useState(false);

  const selectedRecord =
    selectedId && state.status === 'ready'
      ? state.records.find((r) => r.id === selectedId) ?? null
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelect = (id: string) => {
    setSelectedId(id);
    trackEvent('history_detail_view', 'click');
  };

  const handleTogglePin = (id: string) => {
    const ok = togglePin(id);
    if (!ok) {
      setPinLimitNotice(true);
      setTimeout(() => setPinLimitNotice(false), 2500);
    }
    trackEvent('history_pin_toggle', 'click');
  };

  const handleBackToList = () => {
    setSelectedId(null);
    refresh();
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const ok = deleteRecord(deleteTarget.id);
    if (ok) {
      trackEvent('history_delete', 'click');
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
      }
    }
    setDeleteTarget(null);
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const listItemStyle: CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-divider, #E2E8F0)',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'background-color 150ms ease',
  };

  const hexagramNameStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  };

  const metaRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
  };

  const emptyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '16px',
    color: 'var(--color-text-tertiary)',
    fontSize: '15px',
    textAlign: 'center',
    padding: '40px 24px',
  };

  const emptyEmojiStyle: CSSProperties = {
    fontSize: '64px',
    lineHeight: 1,
  };

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 20px',
    marginBottom: '16px',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    letterSpacing: '0.06em',
    marginBottom: '12px',
  };

  const deleteBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#E53E3E',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 8px',
  };

  const pinBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
    opacity: 0.6,
    filter: 'grayscale(1)',
    transition: 'opacity 150ms ease',
  };

  const pinBtnActiveStyle: CSSProperties = {
    ...pinBtnStyle,
    opacity: 1,
    filter: 'none',
  };

  const editBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 8px',
  };

  const cancelEditBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-tertiary)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 8px',
  };

  const memoDisplayStyle: CSSProperties = {
    fontSize: 'var(--font-size-body1)',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
    minHeight: '40px',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-elevated, #F2F4F6)',
  };

  // ── Memo save handler ─────────────────────────────────────────────────────

  const handleMemoSave = async (recordId: string, memo: string) => {
    updateRecord(recordId, { freeMemo: memo });
    refresh();
  };

  // ── Detail View ───────────────────────────────────────────────────────────

  if (selectedRecord) {
    return (
      <Layout
        title={
          selectedRecord.mainHexagram.length > 12
            ? `${selectedRecord.mainHexagram.slice(0, 11)}…`
            : selectedRecord.mainHexagram
        }
        showBack
        onBack={handleBackToList}
      >
        <HistoryDetail
          record={selectedRecord}
          memoSlot={
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={sectionTitleStyle}>메모</span>
                {memoEditing ? (
                  <button
                    type="button"
                    style={cancelEditBtnStyle}
                    onClick={() => setMemoEditing(false)}
                    aria-label="수정 취소"
                  >
                    취소
                  </button>
                ) : (
                  <button
                    type="button"
                    style={editBtnStyle}
                    onClick={() => setMemoEditing(true)}
                    aria-label="메모 수정"
                  >
                    {selectedRecord.freeMemo ? '수정' : '작성'}
                  </button>
                )}
              </div>
              {memoEditing ? (
                <MemoEditor
                  initialMemo={selectedRecord.freeMemo}
                  onSave={async (memo) => {
                    await handleMemoSave(selectedRecord.id, memo);
                    setMemoEditing(false);
                  }}
                  placeholder="점괘에 대한 간단한 메모를 남겨보세요 (예 : 1/1 오늘의 운세)"
                />
              ) : (
                <div style={memoDisplayStyle}>
                  {selectedRecord.freeMemo || '아직 작성된 메모가 없어요.'}
                </div>
              )}
            </div>
          }
        />
      </Layout>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return (
      <Layout title="기록 보기" showBack onBack={onBack}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          기록을 불러오는 중...
        </div>
      </Layout>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (state.status === 'error') {
    return (
      <Layout title="기록 보기" showBack onBack={onBack}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#E53E3E' }}>
          {state.message}
        </div>
      </Layout>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────

  if (state.status === 'ready' && state.records.length === 0) {
    return (
      <Layout title="기록 보기" showBack onBack={onBack}>
        <div style={emptyStyle}>
          <div style={emptyEmojiStyle}>📭</div>
          <p>
            아직 저장된 점괘 기록이 없어요.
            <br />
            점을 본 후 결과 화면에서 &ldquo;이 예측 저장하기&rdquo;를 눌러보세요.
          </p>
        </div>
      </Layout>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  const records = state.status === 'ready' ? state.records : [];
  const pinnedRecords = records.filter((r) => isPinned(r));
  const unpinnedRecords = records.filter((r) => !isPinned(r));

  const renderListItem = (record: DivinationRecord) => (
    <div
      key={record.id}
      style={listItemStyle}
      onClick={() => handleSelect(record.id)}
      role="button"
      tabIndex={0}
      aria-label={`${record.mainHexagram} 기록 보기`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(record.id);
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={hexagramNameStyle}>
          {record.mainHexagram}
          {record.freeMemo && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '12px',
                color: '#6B5CE7',
                verticalAlign: 'middle',
              }}
            >
              📝
            </span>
          )}
        </div>
        <button
          type="button"
          style={isPinned(record) ? pinBtnActiveStyle : pinBtnStyle}
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePin(record.id);
          }}
          aria-label={
            isPinned(record)
              ? `${record.mainHexagram} 핀 해제`
              : `${record.mainHexagram} 핀 고정`
          }
          aria-pressed={isPinned(record)}
        >
          📌
        </button>
      </div>
      {record.freeMemo && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            marginTop: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {record.freeMemo}
        </div>
      )}
      <div style={metaRowStyle}>
        <span>
          {new Date(record.timestamp).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
          {record.changingLines.length > 0 &&
            ` · 변효 ${record.changingLines.length}개`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{record.viewCount}회 조회</span>
          <button
            type="button"
            style={deleteBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(record);
            }}
            aria-label={`${record.mainHexagram} 기록 삭제`}
          >
            삭제
          </button>
        </span>
      </div>
    </div>
  );

  return (
    <Layout title="기록 보기" showBack onBack={onBack}>
      <div style={{ padding: '16px 16px 24px' }}>
        {state.status === 'ready' && (
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-text-tertiary)',
              marginBottom: '12px',
            }}
          >
            총 {state.totalCount}개의 기록
          </p>
        )}

        {pinLimitNotice && (
          <div
            style={{
              backgroundColor: 'var(--color-bg-elevated, #FFF4E5)',
              border: '1px solid #ED8936',
              color: '#C05621',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            📌 핀은 최대 {pinLimit}개까지 고정할 수 있어요. 핀을 해제한 후 다시
            시도해 주세요.
          </div>
        )}

        {pinnedRecords.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                📌 핀 고정
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                {pinnedRecords.length}/{pinLimit}
              </span>
            </div>
            {pinnedRecords.map((record) => renderListItem(record))}
          </div>
        )}

        {unpinnedRecords.map((record) => renderListItem(record))}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="기록 삭제"
        message={
          deleteTarget
            ? `"${deleteTarget.mainHexagram}" 기록을 삭제할까요?\n삭제된 기록은 복구할 수 없어요.`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
      />
    </Layout>
  );
}
