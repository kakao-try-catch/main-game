import React from 'react';
import { useGameStore } from '../../store/gameStore';

const FlappyBirdGameUI: React.FC = () => {
  const currentScore = useGameStore((state) => state.flappyScore);
  const players = useGameStore((state) => state.players);
  const myselfIndex = useGameStore((state) => state.myselfIndex);
  const isGameOver = useGameStore((state) => state.isFlappyGameOver);

  if (isGameOver) return null;

  const ratio = (window as any).__GAME_RATIO || 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        fontFamily: 'NeoDunggeunmo',
        zIndex: 10,
      }}
    >
      {/* 상단 중앙: 현재 점수 */}
      <div
        style={{
          position: 'absolute',
          top: `${20 * ratio}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: `${48 * ratio}px`,
          color: 'white',
          textShadow: '3px 3px 0px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        {currentScore}
      </div>

      {/* 우측 상단: 플레이어 목록 */}
      <div
        style={{
          position: 'absolute',
          top: `${20 * ratio}px`,
          right: `${20 * ratio}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${5 * ratio}px`,
          alignItems: 'flex-end',
        }}
      >
        {players.map((player, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: `${10 * ratio}px`,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: `${5 * ratio}px ${10 * ratio}px`,
              borderRadius: `${5 * ratio}px`,
              borderRight: `5px solid ${player.color}`,
              opacity: myselfIndex === index ? 1 : 0.8,
              transform: myselfIndex === index ? `scale(${1.1})` : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                color: 'white',
                fontSize: `${16 * ratio}px`,
                textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
              }}
            >
              {player.playerName} {myselfIndex === index ? '(Me)' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* 하단: 조작 힌트 */}
      <div
        style={{
          position: 'absolute',
          bottom: `${40 * ratio}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${10 * ratio}px`,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: `${8 * ratio}px ${20 * ratio}px`,
            borderRadius: `${20 * ratio}px`,
            fontSize: `${18 * ratio}px`,
            animation: 'pulse 1.5s infinite',
          }}
        >
          SPACE or CLICK to JUMP
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.6; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1); }
            100% { opacity: 0.6; transform: scale(0.95); }
          }
        `}
      </style>
    </div>
  );
};

export default FlappyBirdGameUI;
