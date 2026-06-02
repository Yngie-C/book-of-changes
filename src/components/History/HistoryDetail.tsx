import type { CSSProperties } from 'react';
import type { DivinationRecord } from '@/data/types';
import { HEXAGRAMS } from '@/data/hexagrams';

type HistoryDetailProps = {
  record: DivinationRecord;
};

/**
 * mainHexagram 문자열 (예: "1. 건(乾)")에서 숫자만 추출한다.
 */
function parseHexagramNumber(mainHexagram: string): number | null {
  const match = mainHexagram.match(/^(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * ISO 8601 timestamp를 "yyyy.mm.dd HH:MM" 형식으로 포매팅한다.
 */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

/** 괘명 라벨 + 괘명 + 유니코드 기호 */
function HexagramHeader({
  label,
  hexagramValue,
}: {
  label: string;
  hexagramValue: string | null;
}) {
  if (!hexagramValue) return null;
  const num = parseHexagramNumber(hexagramValue);
  const data = num != null && num >= 1 && num <= 64 ? HEXAGRAMS[num - 1] : null;

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '8px',
  };
  const labelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '4px',
  };
  const symbolStyle: CSSProperties = {
    fontSize: '48px',
    lineHeight: 1,
    marginBottom: '4px',
  };
  const nameStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  };

  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>{label}</span>
      {data && <div style={symbolStyle}>{data.unicode}</div>}
      <span style={nameStyle}>{hexagramValue}</span>
    </div>
  );
}

function SectionBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const wrapStyle: CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-elevated, #F2F4F6)',
    marginBottom: '12px',
  };
  const labelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '8px',
  };

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function MetaChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const wrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
  };

  return (
    <span style={wrapStyle}>
      <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <span>{value}</span>
    </span>
  );
}

export default function HistoryDetail({ record }: HistoryDetailProps) {
  const containerStyle: CSSProperties = {
    padding: '20px 16px',
  };

  const headerWrapStyle: CSSProperties = {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '20px',
    padding: '20px 0',
    borderBottom: '1px solid var(--color-divider)',
  };

  const dateBarStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
    marginBottom: '24px',
  };

  const metaRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  };

  const interpretationTextStyle: CSSProperties = {
    fontSize: 'var(--font-size-body1)',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
  };

  const questionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: 'var(--font-size-body1)',
    color: 'var(--color-text-primary)',
  };

  const questionEmojiStyle: CSSProperties = {
    fontSize: '20px',
    lineHeight: 1,
  };

  const memoStyle: CSSProperties = {
    fontSize: 'var(--font-size-body1)',
    color: 'var(--color-text-primary)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
  };

  const changingLinesStr =
    record.changingLines.length > 0
      ? record.changingLines
          .map(
            (pos) =>
              ['초효', '2효', '3효', '4효', '5효', '상효'][pos - 1] ?? `${pos}효`,
          )
          .join(' · ')
      : '없음';

  return (
    <div style={containerStyle}>
      {/* 날짜 + 상세 메타 */}
      <div style={dateBarStyle}>
        <span>{formatDate(record.timestamp)}</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <MetaChip label="조회" value={`${record.viewCount}회`} />
          {record.lastViewedAt && (
            <MetaChip
              label="마지막 조회"
              value={formatDate(record.lastViewedAt)}
            />
          )}
        </div>
      </div>

      {/* 본괘 / 변괘 대조 */}
      <div style={headerWrapStyle}>
        <HexagramHeader label="본괘" hexagramValue={record.mainHexagram} />
        {record.changingHexagram && (
          <HexagramHeader label="변괘" hexagramValue={record.changingHexagram} />
        )}
      </div>

      {/* 변효 정보 */}
      <div style={metaRowStyle}>
        <MetaChip label="변효" value={changingLinesStr} />
      </div>

      {/* 사용자 질문 */}
      {record.userQuestion && (
        <SectionBlock label="질문">
          <div style={questionStyle}>
            <span style={questionEmojiStyle}>💭</span>
            <span>{record.userQuestion}</span>
          </div>
        </SectionBlock>
      )}

      {/* AI 맞춤 해석 */}
      {record.aiInterpretation && (
        <SectionBlock label="AI 맞춤 해석">
          <div style={interpretationTextStyle}>
            {record.aiInterpretation}
          </div>
        </SectionBlock>
      )}

      {/* 자유 메모 */}
      {record.freeMemo ? (
        <SectionBlock label="메모">
          <div style={memoStyle}>{record.freeMemo}</div>
        </SectionBlock>
      ) : null}
    </div>
  );
}
