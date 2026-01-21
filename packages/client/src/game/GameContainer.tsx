import { AppleGameContainer } from './AppleGameContainer';
import { FlappyBirdGameContainer } from './FlappyBirdGameContainer';
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
  if (gameType === 'apple') {
    return (
      <AppleGameContainer
        playerCount={playerCount}
        players={players}
        currentPlayerIndex={currentPlayerIndex}
        preset={applePreset}
        onAppleScored={onAppleScored}
        onGameEnd={onGameEnd}
        onGameReady={onGameReady}
      />
    );
  }

  if (gameType === 'flappy') {
    return (
      <FlappyBirdGameContainer
        playerCount={playerCount}
        players={players}
        currentPlayerIndex={currentPlayerIndex}
        preset={flappyPreset}
        onGameOver={onGameOver}
        onGameReady={onGameReady}
      />
    );
  }

  // Minesweeper or other games not yet implemented
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
};
