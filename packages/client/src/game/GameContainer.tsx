/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useLayoutEffect } from 'react';
import Phaser from 'phaser';
// ⭐ 수정: AppleGameScene 대신 FlappyBirdsScene 사용
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import type { AppleGamePreset } from './types/GamePreset';

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
  /** 게임 프리셋 설정 (로비에서 설정) */
  preset?: AppleGamePreset;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({
  onGameReady,
  onAppleScored,
  onGameEnd,
  playerCount = 2,
  players = [],
  currentPlayerIndex = 0,
  preset,
}) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // ⭐ 수정: 플래피버드 화면 크기
  const MAX_WIDTH = 1440;
  const MAX_HEIGHT = 896;

  // 플레이어 데이터가 변경되면 씬에 전달
  useEffect(() => {
    if (!gameRef.current) return;
    const flappyBirdScene = gameRef.current.scene.getScene('FlappyBirdsScene');
    if (flappyBirdScene) {
      flappyBirdScene.events.emit('updatePlayers', {
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
        (window as Window).__APPLE_GAME_RATIO = ratio;
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
    (window as any).__APPLE_GAME_RATIO = ratio;

    // ⭐ 수정: Matter.js 물리 엔진 사용
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: MAX_WIDTH * ratio,
      height: MAX_HEIGHT * ratio,
      parent: parentRef.current,
      backgroundColor: '#46D1FD',
      scene: [FlappyBirdsScene],
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.8 },
          debug: false,
        },
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    if (onGameReady) {
      onGameReady(game);
    }

    // ⭐ 수정: FlappyBirdsScene 사용
    let flappyBirdScene: Phaser.Scene | null = null;
    let appleScoredHandler: ((data: { points: number }) => void) | null = null;

    game.events.once('ready', () => {
      flappyBirdScene = game.scene.getScene('FlappyBirdsScene');
      if (flappyBirdScene) {
        // 씬의 create()가 완료된 후에 이벤트 전달
        if (flappyBirdScene.scene.isActive()) {
          flappyBirdScene.events.emit('updatePlayers', {
            playerCount,
            players,
            currentPlayerIndex,
            preset,
          });
        } else {
          flappyBirdScene.events.once('create', () => {
            flappyBirdScene?.events.emit('updatePlayers', {
              playerCount,
              players,
              currentPlayerIndex,
              preset,
            });
          });
        }

        if (onAppleScored) {
          appleScoredHandler = (data: { points: number }) => {
            onAppleScored(data.points);
          };
          flappyBirdScene.events.on('appleScored', appleScoredHandler);
        }
        if (onGameEnd) {
          flappyBirdScene.events.on(
            'gameEnd',
            (data: { players: PlayerResultData[] }) => {
              onGameEnd(data.players);
            },
          );
        }
      }
    });

    return () => {
      if (flappyBirdScene && appleScoredHandler) {
        flappyBirdScene.events.off('appleScored', appleScoredHandler);
      }
      if (flappyBirdScene) {
        flappyBirdScene.events.off('gameEnd');
      }
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameReady, onAppleScored]);

  // 화면 크기에 따라 1380:862 비율을 유지하는 스타일
  const aspectRatio = MAX_WIDTH / MAX_HEIGHT;
  // 항상 반응형으로 설정, 최대 크기 제한
  const vw = Math.min(window.innerWidth, MAX_WIDTH);
  const vh = Math.min(window.innerHeight - 150, MAX_HEIGHT); // React UI 높이를 고려하여 150px 마진 추가
  let width, height;
  width = vw;
  height = vw / aspectRatio;
  if (height > vh) {
    height = vh;
    width = vh * aspectRatio;
  }
  const ratio = width / MAX_WIDTH;
  // window.__APPLE_GAME_RATIO를 항상 갱신
  useLayoutEffect(() => {
    (window as any).__APPLE_GAME_RATIO = ratio;
  }, [ratio]);
  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: `${MAX_WIDTH}px`,
    maxHeight: `${MAX_HEIGHT}px`,
    minWidth: '320px',
    minHeight: '200px',
    margin: '0 auto',
    display: 'block',
    background: '#222',
    position: 'relative',
  };
  return <div ref={parentRef} id="phaser-game" style={containerStyle} />;
};
