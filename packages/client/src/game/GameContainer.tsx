import { useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import Phaser from 'phaser';
import AppleGameScene from './scene/apple/AppleGameScene';
import { BootScene } from './scene/apple/BootScene';
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import type { AppleGamePreset } from './types/AppleGamePreset';
import type { FlappyBirdGamePreset } from './types/FlappyBirdGamePreset';
import type { PlayerData, PlayerResultData, GameType } from './types/common';
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameConfig';

// 게임 설정 상수 분리
const GAME_CONFIGS = {
  apple: {
    sceneName: 'AppleGameScene',
    sceneClasses: [BootScene, AppleGameScene] as const,
    maxWidth: GAME_WIDTH,
    maxHeight: GAME_HEIGHT,
    backgroundColor: '#FFFFFF',
  },
  flappy: {
    sceneName: 'FlappyBirdsScene',
    sceneClasses: [FlappyBirdsScene] as const,
    maxWidth: GAME_WIDTH,
    maxHeight: GAME_HEIGHT,
    backgroundColor: '#46d1fd',
  },
};

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

  const isValidGameType = gameType === 'apple' || gameType === 'flappy';
  const config = isValidGameType ? GAME_CONFIGS[gameType] : null;
  const preset = gameType === 'apple' ? applePreset : flappyPreset;

  // 레이아웃 계산 (useMemo로 최적화)
  const layout = useMemo(() => {
    if (!config) return { width: 800, height: 600, ratio: 1 };

    const aspectRatio = config.maxWidth / config.maxHeight;
    const vw = Math.min(window.innerWidth, config.maxWidth);
    const vh = Math.min(window.innerHeight * 0.8, config.maxHeight);

    let width = vw;
    let height = vw / aspectRatio;

    if (height > vh) {
      height = vh;
      width = vh * aspectRatio;
    }

    const ratio = width / config.maxWidth;

    return { width, height, ratio };
  }, [config]);

  // 비율 업데이트 (리사이즈 포함)
  useLayoutEffect(() => {
    if (!config) return;

    const updateRatio = () => {
      const aspectRatio = config.maxWidth / config.maxHeight;
      const vw = Math.min(window.innerWidth, config.maxWidth);
      const vh = Math.min(window.innerHeight * 0.8, config.maxHeight);

      let width = vw;
      const height = vw / aspectRatio;

      if (height > vh) {
        width = vh * aspectRatio;
      }

      const ratio = width / config.maxWidth;
      window.__GAME_RATIO = ratio;
    };

    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, [config]);

  // 게임 초기화
  useEffect(() => {
    if (!config || gameRef.current || !parentRef.current) return;

    window.__GAME_RATIO = layout.ratio;

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: config.maxWidth * layout.ratio,
      height: config.maxHeight * layout.ratio,
      parent: parentRef.current,
      backgroundColor: config.backgroundColor,
      scene: [...config.sceneClasses],
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    const game = new Phaser.Game(gameConfig);
    gameRef.current = game;

    onGameReady?.(game);

    game.events.once('ready', () => {
      const targetScene = game.scene.getScene(config.sceneName);
      if (!targetScene) return;

      // 이벤트 리스너 등록
      if (gameType === 'apple') {
        if (onAppleScored) {
          targetScene.events.on('appleScored', (data: { points: number }) => {
            console.log('🍎 appleScored event received:', data);
            onAppleScored(data.points);
          });
        }

        if (onGameEnd) {
          targetScene.events.on(
            'gameEnd',
            (data: { players: PlayerResultData[] }) => {
              console.log('🏁 gameEnd event received:', data);
              onGameEnd(data.players);
            },
          );
        }
      } else if (gameType === 'flappy' && onGameOver) {
        targetScene.events.on(
          'game_over',
          (data: { reason: string; finalScore: number }) => {
            console.log('💀 game_over event received:', data);
            onGameOver(data);
          },
        );
      }

      // 씬에 플레이어 데이터 전달
      const emitPlayerData = () => {
        targetScene.events.emit('updatePlayers', {
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
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, layout.ratio, gameType]);

  // 플레이어 데이터 업데이트
  useEffect(() => {
    if (!gameRef.current || !config) return;

    const scene = gameRef.current.scene.getScene(config.sceneName);
    if (scene) {
      scene.events.emit('updatePlayers', {
        playerCount,
        players,
        currentPlayerIndex,
        preset,
      });
    }
  }, [playerCount, players, currentPlayerIndex, preset, config]);

  // 구현되지 않은 게임 타입
  if (!config) {
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

  return (
    <div
      ref={parentRef}
      id={gameType === 'apple' ? 'apple-game' : 'flappy-game'}
      style={{
        width: `${layout.width}px`,
        height: `${layout.height}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        minWidth: '320px',
        minHeight: '200px',
        margin: '0 auto',
        display: 'block',
        background: config.backgroundColor,
        position: 'relative',
      }}
    />
  );
};
