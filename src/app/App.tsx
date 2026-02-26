import { useState, useRef, lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import type { PageRoute } from '@/data/types';
import { useDivination } from '@/hooks/useDivination';
import HomePage from '@/pages/HomePage';
import DivinationPage from '@/pages/DivinationPage';
const ResultPage = lazy(() => import('@/pages/ResultPage'));

// Animation class per transition direction
const PAGE_ANIMATIONS: Record<string, string> = {
  'home→divination': 'slideInRight',
  'home→result': 'slideInRight',
  'divination→result': 'slideInRight',
  'result→home': 'slideInLeft',
  'divination→home': 'slideInLeft',
};

function getAnimationStyle(from: PageRoute, to: PageRoute): CSSProperties {
  const key = `${from}→${to}`;
  const animName = PAGE_ANIMATIONS[key] ?? 'fadeIn';
  return {
    animation: `${animName} 280ms ease both`,
  };
}

export default function App() {
  const [page, setPage] = useState<PageRoute>('home');
  const prevPageRef = useRef<PageRoute>('home');
  const { session, addLine, reset } = useDivination();

  const navigate = (to: PageRoute) => {
    prevPageRef.current = page;
    setPage(to);
  };

  const handleStart = () => {
    reset();
    navigate('divination');
  };

  const handleComplete = () => {
    navigate('result');
  };

  const handleRestart = () => {
    reset();
    navigate('home');
  };

  const handleBackToHome = () => {
    reset();
    navigate('home');
  };

  const animStyle = getAnimationStyle(prevPageRef.current, page);

  switch (page) {
    case 'home':
      return (
        <div key="home" style={animStyle}>
          <HomePage onStart={handleStart} />
        </div>
      );
    case 'divination':
      return (
        <div key="divination" style={animStyle}>
          <DivinationPage
            session={session}
            onAddLine={addLine}
            onBack={handleBackToHome}
            onComplete={handleComplete}
          />
        </div>
      );
    case 'result':
      return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>로딩 중...</div>}>
          <div key="result" style={animStyle}>
            <ResultPage
              session={session}
              onRestart={handleRestart}
              onBack={handleBackToHome}
            />
          </div>
        </Suspense>
      );
  }
}
