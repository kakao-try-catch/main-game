/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useLayoutEffect } from 'react';
import Phaser from 'phaser';
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
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // 게임 타입별 설정
  const isValidGameType = gameType === 'apple' || gameType === 'flappy';
  const config = isValidGameType
    ? gameType === 'apple'
      ? {
          sceneName: 'AppleGameScene',
          sceneClasses: [BootScene, AppleGameScene],
          maxWidth: 1379,
          maxHeight: 859,
          backgroundColor: '#FFFFFF',
          ratioKey: '__APPLE_GAME_RATIO' as const,
          preset: applePreset,
        }
      : {
          sceneName: 'FlappyBirdsScene',
          sceneClasses: [FlappyBirdsScene],
          maxWidth: 1440,
          maxHeight: 896,
          backgroundColor: '#46d1fd',
          ratioKey: '__FLAPPY_GAME_RATIO' as const,
          preset: flappyPreset,
        }
    : null;

  const sceneName = config?.sceneName || '';
  const sceneClasses = config?.sceneClasses || [];
  const maxWidth = config?.maxWidth || 800;
  const maxHeight = config?.maxHeight || 600;
  const backgroundColor = config?.backgroundColor || '#000000';
  const ratioKey = config?.ratioKey || ('__GAME_RATIO' as const);
  const preset = config?.preset;

  // 리사이즈 시 비율 업데이트
  useLayoutEffect(() => {
    if (!isValidGameType) return;
    function updateRatio() {
      if (parentRef.current) {
        const width = Math.min(parentRef.current.clientWidth, maxWidth);
        const ratio = width / maxWidth;
        (window as any)[ratioKey] = ratio;
      }
    }
    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, [maxWidth, ratioKey, isValidGameType]);

  // 게임 초기화 (한 번만)
  useEffect(() => {
    if (!isValidGameType || gameRef.current || !parentRef.current) return;

    let parentWidth = parentRef.current?.offsetWidth || 0;
    let parentHeight = parentRef.current?.offsetHeight || 0;
    if (!parentWidth || !parentHeight) {
      parentWidth = window.innerWidth;
      parentHeight = window.innerHeight;
    }

    parentWidth = Math.min(parentWidth, maxWidth);
    parentHeight = Math.min(parentHeight, maxHeight);
    let ratio = Math.min(parentWidth / maxWidth, parentHeight / maxHeight);
    if (!ratio || ratio <= 0) ratio = 1;
    (window as any)[ratioKey] = ratio;

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: maxWidth * ratio,
      height: maxHeight * ratio,
      parent: parentRef.current,
      backgroundColor,
      scene: sceneClasses,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false },
      },
    };

    const game = new Phaser.Game(gameConfig);
    gameRef.current = game;

    if (onGameReady) {
      onGameReady(game);
    }

    game.events.once('ready', () => {
      const targetScene = game.scene.getScene(sceneName);
      if (targetScene) {
        // 이벤트 리스너 등록 (게임 생성 시점에 한 번만)
        if (gameType === 'apple') {
          if (onAppleScored) {
            const scoredHandler = (data: { points: number }) => {
              console.log('🍎 appleScored event received:', data);
              onAppleScored(data.points);
            };
            targetScene.events.on('appleScored', scoredHandler);
          }

          if (onGameEnd) {
            const gameEndHandler = (data: { players: PlayerResultData[] }) => {
              console.log('🏁 gameEnd event received:', data);
              onGameEnd(data.players);
            };
            targetScene.events.on('gameEnd', gameEndHandler);
          }
        } else if (gameType === 'flappy' && onGameOver) {
          const gameOverHandler = (data: {
            reason: string;
            finalScore: number;
          }) => {
            console.log('💀 game_over event received:', data);
            onGameOver(data);
          };
          targetScene.events.on('game_over', gameOverHandler);
        }

        // 씬에 플레이어 데이터 전달
        const emitPlayerData = () => {
          targetScene?.events.emit('updatePlayers', {
            playerCount,
            players,
            currentPlayerIndex,
            preset,
          });
        };

        if (targetScene.scene.isActive()) {
          emitPlayerData();
        } else {
          targetScene.events.once('create', emitPlayerData);
        }
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidGameType, onGameReady, onAppleScored]);

  // 게임 준비 후 플레이어 데이터 업데이트
  useEffect(() => {
    if (!gameRef.current || !isValidGameType) return;
    const scene = gameRef.current.scene.getScene(sceneName);
    if (scene) {
      scene.events.emit('updatePlayers', {
        playerCount,
        players,
        currentPlayerIndex,
        preset,
      });
    }
  }, [
    playerCount,
    players,
    currentPlayerIndex,
    preset,
    sceneName,
    isValidGameType,
  ]);
  const aspectRatio = maxWidth / maxHeight;
  const vw = Math.min(window.innerWidth, maxWidth);
  const vh = Math.min(window.innerHeight * 0.8, maxHeight);
  let width = vw;
  let height = vw / aspectRatio;
  if (height > vh) {
    height = vh;
    width = vh * aspectRatio;
  }
  const ratio = width / maxWidth;

  useLayoutEffect(() => {
    if (!isValidGameType) return;
    (window as any)[ratioKey] = ratio;
  }, [ratio, ratioKey, isValidGameType]);

  // 구현되지 않은 게임 타입
  if (!isValidGameType) {
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

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    maxWidth: '100%',
    maxHeight: '100%',
    minWidth: '320px',
    minHeight: '200px',
    margin: '0 auto',
    display: 'block',
    background: backgroundColor,
    position: 'relative',
    border: '4px solid #fff',
  };

  const gameId = gameType === 'apple' ? 'apple-game' : 'flappy-game';

  return <div ref={parentRef} id={gameId} style={containerStyle} />;
};
