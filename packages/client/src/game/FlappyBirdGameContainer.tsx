/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useLayoutEffect } from 'react';
import Phaser from 'phaser';
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import type { FlappyBirdGamePreset } from './types/FlappyBirdGamePreset';

export interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

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
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const MAX_WIDTH = 1440;
  const MAX_HEIGHT = 896;

  // 플레이어 데이터가 변경되면 씬에 전달
  useEffect(() => {
    if (!gameRef.current) return;
    const flappyScene = gameRef.current.scene.getScene('FlappyBirdsScene');
    if (flappyScene) {
      flappyScene.events.emit('updatePlayers', {
        playerCount,
        players,
        currentPlayerIndex,
        preset,
      });
    }
  }, [playerCount, players, currentPlayerIndex, preset]);

  // 부모 div 크기 변화 감지 (리사이즈 대응)
  useLayoutEffect(() => {
    function updateRatio() {
      if (parentRef.current) {
        const width = Math.min(parentRef.current.clientWidth, MAX_WIDTH);
        const ratio = width / MAX_WIDTH;
        (window as any).__FLAPPY_GAME_RATIO = ratio;
      }
    }
    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, []);

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;

    // 실제 컨테이너 크기에 맞춰 ratio 계산
    let parentWidth = parentRef.current?.offsetWidth || 0;
    let parentHeight = parentRef.current?.offsetHeight || 0;
    // fallback: window 크기 사용
    if (!parentWidth || !parentHeight) {
      parentWidth = window.innerWidth;
      parentHeight = window.innerHeight;
    }

    parentWidth = Math.min(parentWidth, MAX_WIDTH);
    parentHeight = Math.min(parentHeight, MAX_HEIGHT);
    let ratio = Math.min(parentWidth / MAX_WIDTH, parentHeight / MAX_HEIGHT);
    if (!ratio || ratio <= 0) ratio = 1;
    (window as any).__FLAPPY_GAME_RATIO = ratio;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: MAX_WIDTH * ratio,
      height: MAX_HEIGHT * ratio,
      parent: parentRef.current,
      backgroundColor: '#46d1fd',
      scene: [FlappyBirdsScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false,
        },
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    if (onGameReady) {
      onGameReady(game);
    }

    let flappyScene: Phaser.Scene | null = null;
    let gameOverHandler:
      | ((data: { reason: string; finalScore: number }) => void)
      | null = null;

    game.events.once('ready', () => {
      flappyScene = game.scene.getScene('FlappyBirdsScene');
      if (flappyScene) {
        // 씬의 create()가 완료된 후에 이벤트 전달
        if (flappyScene.scene.isActive()) {
          flappyScene.events.emit('updatePlayers', {
            playerCount,
            players,
            currentPlayerIndex,
            preset,
          });
        } else {
          flappyScene.events.once('create', () => {
            flappyScene?.events.emit('updatePlayers', {
              playerCount,
              players,
              currentPlayerIndex,
              preset,
            });
          });
        }

        if (onGameOver) {
          gameOverHandler = (data: { reason: string; finalScore: number }) => {
            onGameOver(data);
          };
          flappyScene.events.on('game_over', gameOverHandler);
        }
      }
    });

    return () => {
      if (flappyScene && gameOverHandler) {
        flappyScene.events.off('game_over', gameOverHandler);
      }
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameReady, onGameOver]);

  // 화면 크기에 따라 1440:896 비율을 유지하는 스타일
  const aspectRatio = MAX_WIDTH / MAX_HEIGHT;
  const vw = Math.min(window.innerWidth, MAX_WIDTH);
  const vh = Math.min(window.innerHeight * 0.8, MAX_HEIGHT);
  let width, height;
  width = vw;
  height = vw / aspectRatio;
  if (height > vh) {
    height = vh;
    width = vh * aspectRatio;
  }
  const ratio = width / MAX_WIDTH;

  useLayoutEffect(() => {
    (window as any).__FLAPPY_GAME_RATIO = ratio;
  }, [ratio]);

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: '100%',
    maxHeight: '100%',
    minWidth: '320px',
    minHeight: '200px',
    margin: '0 auto',
    display: 'block',
    background: '#46d1fd',
    position: 'relative',
    border: '4px solid #fff',
  };

  return <div ref={parentRef} id="flappy-game" style={containerStyle} />;
};
