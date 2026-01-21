import { useGameContainer } from './hooks/useGameContainer';
import type { GameContainerConfig } from './hooks/useGameContainer';
import AppleGameScene from './scene/apple/AppleGameScene';
import { BootScene } from './scene/apple/BootScene';
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import type { AppleGamePreset } from './types/AppleGamePreset';
import type { FlappyBirdGamePreset } from './types/FlappyBirdGamePreset';
import type { PlayerData, PlayerResultData, GameType } from './types/common';

interface GameContainerProps {
  gameType: GameType;
  onGameReady?: (game: Phaser.Game) => void;
  onAppleScored?: (points: number) => void;
  onGameEnd?: (players: PlayerResultData[]) => void;
  onGameOver?: (data: { reason: string; finalScore: number }) => void;
  playerCount?: number;
  players?: PlayerData[];
  currentPlayerIndex?: number;
  applePreset?: AppleGamePreset;
  flappyPreset?: FlappyBirdGamePreset;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  gameType,
  onGameReady,
  onAppleScored,
  onGameEnd,
  onGameOver,
  playerCount = 4,
  players = [],
  currentPlayerIndex = 0,
  applePreset,
  flappyPreset,
}) => {
  // 게임 타입별 설정
  const gameConfig: GameContainerConfig | null =
    gameType === 'apple'
      ? ({
          sceneName: 'AppleGameScene',
          sceneClasses: [BootScene, AppleGameScene],
          maxWidth: 1379,
          maxHeight: 859,
          backgroundColor: '#FFFFFF',
          ratioKey: '__APPLE_GAME_RATIO',
          setupSceneEvents: (scene: Phaser.Scene) => {
            if (onAppleScored) {
              const scoredHandler = (points: number) => {
                onAppleScored(points);
              };
              scene.events.on('apple_scored', scoredHandler);

              const cleanup = () => {
                scene.events.off('apple_scored', scoredHandler);
              };

              if (onGameEnd) {
                const gameEndHandler = (data: PlayerResultData[]) => {
                  onGameEnd(data);
                };
                scene.events.on('game_end', gameEndHandler);
                return () => {
                  cleanup();
                  scene.events.off('game_end', gameEndHandler);
                };
              }

              return cleanup;
            } else if (onGameEnd) {
              const gameEndHandler = (data: PlayerResultData[]) => {
                onGameEnd(data);
              };
              scene.events.on('game_end', gameEndHandler);
              return () => {
                scene.events.off('game_end', gameEndHandler);
              };
            }
          },
        } as GameContainerConfig)
      : gameType === 'flappy'
        ? ({
            sceneName: 'FlappyBirdsScene',
            sceneClasses: [FlappyBirdsScene],
            maxWidth: 1440,
            maxHeight: 896,
            backgroundColor: '#46d1fd',
            ratioKey: '__FLAPPY_GAME_RATIO',
            setupSceneEvents: (scene: Phaser.Scene) => {
              if (onGameOver) {
                const gameOverHandler = (data: {
                  reason: string;
                  finalScore: number;
                }) => {
                  onGameOver(data);
                };
                scene.events.on('game_over', gameOverHandler);

                return () => {
                  scene.events.off('game_over', gameOverHandler);
                };
              }
            },
          } as GameContainerConfig)
        : null;

  const { parentRef, containerStyle } = useGameContainer(
    gameConfig || {
      sceneName: '',
      sceneClasses: [],
      maxWidth: 800,
      maxHeight: 600,
      backgroundColor: '#000000',
      ratioKey: '__GAME_RATIO' as const,
    },
    {
      playerCount,
      players,
      currentPlayerIndex,
      preset: gameType === 'apple' ? applePreset : flappyPreset,
    },
    { enabled: gameConfig !== null, onGameReady },
  );

  // 구현되지 않은 게임
  if (!gameConfig) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          fontFamily: 'NeoDunggeunmo',
          fontSize: '24px',
        }}
      >
        {gameType} 게임은 아직 구현되지 않았습니다.
      </div>
    );
  }

  const gameId =
    gameType === 'apple' ? 'apple-game' : gameType === 'flappy' ? 'flappy-game' : 'game';

  return <div ref={parentRef} id={gameId} style={containerStyle} />;
};
