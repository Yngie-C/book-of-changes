import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@toss/tds-mobile';

const CATEGORIES = ['연애', '취업', '재물', '건강', '대인관계', '기타'] as const;
const MAX_LENGTH = 200;

type AiInputFormProps = {
  onSubmit: (situation: string, category: string) => void;
  isLoading: boolean;
};

export default function AiInputForm({ onSubmit, isLoading }: AiInputFormProps) {
  const [situation, setSituation] = useState('');
  const [category, setCategory] = useState<string>('기타');

  const handleSubmit = () => {
    if (!situation.trim() || isLoading) return;
    onSubmit(situation.trim(), category);
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '0 20px',
    animation: 'slideUp 300ms ease both',
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
    color: situation.length > MAX_LENGTH ? '#E53E3E' : 'var(--color-text-tertiary)',
  };

  const chipContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  };

  const chipStyle = (isSelected: boolean): CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1.5px solid ${isSelected ? '#6B5CE7' : 'var(--color-border)'}`,
    backgroundColor: isSelected ? '#6B5CE720' : 'var(--color-bg)',
    color: isSelected ? '#6B5CE7' : 'var(--color-text-secondary)',
    fontSize: '14px',
    fontWeight: isSelected ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    minHeight: '36px',
  });

  const labelStyle: CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '-8px',
  };

  const isValid = situation.trim().length > 0 && situation.length <= MAX_LENGTH;

  return (
    <div style={formStyle} role="form" aria-label="AI 맞춤 해석 입력">
      <div style={labelStyle}>카테고리</div>
      <div style={chipContainerStyle} role="radiogroup" aria-label="고민 카테고리">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            style={chipStyle(category === cat)}
            onClick={() => setCategory(cat)}
            role="radio"
            aria-checked={category === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={labelStyle}>현재 상황</div>
      <div style={textareaWrapStyle}>
        <textarea
          style={textareaStyle}
          placeholder="현재 고민이나 상황을 입력해 주세요"
          value={situation}
          onChange={e => setSituation(e.target.value.slice(0, MAX_LENGTH))}
          maxLength={MAX_LENGTH}
          aria-label="상황 입력"
          aria-describedby="char-counter"
          disabled={isLoading}
        />
        <span id="char-counter" style={counterStyle}>
          {situation.length}/{MAX_LENGTH}
        </span>
      </div>

      <Button
        color="primary"
        variant="fill"
        size="large"
        display="block"
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        loading={isLoading}
      >
        AI 해석 받기
      </Button>
    </div>
  );
}
