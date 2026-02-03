import React, { useMemo, useState } from 'react';
import 'nes.css/css/nes.min.css';
import { useSFXContext } from '../../../contexts/SFXContext';
import type { PlayerResultData, PlayerData } from '../../types/common';
import { useGameStore, isPlayerHost } from '../../../store/gameStore';

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

type CrownProps = { visible: boolean; fill: string };

export interface BaseRankedResultProps {
  players: PlayerResultData[];
  onReplay: () => void;
  onLobby: () => void;
  ratio?: number;
  title: string;
  renderPlayerSubline?: (player: PlayerData) => React.ReactNode;
}

const rankHeights: Record<number, number> = {
  1: 246,
  2: 186,
  3: 126,
  4: 76,
};
function getRankHeight(rank: number): number {
  const height = rankHeights[rank] || 76;
  return height;
}

function getCrownProps(rank: number): CrownProps {
  if (rank === 1) return { visible: true, fill: '#FAA629' };
  if (rank === 2) return { visible: true, fill: '#A7AFB3' };
  return { visible: false, fill: 'none' };
}

function getNameFontSize(nameLength: number): string {
  if (nameLength <= 3) return '48px';
  if (nameLength <= 5) return '40px';
  if (nameLength <= 7) return '34px';
  return '28px';

  // todo 랭크 계산 필요함. 등수 2개 같은 경우 같은 높이 줘야 해서
  // private calculateRanks(players: PlayerResultData[]): RankedPlayer[] {
  //   if (players.length === 0) return [];
  //   const sortedPlayers = [...players].sort((a, b) => {
  //     if (b.score !== a.score) return b.score - a.score;
  //     return a.playerIndex - b.playerIndex;
  //   });
  //   const rankedPlayers: RankedPlayer[] = [];
  //   let currentRank = 1;
  //   for (let i = 0; i < sortedPlayers.length; i++) {
  //     const player = sortedPlayers[i];
  //     if (i > 0 && sortedPlayers[i - 1].score !== player.score) {
  //       currentRank = i + 1;
  //     }
  //     rankedPlayers.push({ ...player, rank: currentRank });
  //   }
  //   return rankedPlayers;
  // }
}

class ResultStyleBuilder {
  constructor(private ratio: number) {}

  private px(value: number): string {
    return `${value * this.ratio}px`;
  }

  private num(value: number): number {
    return value * this.ratio;
  }

  public overlay(): React.CSSProperties {
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

  public container(): React.CSSProperties {
    return {
      backgroundColor: '#fff',
      width: this.px(1052),
      height: this.px(700),
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: this.px(40),
      boxSizing: 'border-box',
    };
  }

  public title(): React.CSSProperties {
    return {
      fontFamily: 'NeoDunggeunmo',
      fontSize: this.px(55),
      marginBottom: this.px(20),
      marginTop: 0,
      color: '#212529',
    };
  }

  public rankContainer(): React.CSSProperties {
    return {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: this.px(1),
      marginBottom: this.px(30),
      minHeight: this.px(320),
      width: '100%',
    };
  }

  public rankItem(): React.CSSProperties {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 0,
      width: this.px(220),
    };
  }

  public crown(): React.CSSProperties {
    return {
      width: this.px(48),
      height: this.px(48),
      marginBottom: this.px(-32),
    };
  }

  public playerName(): React.CSSProperties {
    return {
      fontFamily: 'NeoDunggeunmo',
      fontSize: this.px(48),
      color: '#212529',
      marginBottom: 0,
      marginTop: this.num(-18),
      lineHeight: this.px(45),
    };
  }

  public score(): React.CSSProperties {
    return {
      fontFamily: 'NeoDunggeunmo',
      fontSize: this.px(48),
      color: '#212529',
      paddingTop: this.px(10),
    };
  }

  public rankBar(): React.CSSProperties {
    return {
      width: this.px(210),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    };
  }

  public sublineRow(): React.CSSProperties {
    return {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: this.px(1),
      width: '100%',
      marginBottom: this.px(20),
    };
  }

  public sublineItem(): React.CSSProperties {
    return {
      width: this.px(220),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'NeoDunggeunmo',
      fontSize: this.px(32),
      color: '#212529',
      textAlign: 'center',
      lineHeight: this.px(28),
    };
  }

  public buttonContainer(): React.CSSProperties {
    return {
      display: 'flex',
      justifyContent: 'center',
      gap: this.px(60),
      marginTop: this.px(10),
    };
  }

  public button(): React.CSSProperties {
    return {
      fontFamily: 'NeoDunggeunmo',
      fontSize: this.px(51),
      width: this.px(386),
      height: this.px(136),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
    };
  }

  public toolTipBox(): React.CSSProperties {
    return {
      position: 'absolute',
      bottom: `calc(100% + ${this.px(16)})`,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: `${this.px(12)} ${this.px(24)}`,
      backgroundColor: '#e76e55',
      color: 'white',
      borderRadius: this.px(4),
      fontSize: this.px(24),
      whiteSpace: 'nowrap',
      zIndex: 1000,
      pointerEvents: 'none',
    };
  }

  public toolTipDownArrow(): React.CSSProperties {
    return {
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      border: `${this.px(10)} solid transparent`,
      borderTopColor: '#e76e55',
    };
  }
}

