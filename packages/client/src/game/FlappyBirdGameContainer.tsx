import { useGameContainer } from './hooks/useGameContainer';
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import type { FlappyBirdGamePreset } from './types/FlappyBirdGamePreset';
import type { PlayerData } from './types/common';

interface FlappyBirdGameContainerProps {
  onGameReady?: (game: Phaser.Game) => void;
  onGameOver?: (data: { reason: string; finalScore: number }) => void;
  playerCount?: number;
  players?: PlayerData[];
  currentPlayerIndex?: number;
  preset?: FlappyBirdGamePreset;
}

export const FlappyBirdGameContainer: React.FC<
  FlappyBirdGameContainerProps
> = ({
  onGameReady,
  onGameOver,
  playerCount = 4,
  players = [],
  currentPlayerIndex = 0,
  preset,
}) => {
  const { parentRef, containerStyle } = useGameContainer(
    {
      sceneName: 'FlappyBirdsScene',
      sceneClasses: [FlappyBirdsScene],
      maxWidth: 1440,
      maxHeight: 896,
      backgroundColor: '#46d1fd',
      ratioKey: '__FLAPPY_GAME_RATIO',
      onGameReady,
      setupSceneEvents: (scene) => {
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
    },
    { playerCount, players, currentPlayerIndex, preset },
  );

  return <div ref={parentRef} id="flappy-game" style={containerStyle} />;
};
