import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { DivinationRecord } from '@/data/types';
import { useHistoryList } from '@/hooks/useHistoryList';
import HistoryDetail from '@/components/History/HistoryDetail';
import MemoEditor from '@/components/History/MemoEditor';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Layout from '@/components/common/Layout';
import { updateRecord } from '@/lib/storage';
import { trackEvent } from '@/lib/toss';

type HistoryListPageProps = {
  onBack: () => void;
};

export default function HistoryListPage({ onBack }: HistoryListPageProps) {
  const { state, deleteRecord, refresh } = useHistoryList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DivinationRecord | null>(null);

  const selectedRecord =
    selectedId && state.status === 'ready'
      ? state.records.find((r) => r.id === selectedId) ?? null
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelect = (id: string) => {
    setSelectedId(id);
    trackEvent('history_detail_view', 'click');
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
        <div style={{ padding: '0 16px 24px' }}>
          <HistoryDetail record={selectedRecord} />
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>메모</div>
            <MemoEditor
              initialMemo={selectedRecord.freeMemo}
              onSave={(memo) => handleMemoSave(selectedRecord.id, memo)}
              placeholder="이 점괘에 대한 생각을 남겨보세요"
            />
          </div>
        </div>
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

        {records.map((record) => (
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
        ))}
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
