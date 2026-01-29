// todo: merge
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import React, { useState } from 'react';
// import 'nes.css/css/nes.min.css';
// import { useSFXContext } from '../../../contexts/SFXContext';
// import { type PlayerData } from '../../../../../common/src/packets';
// import { useGameStore, isPlayerHost } from '../../../store/gameStore';
import React from 'react';
import type { PlayerResultData, GameType } from '../../types/common';
import type { PlayerId } from '../../types/flappybird.types';
import AppleResult, { type AppleResultProps } from './AppleResult';
import FlappyBirdResult, {
  type FlappyBirdResultProps,
} from './FlappyBirdResult';
import MineSweeperResult, {
  type MineSweeperResultProps,
} from './MineSweeperResult';

type ResultPropsByGame = {
  apple: AppleResultProps;
  minesweeper: MineSweeperResultProps;
  flappy: FlappyBirdResultProps;
};

type GameResultRenderableProps<
  T extends keyof ResultPropsByGame = keyof ResultPropsByGame,
> = { gameType: T } & ResultPropsByGame[T];

type RankedResultPayload = {
  players: PlayerResultData[];
};

type FlappyResultPayload = {
  finalScore: number;
  reason: 'pipe_collision' | 'ground_collision';
  collidedPlayerId?: PlayerId;
  players: PlayerResultData[];
};

export interface GameResultManagerProps {
  currentGameType?: GameType;
  gameEnded: boolean;
  finalPlayers: PlayerResultData[];
  flappyGameEnded: boolean;
  flappyFinalData: FlappyResultPayload | null;
  onReplay: () => void;
  onLobby: () => void;
  ratio?: number;
}

// // 이미 정렬된 거 받음. 필요 시 서버로 얘를 옮기기
// function calculateRanks(players: PlayerData[]): RankedPlayer[] {
//   // if (players.length === 0) return [];
//   // const sortedPlayers = [...players].sort((a, b) => {
//   //   if (b.reportCard.score !== a.reportCard.score)
//   //     return b.reportCard.score - a.reportCard.score;
//   //   return a.playerIndex - b.playerIndex;
//   // });
//   // const rankedPlayers: RankedPlayer[] = [];
//   // let currentRank = 1;
//   // for (let i = 0; i < sortedPlayers.length; i++) {
//   //   const player = sortedPlayers[i];
//   //   if (
//   //     i > 0 &&
//   //     sortedPlayers[i - 1].reportCard.score !== player.reportCard.score
//   //   ) {
//   //     currentRank = i + 1;
//   //   }
//   //   rankedPlayers.push({ ...player, rank: currentRank });
//   // }
//   // return rankedPlayers;
// }

// function getRankHeight(rank: number): number {
//   const heights: Record<number, number> = { 1: 246, 2: 186, 3: 126, 4: 76 };
//   return heights[rank] || 76;
// }

// function getCrownProps(rank: number): { visible: boolean; fill: string } {
//   if (rank === 1) return { visible: true, fill: '#FAA629' };
//   if (rank === 2) return { visible: true, fill: '#A7AFB3' };
//   return { visible: false, fill: 'none' };
// }

// const GameResult: React.FC<GameResultProps> = ({
//   onReplay,
//   onLobby,
//   ratio: propRatio,
//   title = 'APPLE GAME TOGETHER', // 기본값: 사과 게임 타이틀
// }) => {
//   const { playSFX } = useSFXContext();
//   // 기준 해상도 대비 현재 비율 (사과 게임과 동일)
//   const ratio = propRatio ?? ((window as any).__GAME_RATIO || 1);
//   const result = useGameStore((s) => s.gameResults) ?? [];
//   // const rankedPlayers = calculateRanks(players);

//   // 방장 여부 확인
//   const isHost = isPlayerHost();
//   const [showReplayTooltip, setShowReplayTooltip] = useState(false);
//   const [showLobbyTooltip, setShowLobbyTooltip] = useState(false);

