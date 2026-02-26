import type { CSSProperties } from 'react';
import type { InterpretationResult } from '@/data/types';
import { HelpIcon } from '@/components/common/HelpModal';

type ChangingGuideProps = {
  rule: InterpretationResult;
  onHelp?: () => void;
};

export default function ChangingGuide({ rule, onHelp }: ChangingGuideProps) {
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
      <div style={{ ...titleStyle, display: 'flex', alignItems: 'center' }}>
        변효 해석 가이드
        {onHelp && <HelpIcon onClick={onHelp} />}
      </div>
      <div style={descStyle}>{rule.description}</div>
    </div>
  );
}
