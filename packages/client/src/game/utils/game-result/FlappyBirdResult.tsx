import React, { useState, useEffect } from 'react';
import 'nes.css/css/nes.min.css';
import { useSFXContext } from '../../../contexts/SFXContext';
import type { PlayerResultData } from '../../types/common';
import type { PlayerId } from '../../types/flappybird.types';
import { type FlappyPlayerStats } from '../../../../../common/src/common-type';
import { isPlayerHost } from '../../../store/gameStore';

export interface FlappyBirdResultProps {
  finalScore: number;
  reason: 'pipe_collision' | 'ground_collision';
  collidedPlayerId?: PlayerId;
  collidedPlayerName?: string;
  gameDuration?: number;
  playerStats?: FlappyPlayerStats[];
  players?: PlayerResultData[];
  onReplay: () => void;
  onLobby: () => void;
  ratio?: number;
}

const FlappyBirdResult: React.FC<FlappyBirdResultProps> = ({
  finalScore,
  reason,
  collidedPlayerId,
  collidedPlayerName,
  gameDuration,
  playerStats,
  players,
  onReplay,
  onLobby,
  ratio: propRatio,
}) => {
  const { playSFX } = useSFXContext();
  const ratio =
    propRatio ??
    (((window as unknown as Record<string, unknown>).__GAME_RATIO as number) ||
      1);

  // 페이드인 애니메이션 상태
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // 마운트 후 페이드인 시작
    const timer = setTimeout(() => {
      setOpacity(1);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 충돌한 플레이어 정보 가져오기
  const collidedPlayer = players?.find(
    (p) => p.playerIndex === Number(collidedPlayerId),
  );
  const playerName = collidedPlayer?.playerName || '';
  const playerColor = collidedPlayer?.color || '#333';

  const collisionType =
    reason === 'pipe_collision' ? '파이프 충돌!' : '바닥 충돌!';

  return (
    <div
      style={{
        ...getOverlayStyle(),
        opacity,
        transition: 'opacity 1.5s ease-in',
      }}
    >
      <div
        className="nes-container is-rounded"
        style={{
          ...getContainerStyle(ratio),
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <h1 style={getTitleStyle(ratio)}>GAME OVER</h1>

        <div style={getContentStyle(ratio)}>
          {collidedPlayerId || collidedPlayerName ? (
            <div style={getReasonStyle(ratio)}>
              <span style={{ color: playerColor, fontWeight: 'bold' }}>
                {collidedPlayerName || playerName}
              </span>{' '}
              {collisionType}
            </div>
          ) : (
            <div style={getReasonStyle(ratio)}>{collisionType}</div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: `${20 * ratio}px`,
              marginBottom: `${20 * ratio}px`,
            }}
          >
            <div>
              <div style={getScoreLabelStyle(ratio)}>최종 점수</div>
              <div style={getFinalScoreStyle(ratio)}>{finalScore}</div>
            </div>
            {gameDuration && (
              <div style={{ textAlign: 'left' }}>
                <div style={getScoreLabelStyle(ratio)}>진행 시간</div>
                <div
                  style={{
                    fontFamily: 'NeoDunggeunmo',
                    fontSize: `${32 * ratio}px`,
                    color: '#666',
                  }}
                >
                  {(gameDuration / 1000).toFixed(1)}s
                </div>
              </div>
            )}
          </div>

          {playerStats && playerStats.length > 0 && (
            <div
              className="nes-table-responsive"
              style={{ marginTop: `${20 * ratio}px` }}
            >
              <table
                className="nes-table is-bordered is-centered"
                style={{
                  width: '100%',
                  fontFamily: 'NeoDunggeunmo',
                  fontSize: `${18 * ratio}px`,
                }}
              >
                <thead>
                  <tr>
                    <th>플레이어</th>
                    <th>점프 횟수</th>
                    <th>평균 간격</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((stat) => (
                    <tr key={stat.playerIndex}>
                      <td style={{ color: stat.playerColor }}>
                        {stat.playerName}
                      </td>
                      <td>{stat.jumpCount}</td>
                      <td>
                        {stat.avgJumpInterval > 0
                          ? `${(stat.avgJumpInterval / 1000).toFixed(2)}s`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={getButtonContainerStyle(ratio)}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`nes-btn is-primary ${!isPlayerHost() ? 'is-disabled' : ''}`}
              style={getButtonStyle(ratio)}
              disabled={!isPlayerHost()}
              onClick={() => {
                playSFX('buttonClick');
                onReplay();
              }}
              onMouseEnter={() => {
                playSFX('buttonHover');
              }}
            >
              REPLAY
            </button>
            {!isPlayerHost() && (
              <span
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  color: '#e76e55',
                }}
              >
                호스트만 가능
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`nes-btn ${!isPlayerHost() ? 'is-disabled' : ''}`}
              style={getButtonStyle(ratio)}
              disabled={!isPlayerHost()}
              onClick={() => {
                playSFX('buttonClick');
                onLobby();
              }}
              onMouseEnter={() => {
                playSFX('buttonHover');
              }}
            >
              LOBBY
            </button>
            {!isPlayerHost() && (
              <span
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  color: '#e76e55',
                }}
              >
                호스트만 가능
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 스타일 함수들
function getOverlayStyle(): React.CSSProperties {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };
}

function getContainerStyle(ratio: number): React.CSSProperties {
  return {
    width: `${800 * ratio}px`,
    maxWidth: '90vw',
    padding: `${40 * ratio}px`,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  };
}

function getTitleStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${64 * ratio}px`,
    marginBottom: `${30 * ratio}px`,
    color: '#e76e55',
    textShadow: '4px 4px 0px rgba(0,0,0,0.2)',
  };
}

function getContentStyle(ratio: number): React.CSSProperties {
  return {
    margin: `${40 * ratio}px 0`,
  };
}

function getReasonStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${32 * ratio}px`,
    marginBottom: `${30 * ratio}px`,
    color: '#333',
  };
}

function getScoreLabelStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${24 * ratio}px`,
    marginBottom: `${10 * ratio}px`,
    color: '#666',
  };
}

function getFinalScoreStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${96 * ratio}px`,
    fontWeight: 'bold',
    color: '#209cee',
    textShadow: '4px 4px 0px rgba(0,0,0,0.1)',
  };
}

function getButtonContainerStyle(ratio: number): React.CSSProperties {
  return {
    display: 'flex',
    gap: `${20 * ratio}px`,
    justifyContent: 'center',
    marginTop: `${40 * ratio}px`,
  };
}

function getButtonStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${24 * ratio}px`,
    padding: `${12 * ratio}px ${24 * ratio}px`,
    minWidth: `${150 * ratio}px`,
  };
}

export default FlappyBirdResult;
