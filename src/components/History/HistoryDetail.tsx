import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { DivinationRecord, LineResult, Hexagram } from '@/data/types';
import { HEXAGRAMS } from '@/data/hexagrams';
import { TRIGRAMS } from '@/data/trigrams';
import { useHexagram } from '@/hooks/useHexagram';
import HexagramSymbol from '@/components/Hexagram/HexagramSymbol';
import HexagramInfo from '@/components/Hexagram/HexagramInfo';
import HexagramStack from '@/components/Hexagram/HexagramStack';
import ChangingGuide from '@/components/Hexagram/ChangingGuide';
import Interpretation from '@/components/Result/Interpretation';
import LineTexts from '@/components/Result/LineTexts';

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
 * DivinationRecord에서 LineResult[]를 복원한다.
 *
 * 저장된 mainHexagram 문자열에서 괘 번호를 추출하고,
 * HEXAGRAMS에서 상/하괘 이름으로 팔괘(TRIGRAMS)을 조회하여
 * 각 효의 타입(yang/yin)을 가져온다.
 * changingLines 배열로 변효 여부를 설정한다.
 */
function reconstructLines(record: DivinationRecord): LineResult[] {
  const num = parseHexagramNumber(record.mainHexagram);
  if (!num || num < 1 || num > 64) return [];

  const hexagram: Hexagram | undefined = HEXAGRAMS[num - 1];
  if (!hexagram) return [];

  const lowerTrigram = TRIGRAMS.find(t => t.name === hexagram.lowerTrigram);
  const upperTrigram = TRIGRAMS.find(t => t.name === hexagram.upperTrigram);
  if (!lowerTrigram || !upperTrigram) return [];

  // lines[0~2] = 하괘 (1~3효), lines[3~5] = 상괘 (4~6효)
  const lineTypes = [...lowerTrigram.lines, ...upperTrigram.lines];
  return lineTypes.map((type, i) => {
    const isChanging = record.changingLines.includes(i + 1);
    const value: 6 | 7 | 8 | 9 = type === 'yang' ? (isChanging ? 9 : 7) : (isChanging ? 6 : 8);
    return { type, changing: isChanging, value };
  });
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

export default function HistoryDetail({ record }: HistoryDetailProps) {
  const lines = useMemo(() => reconstructLines(record), [record]);
  const { hexagram, changingHexagram, interpretationRule } = useHexagram(lines);
  const highlightedLines = interpretationRule?.highlightedLines ?? [];

  // ── Styles ──────────────────────────────────────────────────────────────

  const containerStyle: CSSProperties = {
    padding: '20px 16px',
  };

  const dateBarStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
    marginBottom: '24px',
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

  const sectionBlockStyle: CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-elevated, #F2F4F6)',
    marginBottom: '12px',
  };

  const blockLabelStyle: CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '8px',
  };

  const textStyle: CSSProperties = {
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

  // 데이터가 부족하여 괘를 복원할 수 없는 경우
  if (!hexagram) {
    return (
      <div style={containerStyle}>
        <div style={dateBarStyle}>
          <span>{formatDate(record.timestamp)}</span>
          <span>{record.viewCount}회 조회</span>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          기록 데이터를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  const _changingLinesStr =
    record.changingLines.length > 0
      ? record.changingLines
          .map(pos => ['초효', '2효', '3효', '4효', '5효', '상효'][pos - 1] ?? `${pos}효`)
          .join(' · ')
      : '없음';

  return (
    <div style={containerStyle}>
      {/* 날짜 + 조회 메타 */}
      <div style={dateBarStyle}>
        <span>{formatDate(record.timestamp)}</span>
        <span>{record.viewCount}회 조회</span>
      </div>

      {/* Card 1: 괘 정보 + 효 구성 + 변효 가이드 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <HexagramSymbol hexagram={hexagram} size="large" />
          <HexagramInfo hexagram={hexagram} />
        </div>

        <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>효 구성</div>
        <HexagramStack lines={lines} showChanging size="medium" />

        {record.changingLines.length > 0 && interpretationRule && (
          <div style={{ marginTop: '16px' }}>
            <ChangingGuide rule={interpretationRule} />
          </div>
        )}
      </div>

      {/* Card 2: 괘사 */}
      <div style={cardStyle}>
        <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>
          괘사
        </div>
        <Interpretation hexagram={hexagram} />
      </div>

      {/* Card 3: 효사 */}
      <div style={cardStyle}>
        <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>
          효사 <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: '6px' }}>· 각 효의 의미</span>
        </div>
        <LineTexts hexagram={hexagram} highlightedLines={highlightedLines} />
      </div>

      {/* Card 4: 변괘 (있을 경우, 항상 펼쳐져 있음) */}
      {changingHexagram && (
        <div style={cardStyle}>
          <div style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center' }}>
            변괘
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <HexagramSymbol hexagram={changingHexagram} size="large" />
            <HexagramInfo hexagram={changingHexagram} />
          </div>
          <Interpretation hexagram={changingHexagram} />
        </div>
      )}

      {/* 추가 기록 데이터: 질문, AI 해석, 메모 */}
      {record.userQuestion && (
        <div style={sectionBlockStyle}>
          <div style={blockLabelStyle}>질문</div>
          <div style={questionStyle}>
            <span style={questionEmojiStyle}>💭</span>
            <span>{record.userQuestion}</span>
          </div>
        </div>
      )}

      {record.aiInterpretation && (
        <div style={sectionBlockStyle}>
          <div style={blockLabelStyle}>AI 맞춤 해석</div>
          <div style={textStyle}>{record.aiInterpretation}</div>
        </div>
      )}

      {record.freeMemo && (
        <div style={sectionBlockStyle}>
          <div style={blockLabelStyle}>메모</div>
          <div style={memoStyle}>{record.freeMemo}</div>
        </div>
      )}
    </div>
  );
}