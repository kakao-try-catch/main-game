import React from 'react';
import '../assets/fonts/Font.css';

interface PlayerCardProps {
  name?: string;
  score?: number;
  color?: string;
  spriteSrc?: string;
  spriteAlt?: string;
  showScore?: boolean;
  flagCount?: number;
  spriteFlag?: string;
}

export const getNameFontSize = (nameLength: number): string => {
  if (nameLength <= 4) return '28px';
  if (nameLength <= 6) return '24px';
  return '20px'; // 7-8자
};

export default function PlayerCard({
  name = 'NONE',
  score = 0,
  color = '#000',
  spriteSrc,
  spriteAlt,
  showScore = true,
  flagCount = 0,
  spriteFlag,
}: PlayerCardProps) {
  const cardHeight = spriteSrc || spriteFlag ? 110 : 80;
  const displayScore = showScore;
  const safeScore = typeof score === 'number' ? score : 0;
  const safeFlagCount = typeof flagCount === 'number' ? flagCount : 0;

  return (
    <div style={cardWrapperStyle}>
      <div
        className="nes-container is-centered"
        style={{
          ...contentLayout,
          padding: '4px 8px',
          minHeight: `${cardHeight}px`,
          height: `${cardHeight}px`,
          backgroundColor: '#ffffff',
        }}
      >
        {spriteSrc && (
          <img
            src={spriteSrc}
            alt={spriteAlt ?? `${name} bird`}
            style={spriteStyle}
          />
        )}
        <div style={nameContainerStyle}>
          <span
            style={{
              ...nameStyle,
              color: color,
              fontSize: getNameFontSize(name.length),
            }}
          >
            {name}
          </span>
        </div>
        {spriteFlag && (
          <div style={flagContainerStyle}>
            <img
              src={spriteFlag}
              alt="flag"
              style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
            />
            <span
              style={{ color: '#212529', fontSize: '20px', marginLeft: '4px' }}
            >
              {safeFlagCount}
            </span>
          </div>
        )}
        {displayScore && (
          <span style={{ color: '#212529', fontSize: '28px' }}>
            {safeScore.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

const cardWrapperStyle: React.CSSProperties = {
  width: '180px',
  minWidth: '180px',
  maxWidth: '180px',
  fontFamily: 'NeoDunggeunmo',
};

const contentLayout: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  gap: '4px',
};

const nameContainerStyle: React.CSSProperties = {
  minHeight: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const nameStyle: React.CSSProperties = {
  wordBreak: 'keep-all',
  textAlign: 'center',
};

const spriteStyle: React.CSSProperties = {
  height: '40px',
  width: 'auto',
  imageRendering: 'pixelated',
};

const flagContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '32px',
};