const BaseRankedResult: React.FC<BaseRankedResultProps> = ({
  onReplay,
  onLobby,
  ratio: propRatio,
  title,
  renderPlayerSubline,
}) => {
  const { playSFX } = useSFXContext();
  const ratio =
    propRatio ??
    ((window as Window & { __GAME_RATIO?: number }).__GAME_RATIO || 1);
  const styles = useMemo(() => new ResultStyleBuilder(ratio), [ratio]);
  const result = useGameStore((s) => s.gameResults) ?? [];

  const isHost = isPlayerHost();
  const [showReplayTooltip, setShowReplayTooltip] = useState(false);
  const [showLobbyTooltip, setShowLobbyTooltip] = useState(false);
  const [showDisconnectTooltip, setShowDisconnectTooltip] = useState<
    'replay' | 'lobby' | null
  >(null);
  const isSocketDisconnected = useGameStore((s) => s.isSocketDisconnected);

  const playerRanks = result.reduce<number[]>((ranks, player, idx) => {
    if (idx === 0) return [1];
    const prevScore = result[idx - 1].reportCard.score;
    return [
      ...ranks,
      player.reportCard.score === prevScore ? ranks[idx - 1] : idx + 1,
    ];
  }, []);

  const playerSublines = renderPlayerSubline
    ? result.map((player) => renderPlayerSubline(player))
    : null;
  const hasSubline =
    playerSublines?.some(
      (subline) => subline !== null && subline !== undefined && subline !== '',
    ) ?? false;

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
      <div style={styles.overlay()}>
        <div
          className="nes-container is-rounded"
          style={{
            ...styles.container(),
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <h1 style={styles.title()}>{title}</h1>
          <div style={styles.rankContainer()}>
            {result.map((player, idx) => {
              const height = getRankHeight(playerRanks[idx]) * ratio;
              const crown = getCrownProps(playerRanks[idx]);
              return (
                <div
                  key={idx}
                  style={{
                    ...styles.rankItem(),
                    marginLeft: idx === 0 ? 0 : -5 * ratio,
                  }}
                >
                  {crown.visible && (
                    <CrownSvg
                      style={{
                        ...styles.crown(),
                        marginTop: 0,
                        marginBottom: 3 * ratio,
                      }}
                      fill={crown.fill}
                    />
                  )}
                  <div
                    style={{
                      ...styles.playerName(),
                      marginTop: 0,
                      fontSize: getNameFontSize(player.playerName.length),
                      whiteSpace: 'nowrap',
                      maxWidth: '210px',
                      textAlign: 'center',
                    }}
                  >
                    {player.playerName}
                  </div>
                  <div
                    style={{
                      ...styles.rankBar(),
                      height: `${height}px`,
                      backgroundColor: player.color,
                    }}
                  >
                    <div style={styles.score()}>{player.reportCard.score}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {hasSubline && playerSublines && (
            <div style={styles.sublineRow()}>
              {playerSublines.map((subline, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.sublineItem(),
                    marginLeft: idx === 0 ? 0 : -5 * ratio,
                  }}
                >
                  {subline ?? ''}
                </div>
              ))}
            </div>
          )}
          <div style={styles.buttonContainer()}>
            {/* REPLAY 버튼 */}
            <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() =>
                !isHost && !isSocketDisconnected && setShowReplayTooltip(true)
              }
              onMouseLeave={() => {
                setShowReplayTooltip(false);
                setShowDisconnectTooltip(null);
              }}
            >
              <button
                type="button"
                className="nes-btn is-primary"
                style={styles.button()}
                onClick={() => {
                  if (isSocketDisconnected) {
                    setShowDisconnectTooltip('replay');
                    return;
                  }
                  if (!isHost) return;
                  playSFX('buttonClick');
                  onReplay();
                }}
                onMouseEnter={() => {
                  if (isHost && !isSocketDisconnected) playSFX('buttonHover');
                }}
                disabled={!isHost && !isSocketDisconnected}
              >
                REPLAY
              </button>
              {showReplayTooltip && !isHost && !isSocketDisconnected && (
                <div style={styles.toolTipBox()}>
                  방장만 해당 작업을 수행할 수 있습니다.
                  <div style={styles.toolTipDownArrow()} />
                </div>
              )}
              {showDisconnectTooltip === 'replay' && (
                <div style={styles.toolTipBox()}>
                  서버와 연결이 끊겼어요. 연결을 위해서 재접속해주세요.
                  <div style={styles.toolTipDownArrow()} />
                </div>
              )}
            </div>

            {/* LOBBY 버튼 */}
            <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() =>
                !isHost && !isSocketDisconnected && setShowLobbyTooltip(true)
              }
              onMouseLeave={() => {
                setShowLobbyTooltip(false);
                setShowDisconnectTooltip(null);
              }}
            >
              <button
                type="button"
                className="nes-btn is-primary"
                style={styles.button()}
                onClick={() => {
                  if (isSocketDisconnected) {
                    setShowDisconnectTooltip('lobby');
                    return;
                  }
                  if (!isHost) return;
                  playSFX('buttonClick');
                  onLobby();
                }}
                onMouseEnter={() => {
                  if (isHost && !isSocketDisconnected) playSFX('buttonHover');
                }}
                disabled={!isHost && !isSocketDisconnected}
              >
                LOBBY
              </button>
              {showLobbyTooltip && !isHost && !isSocketDisconnected && (
                <div style={styles.toolTipBox()}>
                  방장만 해당 작업을 수행할 수 있습니다.
                  <div style={styles.toolTipDownArrow()} />
                </div>
              )}
              {showDisconnectTooltip === 'lobby' && (
                <div style={styles.toolTipBox()}>
                  서버와 연결이 끊겼어요. 연결을 위해서 재접속해주세요.
                  <div style={styles.toolTipDownArrow()} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BaseRankedResult;
