/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import 'nes.css/css/nes.min.css';
import { useSFXContext } from '../../../contexts/SFXContext';
import type { PlayerResultData } from '../../types/common';

// crown.svg 내용을 직접 컴포넌트로 정의 (fill 색상 props로 제어, style prop 허용)
type CrownSvgProps = { fill: string; style?: React.CSSProperties };
const CrownSvg: React.FC<CrownSvgProps> = ({ fill, style }) => (
  <svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    width="64"
    height="64"
    viewBox="0 0 64 64"
    style={style}
  >
    <path
      d="M0 0 C4.63541197 2.54947658 7.88683865 6.66012737 11.41601562 10.53515625 C12.01220703 11.16550781 12.60839844 11.79585937 13.22265625 12.4453125 C13.75640869 13.03070801 14.29016113 13.61610352 14.84008789 14.21923828 C16.44157844 15.5999109 16.44157844 15.5999109 18.51733398 15.18310547 C20.75957056 14.34612597 20.75957056 14.34612597 23.5 12.375 C29.5 8.375 29.5 8.375 31.5 7.375 C31.5 11.665 31.5 15.955 31.5 20.375 C30.84 20.375 30.18 20.375 29.5 20.375 C29.51160156 21.03886719 29.52320313 21.70273437 29.53515625 22.38671875 C29.62478032 31.15707381 29.62478032 31.15707381 28.5 35.375 C27.84 35.375 27.18 35.375 26.5 35.375 C26.70625 36.138125 26.9125 36.90125 27.125 37.6875 C27.5 40.375 27.5 40.375 25.5 43.375 C21.63110646 47.24389354 21.63110646 47.24389354 18.57839966 47.59773254 C17.85401703 47.58457504 17.1296344 47.57141754 16.38330078 47.55786133 C15.14654099 47.54212822 15.14654099 47.54212822 13.88479614 47.52607727 C12.99726654 47.50329208 12.10973694 47.4805069 11.1953125 47.45703125 C10.27918182 47.43912033 9.36305115 47.42120941 8.41915894 47.40275574 C6.48065535 47.36155859 4.54225988 47.31497539 2.60400391 47.26342773 C-0.35637138 47.1879748 -3.31639755 47.13885468 -6.27734375 47.09179688 C-8.16149586 47.04847762 -10.04561307 47.00360659 -11.9296875 46.95703125 C-13.25490921 46.9380352 -13.25490921 46.9380352 -14.60690308 46.9186554 C-19.31640681 46.76985821 -22.74036242 46.53513285 -26.5 43.375 C-28.09253537 38.5973939 -29.01297876 33.67128447 -30.0625 28.75 C-30.29646484 27.69425781 -30.53042969 26.63851562 -30.77148438 25.55078125 C-32.08959346 19.34836705 -32.75916349 13.71453767 -32.5 7.375 C-28.93242734 9.15878633 -25.56836905 11.44448502 -22.5625 14.0625 C-20.63257424 15.59419425 -20.63257424 15.59419425 -18.57592773 15.15673828 C-16.10393535 14.22585276 -14.99267494 13.12844468 -13.22265625 11.1796875 C-12.62646484 10.54675781 -12.03027344 9.91382813 -11.41601562 9.26171875 C-10.1782265 7.9182806 -8.9464518 6.56927653 -7.72070312 5.21484375 C-3.23819954 0.48572993 -3.23819954 0.48572993 0 0 Z "
      fill={fill}
      transform="translate(32.5,8.625)"
    />
  </svg>
);

interface RankedPlayer extends PlayerResultData {
  rank: number;
}

interface GameResultProps {
  players: PlayerResultData[];
  onReplay: () => void;
  onLobby: () => void;
  ratio?: number;
}

function calculateRanks(players: PlayerResultData[]): RankedPlayer[] {
  if (players.length === 0) return [];
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.playerIndex - b.playerIndex;
  });
  const rankedPlayers: RankedPlayer[] = [];
  let currentRank = 1;
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    if (i > 0 && sortedPlayers[i - 1].score !== player.score) {
      currentRank = i + 1;
    }
    rankedPlayers.push({ ...player, rank: currentRank });
  }
  return rankedPlayers;
}

function getRankHeight(rank: number): number {
  const heights: Record<number, number> = { 1: 246, 2: 186, 3: 126, 4: 76 };
  return heights[rank] || 76;
}

function getCrownProps(rank: number): { visible: boolean; fill: string } {
  if (rank === 1) return { visible: true, fill: '#FAA629' };
  if (rank === 2) return { visible: true, fill: '#A7AFB3' };
  return { visible: false, fill: 'none' };
}

