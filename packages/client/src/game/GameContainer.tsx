import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { AppleGameScene } from './scene/AppleGameScene';
import { BootScene } from './scene/BootScene';

export interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

interface PlayerResultData {
  id: string;
  name: string;
  score: number;
  color: string;
  playerIndex: number;
}

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void;
  onAppleScored?: (points: number) => void;
  onGameEnd?: (players: PlayerResultData[]) => void;
  playerCount?: number;
  players?: PlayerData[];
  currentPlayerIndex?: number;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ onGameReady, onAppleScored, onGameEnd, playerCount = 4, players = [], currentPlayerIndex = 0 }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // 플레이어 데이터가 변경되면 씬에 전달
  useEffect(() => {
    if (!gameRef.current) return;
    const appleGameScene = gameRef.current.scene.getScene('AppleGameScene');
    if (appleGameScene) {
      appleGameScene.events.emit('updatePlayers', { playerCount, players, currentPlayerIndex });
    }
  }, [playerCount, players, currentPlayerIndex]);

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


    let appleGameScene: Phaser.Scene | null = null;
    let appleScoredHandler: ((data: { points: number }) => void) | null = null;
    
    game.events.once('ready', () => {
      appleGameScene = game.scene.getScene('AppleGameScene');
      if (appleGameScene) {
        // 씬의 create()가 완료된 후에 이벤트 전달
        if (appleGameScene.scene.isActive()) {
          appleGameScene.events.emit('updatePlayers', { playerCount, players, currentPlayerIndex });
        } else {
          appleGameScene.events.once('create', () => {
            appleGameScene?.events.emit('updatePlayers', { playerCount, players, currentPlayerIndex });
          });
        }
        
        if (onAppleScored) {
          appleScoredHandler = (data: { points: number }) => {
            onAppleScored(data.points);
          };
          appleGameScene.events.on('appleScored', appleScoredHandler);
        }
        if (onGameEnd) {
          appleGameScene.events.on('gameEnd', (data: { players: PlayerResultData[] }) => {
            onGameEnd(data.players);
          });
        }
      }
    });
    
    return () => {
      if (appleGameScene && appleScoredHandler) {
        appleGameScene.events.off('appleScored', appleScoredHandler);
      }
      if (appleGameScene) {
        appleGameScene.events.off('gameEnd');
      }
      game.destroy(true);
      gameRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameReady, onAppleScored]);

  return <div ref={parentRef} id="phaser-game" />;
};
