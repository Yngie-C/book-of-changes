import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--color-primary)',
  marginBottom: '4px',
};

const textStyle: CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.7,
  marginBottom: '14px',
};

const blockStyle: CSSProperties = {
  padding: '12px',
  borderRadius: '10px',
  backgroundColor: 'var(--color-bg-secondary)',
  marginBottom: '10px',
};

const lastBlockStyle: CSSProperties = {
  ...blockStyle,
  marginBottom: 0,
};

export function HexagramHelp() {
  return (
    <div>
      <div style={blockStyle}>
        <div style={labelStyle}>괘사(卦辭)</div>
        <div style={textStyle}>
          괘 전체의 의미를 한마디로 요약한 핵심 문장입니다.
          주나라 문왕이 지었다고 전해집니다.
        </div>
        <div style={labelStyle}>단전(彖傳)</div>
        <div style={textStyle}>
          괘사의 뜻을 더 깊이 풀이한 해설입니다.
          왜 이런 의미를 갖는지 이유를 설명합니다.
        </div>
        <div style={labelStyle}>상전(象傳)</div>
        <div style={{ ...textStyle, marginBottom: 0 }}>
          괘의 모양을 자연 현상에 빗대어 해석하고,
          이로부터 삶의 교훈을 이끌어 냅니다.
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginTop: '10px' }}>
        세 가지를 함께 읽으면 괘의 전체적인 의미를 입체적으로 이해할 수 있습니다.
      </div>
    </div>
  );
}

export function LineTextsHelp() {
  return (
    <div>
      <div style={blockStyle}>
        <div style={labelStyle}>효사(爻辭)란?</div>
        <div style={textStyle}>
          괘를 이루는 6개의 효(가로줄) 각각에 붙은 해석입니다.
          아래부터 위로 초효~상효까지 순서대로 읽습니다.
        </div>
        <div style={labelStyle}>어떻게 읽나요?</div>
        <div style={{ ...textStyle, marginBottom: 0 }}>
          주황색으로 강조된 효가 변효(변하는 효)입니다.
          변효가 있다면 해당 효사를 중심으로 해석하세요.
          강조된 효가 없다면 괘사 위주로 해석합니다.
        </div>
      </div>
    </div>
  );
}

export function ChangingHexagramHelp() {
  return (
    <div>
      <div style={blockStyle}>
        <div style={labelStyle}>변괘(變卦)란?</div>
        <div style={textStyle}>
          변효(변하는 효)의 음양이 뒤바뀌어 만들어지는 새로운 괘입니다.
          본괘가 '현재 상황'이라면, 변괘는 '앞으로 향하는 방향'을 나타냅니다.
        </div>
        <div style={labelStyle}>어떻게 읽나요?</div>
        <div style={{ ...textStyle, marginBottom: 0 }}>
          본괘의 괘사·효사로 현재를 파악한 뒤,
          변괘의 괘사를 참고하여 상황이 어떻게 전개될지 가늠합니다.
          두 괘를 함께 읽으면 흐름을 입체적으로 이해할 수 있습니다.
        </div>
      </div>
    </div>
  );
}

export function ChangingLineHelp() {
  return (
    <div>
      <div style={blockStyle}>
        <div style={labelStyle}>변효(變爻)란?</div>
        <div style={textStyle}>
          동전 3개가 모두 같은 면(앞면 3개 또는 뒷면 3개)이
          나온 특별한 효입니다. 음↔양이 바뀌면서
          현재 괘가 다른 괘(변괘)로 변합니다.
        </div>
        <div style={labelStyle}>왜 중요한가요?</div>
        <div style={{ ...textStyle, marginBottom: 0 }}>
          변효는 지금 상황에서 변화가 일어나는 지점을 의미합니다.
          변효의 개수에 따라 해석 방법이 달라지며,
          아래 가이드가 최적의 해석 방법을 안내합니다.
        </div>
      </div>
      <div style={lastBlockStyle}>
        <div style={labelStyle}>변효 개수별 해석</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          <div><b>0개</b> — 변효 없음 → 괘사만으로 해석</div>
          <div><b>1개</b> — 해당 효사를 중심으로 해석</div>
          <div><b>2개</b> — 두 효사를 함께 참고</div>
          <div><b>3개</b> — 본괘·변괘를 종합 해석</div>
          <div><b>4~5개</b> — 변괘의 변하지 않는 효 참고</div>
          <div><b>6개</b> — 변괘의 괘사로 해석</div>
        </div>
      </div>
    </div>
  );
}