const GameResult: React.FC<GameResultProps> = ({
  players,
  onReplay,
  onLobby,
  ratio: propRatio,
}) => {
  const { playSFX } = useSFXContext();
  // 기준 해상도 대비 현재 비율 (사과 게임과 동일)
  const ratio = propRatio ?? ((window as any).__GAME_RATIO || 1);
  const rankedPlayers = calculateRanks(players);

  // 닉네임 길이에 따라 폰트 크기 조절
  const getNameFontSize = (nameLength: number) => {
    if (nameLength <= 3) return '48px';
    if (nameLength <= 5) return '40px';
    if (nameLength <= 7) return '34px';
    return '28px'; // 8자
  };

  return (
    <div style={getOverlayStyle()}>
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
        <h1 style={getTitleStyle(ratio)}>APPLE GAME TOGETHER</h1>
        <div style={getRankContainerStyle(ratio)}>
          {rankedPlayers.map((player, idx) => {
            const height = getRankHeight(player.rank) * ratio;
            const crown = getCrownProps(player.rank);
            return (
              <div
                key={player.id}
                style={{
                  ...getRankItemStyle(ratio),
                  marginLeft: idx === 0 ? 0 : -5 * ratio,
                }}
              >
                {crown.visible && (
                  <CrownSvg
                    style={{
                      ...getCrownStyle(ratio),
                      marginTop: 0,
                      marginBottom: 3 * ratio,
                    }}
                    fill={crown.fill}
                  />
                )}
                <div
                  style={{
                    ...getPlayerNameStyle(ratio),
                    marginTop: 0,
                    fontSize: getNameFontSize(player.name.length),
                    whiteSpace: 'nowrap',
                    maxWidth: '210px',
                    textAlign: 'center',
                  }}
                >
                  {player.name}
                </div>
                <div
                  style={{
                    ...getRankBarStyle(ratio),
                    height: `${height}px`,
                    backgroundColor: player.color,
                  }}
                >
                  <div style={getScoreStyle(ratio)}>{player.score}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={getButtonContainerStyle(ratio)}>
          <button
            type="button"
            className="nes-btn is-primary"
            style={getButtonStyle(ratio)}
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
          <button
            type="button"
            className="nes-btn is-primary"
            style={getButtonStyle(ratio)}
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
        </div>
      </div>
    </div>
  );
};

// 비율(ratio) 기반 스타일 함수들
function getOverlayStyle(): React.CSSProperties {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    pointerEvents: 'auto',
  };
}
function getContainerStyle(ratio: number): React.CSSProperties {
  return {
    backgroundColor: '#fff',
    width: `${1052 * ratio}px`,
    height: `${700 * ratio}px`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: `${40 * ratio}px`,
    boxSizing: 'border-box',
  };
}

function getTitleStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${55 * ratio}px`,
    marginBottom: `${20 * ratio}px`,
    marginTop: 0,
    color: '#212529',
  };
}

function getRankContainerStyle(ratio: number): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: `${1 * ratio}px`,
    marginBottom: `${30 * ratio}px`,
    minHeight: `${320 * ratio}px`,
    width: '100%',
  };
}

function getRankItemStyle(ratio: number): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 0,
    width: `${220 * ratio}px`,
    marginLeft: -5 * ratio,
  };
}

function getCrownStyle(ratio: number): React.CSSProperties {
  return {
    width: `${48 * ratio}px`,
    height: `${48 * ratio}px`,
    marginBottom: `${-32 * ratio}px`,
  };
}

function getPlayerNameStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${48 * ratio}px`,
    color: '#212529',
    marginBottom: 0,
    marginTop: -18 * ratio,
    lineHeight: `${45 * ratio}px`,
  };
}

function getScoreStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${48 * ratio}px`,
    color: '#212529',
    paddingTop: `${10 * ratio}px`,
  };
}

function getRankBarStyle(ratio: number): React.CSSProperties {
  return {
    width: `${210 * ratio}px`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  };
}

function getButtonContainerStyle(ratio: number): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'center',
    gap: `${60 * ratio}px`,
    marginTop: `${10 * ratio}px`,
  };
}

function getButtonStyle(ratio: number): React.CSSProperties {
  return {
    fontFamily: 'NeoDunggeunmo',
    fontSize: `${51 * ratio}px`,
    width: `${386 * ratio}px`,
    height: `${136 * ratio}px`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  };
}

export default GameResult;
