import { useGameContainer } from './hooks/useGameContainer';
import { AppleGameScene } from './scene/apple/AppleGameScene';
import { BootScene } from './scene/apple/BootScene';
import type { AppleGamePreset } from './types/AppleGamePreset';
import type { PlayerData, PlayerResultData } from './types/common';

interface AppleGameContainerProps {
  onGameReady?: (game: Phaser.Game) => void;
  onAppleScored?: (points: number) => void;
  onGameEnd?: (players: PlayerResultData[]) => void;
  playerCount?: number;
  players?: PlayerData[];
  currentPlayerIndex?: number;
  preset?: AppleGamePreset;
}

export const AppleGameContainer: React.FC<AppleGameContainerProps> = ({
  onGameReady,
  onAppleScored,
  onGameEnd,
  playerCount = 4,
  players = [],
  currentPlayerIndex = 0,
  preset,
}) => {
  const { parentRef, containerStyle } = useGameContainer(
    {
      sceneName: 'AppleGameScene',
      sceneClasses: [BootScene, AppleGameScene],
      maxWidth: 1379,
      maxHeight: 859,
      backgroundColor: '#FFFFFF',
      ratioKey: '__APPLE_GAME_RATIO',
      onGameReady,
      setupSceneEvents: (scene) => {
        if (onAppleScored) {
          const appleScoredHandler = (data: { points: number }) => {
            onAppleScored(data.points);
          };
          scene.events.on('appleScored', appleScoredHandler);

          if (onGameEnd) {
            const gameEndHandler = (data: { players: PlayerResultData[] }) => {
              onGameEnd(data.players);
            };
            scene.events.on('gameEnd', gameEndHandler);
          }

          return () => {
            scene.events.off('appleScored', appleScoredHandler);
            if (onGameEnd) {
              scene.events.off('gameEnd');
            }
          };
        }
      },
    },
    { playerCount, players, currentPlayerIndex, preset },
  );

  return <div ref={parentRef} id="apple-game" style={containerStyle} />;
};
