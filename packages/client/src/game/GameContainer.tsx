import { useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import Phaser from 'phaser';
import AppleGameScene from './scene/apple/AppleGameScene';
import { BootScene } from './scene/apple/BootScene';
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import MineSweeperScene from './scene/minesweeper/MineSweeperScene';
import type { FlappyBirdGamePreset } from './types/FlappyBirdGamePreset';
import type { MineSweeperGamePreset } from './types/minesweeper.types';
import type { PlayerResultData } from './types/common';
import type { PlayerId } from './types/flappybird.types';
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameConfig';
import { GameType } from '../../../common/src/config.ts';
import type { PlayerData } from '../../../common/src/packets';

// 게임 설정 상수 분리
const GAME_CONFIGS = {
  [GameType.APPLE_GAME]: {
    sceneName: 'AppleGameScene',
    sceneClasses: [BootScene, AppleGameScene] as const,
    maxWidth: GAME_WIDTH,
    maxHeight: GAME_HEIGHT,
    backgroundColor: '#FFFFFF',
  },
  [GameType.FLAPPY_BIRD]: {
    sceneName: 'FlappyBirdsScene',
    sceneClasses: [BootScene, FlappyBirdsScene] as const,
    maxWidth: GAME_WIDTH,
    maxHeight: GAME_HEIGHT,
    backgroundColor: '#46d1fd',
  },
  [GameType.MINESWEEPER]: {
    sceneName: 'MineSweeperScene',
    sceneClasses: [BootScene, MineSweeperScene] as const,
    maxWidth: GAME_WIDTH,
    maxHeight: GAME_HEIGHT,
    backgroundColor: '#2c3e50',
  },
};

interface GameContainerProps {
  gameType: GameType;
  onGameReady?: (game: Phaser.Game) => void;
  onAppleScored?: (points: number) => void;
  onGameEnd?: (data: GameEndEvent) => void;
  onGameOver?: (data: { reason: string; finalScore: number }) => void;
  onScoreUpdate?: (score: number) => void; // 플래피버드 점수 업데이트
  onFlappyJump?: () => void; // 플래피버드 점프 사운드
  onFlappyStrike?: () => void; // 플래피버드 충돌 사운드
  onFlappyScore?: () => void; // 플래피버드 점수 획득 사운드
  onMinesweeperScoreUpdate?: (data: {
    playerId: string;
    scoreChange: number;
    newScore: number;
    reason: string;
  }) => void; // 지뢰찾기 점수 업데이트
  playerCount?: number;
  players?: PlayerData[];
  flappyPreset?: FlappyBirdGamePreset;
  minesweeperPreset?: MineSweeperGamePreset;
}

export type GameEndEvent =
  | {
      gameType: 'apple' | 'minesweeper';
      players: PlayerResultData[];
    }
  | {
      gameType: 'flappy';
      finalScore: number;
      reason: string;
      collidedPlayerId: PlayerId;
      players: PlayerResultData[];
    };

export const GameContainer: React.FC<GameContainerProps> = ({
  gameType,
  onGameReady,
  onAppleScored,
  onGameEnd,
  onGameOver,
  onScoreUpdate,
  onFlappyJump,
  onFlappyStrike,
  onFlappyScore,
  onMinesweeperScoreUpdate,
  playerCount = 4,
  players = [],
  flappyPreset,
  minesweeperPreset,
}) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const isValidGameType =
    gameType === GameType.APPLE_GAME ||
    gameType === GameType.FLAPPY_BIRD ||
    gameType === GameType.MINESWEEPER;
  const config = isValidGameType ? GAME_CONFIGS[gameType] : null;

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
      (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO = ratio;
    };

    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, [config]);

  // 게임 초기화
  useEffect(() => {
    if (!config || gameRef.current || !parentRef.current) return;

    (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO = layout.ratio;

    // 씬 인스턴스 생성 (BootScene에 다음 씬 이름 전달)
    const scenes = config.sceneClasses.map((SceneClass) => {
      if (SceneClass === BootScene) {
        return new BootScene(config.sceneName);
      }
      return new SceneClass();
    });

    const gameConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: config.maxWidth * layout.ratio,
      height: config.maxHeight * layout.ratio,
      parent: parentRef.current,
      backgroundColor: config.backgroundColor,
      scene: scenes,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      // 비활성 탭/창에서도 게임 루프 계속 실행 (멀티 모니터 지원)
      // @ts-expect-error: Phaser supports this option but type definition is missing
      disableVisibilityChange: true,
    };

    const game = new Phaser.Game(gameConfig);
    gameRef.current = game;

    onGameReady?.(game);

    // todo 얘내 로직들 싹 다 제어해야 함. 클라측 게임 로직인데 너무 강결합되어있음.
    game.events.once('ready', () => {
      const targetScene = game.scene.getScene(config.sceneName);
      if (!targetScene) return;

      // 이벤트 리스너 등록
      if (gameType === GameType.APPLE_GAME) {
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
              onGameEnd({
                gameType: 'apple',
                players: data.players,
              });
            },
          );
        }
      } else if (gameType === GameType.FLAPPY_BIRD) {
        // 플래피버드 점프 사운드 이벤트
        if (onFlappyJump) {
          targetScene.events.on('flappyJump', () => {
            console.log('🦅 flappyJump event received');
            onFlappyJump();
          });
        }

        // 플래피버드 충돌 사운드 이벤트
        if (onFlappyStrike) {
          targetScene.events.on('flappyStrike', () => {
            console.log('💥 flappyStrike event received');
            onFlappyStrike();
          });
        }

        // 플래피버드 점수 획득 사운드 이벤트
        if (onFlappyScore) {
          targetScene.events.on('flappyScore', () => {
            console.log('🎵 flappyScore event received');
            onFlappyScore();
          });
        }

        // 플래피버드 점수 업데이트 이벤트
        if (onScoreUpdate) {
          targetScene.events.on(
            'scoreUpdate',
            (data: { score: number; timestamp: number }) => {
              console.log('📊 scoreUpdate event received:', data);
              onScoreUpdate(data.score);
            },
          );
        }

        // 플래피버드 게임 종료 이벤트
        if (onGameEnd) {
          targetScene.events.on(
            'gameEnd',
            (data: {
              finalScore: number;
              reason: string;
              collidedPlayerId: PlayerId;
              players: PlayerResultData[];
            }) => {
              console.log('🏁 flappy gameEnd event received:', data);
              onGameEnd({
                gameType: 'flappy',
                finalScore: data.finalScore,
                reason: data.reason,
                collidedPlayerId: data.collidedPlayerId,
                players: data.players,
              });
            },
          );
        }

        // 기존 game_over 이벤트 (호환성 유지)
        if (onGameOver) {
          targetScene.events.on(
            'game_over',
            (data: { reason: string; finalScore: number }) => {
              console.log('💀 game_over event received:', data);
              onGameOver(data);
            },
          );
        }
      } else if (gameType === GameType.MINESWEEPER) {
        // 지뢰찾기 점수 업데이트 이벤트
        if (onMinesweeperScoreUpdate) {
          targetScene.events.on(
            'scoreUpdate',
            (data: {
              playerId: string;
              scoreChange: number;
              newScore: number;
              reason: string;
            }) => {
              console.log('💣 minesweeper scoreUpdate event received:', data);
              onMinesweeperScoreUpdate(data);
            },
          );
        }

        // 지뢰찾기 게임 종료 이벤트 (타이머 완료)
        if (onGameEnd) {
          targetScene.events.on(
            'gameEnd',
            (data: { players: PlayerResultData[] }) => {
              console.log('🏁 minesweeper gameEnd event received:', data);
              onGameEnd({
                gameType: 'minesweeper',
                players: data.players,
              });
            },
          );
        }
      }

      // 씬에 플레이어 데이터 전달
      const emitPlayerData = () => {
        targetScene.events.emit('updatePlayers', {
          playerCount,
          players,
          ...(gameType === GameType.FLAPPY_BIRD && flappyPreset
            ? { preset: flappyPreset }
            : {}),
          ...(gameType === GameType.MINESWEEPER && minesweeperPreset
            ? { preset: minesweeperPreset }
            : {}),
        });
      };

      if (targetScene.scene.isActive()) {
        emitPlayerData();
      } else {
        targetScene.events.once('create', emitPlayerData);
      }
    });

    return () => {
      try {
        // 게임 인스턴스 완전 파괴
        console.log('[GameContainer] 게임 정리 시작');
        game.destroy(true);
        gameRef.current = null;
        console.log('[GameContainer] 게임 정리 완료');
      } catch (error) {
        console.error('[GameContainer] 정리 중 오류:', error);
        gameRef.current = null;
      }
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
        ...(gameType === GameType.FLAPPY_BIRD && flappyPreset
          ? { preset: flappyPreset }
          : {}),
        ...(gameType === GameType.MINESWEEPER && minesweeperPreset
          ? { preset: minesweeperPreset }
          : {}),
      });
    }
  }, [playerCount, players, flappyPreset, minesweeperPreset, config, gameType]);

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
      id={`${gameType}-game`}
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
