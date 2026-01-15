/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useLayoutEffect } from 'react';
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
  const MAX_WIDTH = 1379;
  const MAX_HEIGHT = 859;

  // 플레이어 데이터가 변경되면 씬에 전달
  useEffect(() => {
    if (!gameRef.current) return;
    const appleGameScene = gameRef.current.scene.getScene('AppleGameScene');
    if (appleGameScene) {
      appleGameScene.events.emit('updatePlayers', { playerCount, players, currentPlayerIndex });
    }
  }, [playerCount, players, currentPlayerIndex]);

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
    if (gameRef.current || !parentRef.current) {
      // 이미 생성됨
      return;
    }
    const width = Math.min(parentRef.current.clientWidth, MAX_WIDTH);
    const height = Math.min(parentRef.current.clientHeight, MAX_HEIGHT);
    const ratio = width / MAX_WIDTH;
    (window as any).__APPLE_GAME_RATIO = ratio;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width,
      height,
      parent: parentRef.current,
      backgroundColor: '#F6F5F6',
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
    if (onGameReady) onGameReady(game);
    let appleGameScene: Phaser.Scene | null = null;
    let appleScoredHandler: ((data: { points: number }) => void) | null = null;
    game.events.once('ready', () => {
      appleGameScene = game.scene.getScene('AppleGameScene');
      if (appleGameScene) {
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

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;

    // 실제 컨테이너 크기에 맞춰 ratio 계산
    let ratio = 1;
    let parentWidth = parentRef.current?.offsetWidth || 0;
    let parentHeight = parentRef.current?.offsetHeight || 0;
    // fallback: window 크기 사용
    if (!parentWidth || !parentHeight) {
      parentWidth = window.innerWidth;
      parentHeight = window.innerHeight;
    }
    parentWidth = Math.min(parentWidth, MAX_WIDTH);
    parentHeight = Math.min(parentHeight, MAX_HEIGHT);
    ratio = Math.min(parentWidth / MAX_WIDTH, parentHeight / MAX_HEIGHT);
    if (!ratio || ratio <= 0) ratio = 1;
    (window as any).__APPLE_GAME_RATIO = ratio;

    // 디버깅용 프린트
    console.log('[PhaserGame] parent div size:', parentWidth, parentHeight);
    console.log('[PhaserGame] ratio:', ratio);
    console.log('[PhaserGame] Phaser config width/height:', 1380 * ratio, 862 * ratio);
    console.log('[PhaserGame] parentRef.current:', parentRef.current);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1380 * ratio,
      height: 862 * ratio,
      parent: parentRef.current,
      backgroundColor: '#F6F5F6',
      scene: [BootScene, AppleGameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      }
    };

    console.log('[PhaserGame] Phaser.Game 인스턴스 생성 직전');
    const game = new Phaser.Game(config);
    gameRef.current = game;
    console.log('[PhaserGame] Phaser.Game 인스턴스 생성 완료:', game);

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

  // 화면 크기에 따라 1380:862 비율을 유지하는 스타일
  const aspectRatio = MAX_WIDTH / MAX_HEIGHT;
  // 항상 반응형으로 설정, 최대 크기 제한
  const vw = Math.min(window.innerWidth, MAX_WIDTH);
  const vh = Math.min(window.innerHeight - 150, MAX_HEIGHT); // React UI 높이를 고려하여 150px 마진 추가
  let width, height, ratio;
  width = vw;
  height = vw / aspectRatio;
  if (height > vh) {
    height = vh;
    width = vh * aspectRatio;
  }
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