//   // 닉네임 길이에 따라 폰트 크기 조절
//   const getNameFontSize = (nameLength: number) => {
//     if (nameLength <= 3) return '48px';
//     if (nameLength <= 5) return '40px';
//     if (nameLength <= 7) return '34px';
//     return '28px'; // 8자
//   };

//   return (
//     <>
//       <style>
//         {`
//           .nes-btn:disabled {
//             cursor: not-allowed;
//             opacity: 0.6;
//             pointer-events: none;
//           }
//           .nes-btn:disabled:active {
//             box-shadow: none;
//             transform: none;
//           }
//         `}
//       </style>
//       <div style={getOverlayStyle()}>
//         <div
//           className="nes-container is-rounded"
//           style={{
//             ...getContainerStyle(ratio),
//             position: 'absolute',
//             top: '50%',
//             left: '50%',
//             transform: 'translate(-50%, -50%)',
//           }}
//         >
//           <h1 style={getTitleStyle(ratio)}>{title}</h1>
//           <div style={getRankContainerStyle(ratio)}>
//             {result.map((player, idx) => {
//               const rank = idx + 1;
//               const height = getRankHeight(rank) * ratio;
//               const crown = getCrownProps(rank);
//               return (
//                 <div
//                   key={`player-${rank}`}
//                   style={{
//                     ...getRankItemStyle(ratio),
//                     marginLeft: idx === 0 ? 0 : -5 * ratio,
//                   }}
//                 >
//                   {crown.visible && (
//                     <CrownSvg
//                       style={{
//                         ...getCrownStyle(ratio),
//                         marginTop: 0,
//                         marginBottom: 3 * ratio,
//                       }}
//                       fill={crown.fill}
//                     />
//                   )}
//                   <div
//                     style={{
//                       ...getPlayerNameStyle(ratio),
//                       marginTop: 0,
//                       fontSize: getNameFontSize(player.playerName.length),
//                       whiteSpace: 'nowrap',
//                       maxWidth: '210px',
//                       textAlign: 'center',
//                     }}
//                   >
//                     {player.playerName}
//                   </div>
//                   <div
//                     style={{
//                       ...getRankBarStyle(ratio),
//                       height: `${height}px`,
//                       backgroundColor: player.color,
//                     }}
//                   >
//                     <div style={getScoreStyle(ratio)}>
//                       {player.reportCard.score}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//           <div style={getButtonContainerStyle(ratio)}>
//             <div
//               style={{ position: 'relative', display: 'inline-block' }}
//               onMouseEnter={() => !isHost && setShowReplayTooltip(true)}
//               onMouseLeave={() => setShowReplayTooltip(false)}
//             >
//               <button
//                 type="button"
//                 className="nes-btn is-primary"
//                 style={getButtonStyle(ratio)}
//                 onClick={() => {
//                   if (!isHost) return;
//                   playSFX('buttonClick');
//                   onReplay();
//                 }}
//                 onMouseEnter={() => {
//                   if (isHost) playSFX('buttonHover');
//                 }}
//                 disabled={!isHost}
//               >
//                 REPLAY
//               </button>
//               {showReplayTooltip && !isHost && (
//                 <div
//                   style={{
//                     position: 'absolute',
//                     bottom: `calc(100% + ${10 * ratio}px)`,
//                     left: '50%',
//                     transform: 'translateX(-50%)',
//                     padding: `${8 * ratio}px ${16 * ratio}px`,
//                     backgroundColor: '#e76e55',
//                     color: 'white',
//                     borderRadius: `${4 * ratio}px`,
//                     fontSize: `${14 * ratio}px`,
//                     whiteSpace: 'nowrap',
//                     zIndex: 1000,
//                     pointerEvents: 'none',
//                   }}
//                 >
//                   방장만 해당 작업을 수행할 수 있습니다.
//                   <div
//                     style={{
//                       position: 'absolute',
//                       top: '100%',
//                       left: '50%',
//                       transform: 'translateX(-50%)',
//                       border: `${6 * ratio}px solid transparent`,
//                       borderTopColor: '#e76e55',
//                     }}
//                   />
//                 </div>
//               )}
//             </div>
//             <div
//               style={{ position: 'relative', display: 'inline-block' }}
//               onMouseEnter={() => !isHost && setShowLobbyTooltip(true)}
//               onMouseLeave={() => setShowLobbyTooltip(false)}
//             >
//               <button
//                 type="button"
//                 className="nes-btn is-primary"
//                 style={getButtonStyle(ratio)}
//                 onClick={() => {
//                   if (!isHost) return;
//                   playSFX('buttonClick');
//                   onLobby();
//                 }}
//                 onMouseEnter={() => {
//                   if (isHost) playSFX('buttonHover');
//                 }}
//                 disabled={!isHost}
//               >
//                 LOBBY
//               </button>
//               {showLobbyTooltip && !isHost && (
//                 <div
//                   style={{
//                     position: 'absolute',
//                     bottom: `calc(100% + ${10 * ratio}px)`,
//                     left: '50%',
//                     transform: 'translateX(-50%)',
//                     padding: `${8 * ratio}px ${16 * ratio}px`,
//                     backgroundColor: '#e76e55',
//                     color: 'white',
//                     borderRadius: `${4 * ratio}px`,
//                     fontSize: `${14 * ratio}px`,
//                     whiteSpace: 'nowrap',
//                     zIndex: 1000,
//                     pointerEvents: 'none',
//                   }}
//                 >
//                   방장만 해당 작업을 수행할 수 있습니다.
//                   <div
//                     style={{
//                       position: 'absolute',
//                       top: '100%',
//                       left: '50%',
//                       transform: 'translateX(-50%)',
//                       border: `${6 * ratio}px solid transparent`,
//                       borderTopColor: '#e76e55',
//                     }}
//                   />
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
const RESULT_COMPONENTS = {
  apple: AppleResult,
  minesweeper: MineSweeperResult,
  flappy: FlappyBirdResult,
} as const;

