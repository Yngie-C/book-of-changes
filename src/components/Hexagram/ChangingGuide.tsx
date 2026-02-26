import type { CSSProperties } from 'react';
import type { InterpretationResult } from '@/data/types';

type ChangingGuideProps = {
  rule: InterpretationResult;
};

export default function ChangingGuide({ rule }: ChangingGuideProps) {
  const wrapStyle: CSSProperties = {
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-changing-bg)',
    border: '1px solid #FFD591',
    margin: '0 20px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#D46B08',
    marginBottom: '4px',
  };

  const descStyle: CSSProperties = {
    fontSize: '13px',
    color: '#7C4A00',
    lineHeight: 1.6,
  };

  return (
    <div style={wrapStyle}>
      <div style={titleStyle}>변효 해석 가이드</div>
      <div style={descStyle}>{rule.description}</div>
    </div>
  );
}
