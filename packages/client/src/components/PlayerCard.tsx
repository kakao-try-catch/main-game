import React from 'react';
import '../assets/fonts/Font.css';

interface PlayerCardProps {
  name?: string;
  score?: number;
  color?: string;
  spriteSrc?: string;
  spriteAlt?: string;
  showScore?: boolean;
  extraContent?: React.ReactNode;
}

export const getNameFontSize = (nameLength: number): string => {
  if (nameLength <= 4) return '24px';
  if (nameLength <= 6) return '20px';
  return '18px'; // 7-8자
};

export default function PlayerCard({
  name = 'NONE',
  score = 0,
  color = '#000',
  spriteSrc,
  spriteAlt,
  showScore = true,
  extraContent,
}: PlayerCardProps) {
  const cardHeight = 90;
  const displayScore = showScore;
  const safeScore = typeof score === 'number' ? score : 0;

  return (
    <div style={cardWrapperStyle}>
      <div
        className="nes-container is-centered"
        style={{
          ...contentLayout,
          padding: '12px 8px 4px',
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
              paddingTop: '2px',
              fontSize: getNameFontSize(name.length),
            }}
          >
            {name}
          </span>
        </div>
        {(extraContent || displayScore) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div style={{ flex: 1 }} />
            {displayScore && (
              <span style={{ color: '#212529', fontSize: '28px' }}>
                {safeScore.toLocaleString()}
              </span>
            )}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'flex-end',
                position: 'relative',
                top: '-2px',
              }}
            >
              {extraContent}
            </div>
          </div>
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
  overflow: 'hidden',
};

const nameStyle: React.CSSProperties = {
  wordBreak: 'keep-all',
  textAlign: 'center',
  lineHeight: '1',
};

const spriteStyle: React.CSSProperties = {
  height: '40px',
  width: 'auto',
  imageRendering: 'pixelated',
};