class GameResultManagerModel {
  constructor(private props: GameResultManagerProps) {}

  private createRankedPayload():
    | GameResultRenderableProps<'apple'>
    | GameResultRenderableProps<'minesweeper'>
    | null {
    const {
      currentGameType,
      gameEnded,
      finalPlayers,
      onReplay,
      onLobby,
      ratio,
    } = this.props;
    if (!gameEnded) return null;
    if (currentGameType !== 'apple' && currentGameType !== 'minesweeper') {
      return null;
    }
    const payload: RankedResultPayload = { players: finalPlayers };
    return {
      gameType: currentGameType,
      ...payload,
      onReplay,
      onLobby,
      ratio,
    };
  }

  private createFlappyPayload(): GameResultRenderableProps<'flappy'> | null {
    const { flappyGameEnded, flappyFinalData, onReplay, onLobby, ratio } =
      this.props;
    if (!flappyGameEnded || !flappyFinalData) return null;
    const payload: FlappyResultPayload = { ...flappyFinalData };
    return {
      gameType: 'flappy',
      ...payload,
      onReplay,
      onLobby,
      ratio,
    };
  }

  public buildRenderableProps(): GameResultRenderableProps | null {
    return this.createFlappyPayload() ?? this.createRankedPayload();
  }
}

const GameResult: React.FC<GameResultManagerProps> = (props) => {
  const model = new GameResultManagerModel(props);
  const renderProps = model.buildRenderableProps();
  if (!renderProps) return null;
  const Component = RESULT_COMPONENTS[
    renderProps.gameType
  ] as React.ComponentType<ResultPropsByGame[typeof renderProps.gameType]>;
  return (
    <Component
      {...(renderProps as ResultPropsByGame[keyof ResultPropsByGame])}
    />
  );
};

export default GameResult;
