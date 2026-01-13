import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { AppleGameScene } from './scene/AppleGameScene';
import { BootScene } from './scene/BootScene';

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void;
  onAppleScored?: (points: number) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ onGameReady, onAppleScored }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1380,
      height: 862,
      parent: parentRef.current,
      backgroundColor: '#282c34',
      scene: [BootScene, AppleGameScene],
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


    game.events.once('ready', () => {
      const appleGameScene = game.scene.getScene('AppleGameScene');
      if (appleGameScene && onAppleScored) {
        appleGameScene.events.on('appleScored', (data: { points: number }) => {
          onAppleScored(data.points);
        });
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [onGameReady, onAppleScored]);

  return <div ref={parentRef} id="phaser-game" />;
};
