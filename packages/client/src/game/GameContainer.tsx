import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { AppleGameScene } from './scene/AppleGameScene';

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ onGameReady }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: parentRef.current,
      backgroundColor: '#282c34',
      scene: [AppleGameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    if (onGameReady) {
      onGameReady(game);
    }

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [onGameReady]);

  return <div ref={parentRef} id="phaser-game" />;
};
