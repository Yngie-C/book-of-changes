import { useState, useEffect } from 'react';
import { trackEvent } from '@/lib/toss';
import type { CSSProperties } from 'react';
import { Button } from '@toss/tds-mobile';
import Layout from '@/components/common/Layout';

type HomePageProps = {
  onStart: () => void;
};

const QUESTION_GROUPS = [
  ['이번 투자, 해도 될까?', '오늘 소개팅, 좋은 인연일까?', '이번 주 나의 운세는?'],
  ['이 프로젝트, 잘 마무리될까?', '이직, 지금이 맞을까?', '이 선택, 후회 없을까?'],
  ['시험 결과, 어떻게 될까?', '우리 사이, 앞으로 어떨까?', '오늘 하루, 어떤 날일까?'],
];

const ACCORDION_SECTIONS = [
  {
    title: '주역 동전점이란?',
    content:
      '주역은 3000년 역사를 가진 동양 고전으로, 변화의 이치를 담고 있어요. 동전 3개를 던져 우연 속에서 의미 있는 답을 찾는 점술이에요.',
  },
  {
    title: '어떻게 진행하나요?',
    content:
      '동전 3개를 총 6번 던져요. 매 던지기마다 앞면·뒷면의 조합으로 하나의 \'효(爻)\'가 결정되고, 6개의 효가 모여 하나의 \'괘(卦)\'를 이뤄요.',
  },
  {
    title: '결과는 어떻게 읽나요?',
    content:
      '완성된 괘에 대한 전체 해석(괘사)과, 변하는 효가 있다면 그 효에 대한 개별 해석(효사)을 함께 읽어요. 변효가 있으면 \'변괘\'도 참고해요.',
  },
];

export default function HomePage({ onStart }: HomePageProps) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());
  const [groupIndex, setGroupIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pendingNext, setPendingNext] = useState(false);

  useEffect(() => {
    trackEvent('page_view_home', 'screen');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setPendingNext(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTransitionEnd = () => {
    if (pendingNext) {
      setPendingNext(false);
      setGroupIndex(prev => (prev + 1) % QUESTION_GROUPS.length);
      setVisible(true);
    }
  };

  const toggleSection = (index: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100dvh - 56px)',
    padding: '40px 24px',
    gap: '32px',
    animation: 'slideUp 350ms ease both',
  };

  const symbolStyle: CSSProperties = {
    fontSize: '96px',
    lineHeight: 1,
    animation: 'pulse 1.8s ease-in-out infinite',
    userSelect: 'none',
  };

  const taglineStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    textAlign: 'center',
    lineHeight: 1.5,
    whiteSpace: 'pre-line',
  };

  const accordionWrapperStyle: CSSProperties = {
    width: '100%',
    maxWidth: '320px',
    animation: 'fadeIn 350ms ease both',
    animationDelay: '100ms',
  };

  const sectionBtnStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textAlign: 'left',
  };

  const sectionContentStyle: CSSProperties = {
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.7,
    animation: 'slideUp 250ms ease both',
    marginBottom: '4px',
  };

  return (
    <Layout title="간편 운세 동전 주역점" showBack={false}>
      <div style={contentStyle}>
        <div style={symbolStyle}>䷀</div>

        <p style={taglineStyle}>{'마음을 가다듬고\n질문을 떠올리세요'}</p>

        <div
          style={{
            minHeight: '68px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              opacity: visible ? 1 : 0,
              transition: 'opacity 500ms ease',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {QUESTION_GROUPS[groupIndex].map((question) => (
              <span
                key={question}
                style={{
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontSize: '13px',
                  borderRadius: '999px',
                  padding: '6px 12px',
                  lineHeight: 1.4,
                }}
              >
                {question}
              </span>
            ))}
          </div>
        </div>

        <Button
          color="primary"
          variant="fill"
          size="xlarge"
          display="block"
          onClick={() => {
            trackEvent('divination_start', 'click');
            onStart();
          }}
          style={{ maxWidth: '320px', width: '100%' }}
        >
          점 시작하기
        </Button>

        <div style={accordionWrapperStyle}>
          {ACCORDION_SECTIONS.map((section, index) => {
            const isOpen = openSections.has(index);
            return (
              <div key={index} style={{ marginBottom: index < ACCORDION_SECTIONS.length - 1 ? '4px' : 0 }}>
                <button
                  style={sectionBtnStyle}
                  onClick={() => toggleSection(index)}
                  aria-expanded={isOpen}
                  aria-controls={`accordion-content-${index}`}
                  id={`accordion-header-${index}`}
                >
                  <span>{section.title}</span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div
                    style={sectionContentStyle}
                    id={`accordion-content-${index}`}
                    role="region"
                    aria-labelledby={`accordion-header-${index}`}
                  >
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
