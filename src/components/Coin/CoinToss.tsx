import type { CSSProperties } from 'react';
import type { CoinFace } from '@/hooks/useCoinToss';
import styles from './Coin.module.css';

type CoinProps = {
  face: CoinFace;
  isAnimating: boolean;
  index: number;
};

function Coin({ face, isAnimating, index }: CoinProps) {
  const isFront = face === 'front';

  // CSS classes for animation — inline keyframe names are hashed by CSS Modules
  // and won't match. Using classes ensures proper scoping.
  //   flipToFront → rotateY(1800deg) = 10×180 → front face visible
  //   flipToBack  → rotateY(1980deg) = 11×180 → back face visible
  const coinClasses = [styles.coin];
  if (isAnimating) {
    coinClasses.push(isFront ? styles.flipToFront : styles.flipToBack);
  }

  // Stagger delay via CSS custom property; resting transform via inline style.
  const coinStyle: CSSProperties = isAnimating
    ? ({ '--flip-delay': `${index * 150}ms` } as CSSProperties)
    : { transform: isFront ? 'rotateY(0deg)' : 'rotateY(180deg)' };

  const badgeClass = isFront ? styles.yang : styles.yin;
  const badgeLabel = isFront ? '양' : '음';

  return (
    <div className={styles.coinContainer}>
      <div className={coinClasses.join(' ')} style={coinStyle}>
        {/* Front face — 양 */}
        <div className={styles.coinFront}>
          <span className={styles.coinSymbol}>陽</span>
        </div>

        {/* Back face — 음 */}
        <div className={styles.coinBack}>
          <span className={`${styles.coinSymbol} ${styles.coinSymbolBack}`}>陰</span>
        </div>
      </div>

      {/* Ground shadow — shrinks as coin rises */}
      <div
        className={`${styles.coinShadow} ${isAnimating ? styles.coinShadowAnim : ''}`}
        style={isAnimating ? ({ '--flip-delay': `${index * 150}ms` } as CSSProperties) : undefined}
      />

      {/* Result badge — only shown when NOT animating */}
      {!isAnimating && (
        <div className={`${styles.resultBadge} ${badgeClass}`}>
          {badgeLabel}
        </div>
      )}
    </div>
  );
}

type CoinTossProps = {
  coins: CoinFace[];
  isAnimating: boolean;
};

export default function CoinToss({ coins, isAnimating }: CoinTossProps) {
  const wrapStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '32px 0',
  };

  return (
    <div style={wrapStyle}>
      {coins.map((face, i) => (
        <Coin key={i} face={face} isAnimating={isAnimating} index={i} />
      ))}
    </div>
  );
}
