import React, { useState, useEffect } from 'react';
import 'nes.css/css/nes.min.css';
import { useSFXContext } from '../../../contexts/SFXContext';
import type { PlayerResultData } from '../../types/common';
import type { PlayerId } from '../../types/flappybird.types';
import { isPlayerHost } from '../../../store/gameStore';

export interface FlappyBirdResultProps {
  finalScore: number;
  reason: 'pipe_collision' | 'ground_collision';
  collidedPlayerId?: PlayerId;
  players?: PlayerResultData[];
  onReplay: () => void;
  onLobby: () => void;
  ratio?: number;
}

const FlappyBirdResult: React.FC<FlappyBirdResultProps> = ({
  finalScore,
  reason,
  collidedPlayerId,
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
  const [showReplayTooltip, setShowReplayTooltip] = useState(false);
  const [showLobbyTooltip, setShowLobbyTooltip] = useState(false);
  const isHost = isPlayerHost();

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
    <>
      <style>
        {`
        .nes-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          pointer-events: none;
        }
        .nes-btn:disabled:active {
          box-shadow: none;
          transform: none;
        }
      `}
      </style>
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
          {collidedPlayerId ? (
            <div style={getReasonStyle(ratio)}>
              <span style={{ color: playerColor, fontWeight: 'bold' }}>
                {playerName}
              </span>{' '}
              {collisionType}
            </div>
          ) : (
            <div style={getReasonStyle(ratio)}>{collisionType}</div>
          )}

          <div style={getScoreLabelStyle(ratio)}>최종 점수</div>
          <div style={getFinalScoreStyle(ratio)}>{finalScore}</div>
        </div>

        <div style={getButtonContainerStyle(ratio)}>
          {/* REPLAY 버튼 */}
          <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => !isHost && setShowReplayTooltip(true)}
            onMouseLeave={() => setShowReplayTooltip(false)}
          >
            <button
              type="button"
              className="nes-btn is-primary"
              style={getButtonStyle(ratio)}
              onClick={() => {
                if (!isHost) return;
                playSFX('buttonClick');
                onReplay();
              }}
              onMouseEnter={() => {
                if (isHost) playSFX('buttonHover');
              }}
              disabled={!isHost}
            >
              REPLAY
            </button>
            {showReplayTooltip && !isHost && (
              <div style={getTooltipBoxStyle(ratio)}>
                방장만 해당 작업을 수행할 수 있습니다.
                <div style={getTooltipArrowStyle(ratio)} />
              </div>
            )}
          </div>

          {/* LOBBY 버튼 */}
          <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => !isHost && setShowLobbyTooltip(true)}
            onMouseLeave={() => setShowLobbyTooltip(false)}
          >
            <button
              type="button"
              className="nes-btn"
              style={getButtonStyle(ratio)}
              onClick={() => {
                if (!isHost) return;
                playSFX('buttonClick');
                onLobby();
              }}
              onMouseEnter={() => {
                if (isHost) playSFX('buttonHover');
              }}
              disabled={!isHost}
            >
              LOBBY
            </button>
            {showLobbyTooltip && !isHost && (
              <div style={getTooltipBoxStyle(ratio)}>
                방장만 해당 작업을 수행할 수 있습니다.
                <div style={getTooltipArrowStyle(ratio)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
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

function getTooltipBoxStyle(ratio: number): React.CSSProperties {
  return {
    position: 'absolute',
    bottom: `calc(100% + ${16 * ratio}px)`,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: `${12 * ratio}px ${24 * ratio}px`,
    backgroundColor: '#e76e55',
    color: 'white',
    borderRadius: `${4 * ratio}px`,
    fontSize: `${24 * ratio}px`,
    fontFamily: 'NeoDunggeunmo',
    whiteSpace: 'nowrap',
    zIndex: 1000,
    pointerEvents: 'none',
  };
}

function getTooltipArrowStyle(ratio: number): React.CSSProperties {
  return {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    border: `${10 * ratio}px solid transparent`,
    borderTopColor: '#e76e55',
  };
}

export default FlappyBirdResult;
