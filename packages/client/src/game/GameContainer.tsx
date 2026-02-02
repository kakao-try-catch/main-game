import { useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import Phaser from 'phaser';
import AppleGameScene from './scene/apple/AppleGameScene';
import { BootScene } from './scene/apple/BootScene';
import FlappyBirdsScene from './scene/flappybirds/FlappyBirdsScene';
import MineSweeperScene from './scene/minesweeper/MineSweeperScene';
import type { FlappyBirdGamePreset } from '../../../common/src/config';
import { type MineSweeperGamePreset } from './types/minesweeper.types';
import type { PlayerData, PlayerResultData } from './types/common';
import type { PlayerId, GameOverEvent } from './types/flappybird.types';
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameConfig';
import { GameType } from '../../../common/src/config.ts';

type SceneConstructor = new (...args: any[]) => Phaser.Scene;

interface ConfigDetails {
  sceneName: string;
  readonly sceneClasses: readonly SceneConstructor[];
  maxWidth: number;
  maxHeight: number;
  backgroundColor: string;
}

// 게임 설정 상수 분리
// todo 다 BootScene이 공통
const GAME_CONFIGS: Record<GameType, ConfigDetails> = {
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
  onMinesweeperScoreUpdate?: (data: {
    playerIndex: number;
    scoreChange: number;
    newScore: number;
    reason: string;
  }) => void; // 지뢰찾기 점수 업데이트
  onFlagCountUpdate?: (flagCounts: Record<string, number>) => void; // 지뢰찾기 깃발 카운트 업데이트
  onMinesweeperTileReveal?: () => void; // 지뢰찾기 타일 열기 사운드
  onMinesweeperMineExplode?: () => void; // 지뢰찾기 지뢰 폭발 사운드
  onMinesweeperFlagPlaced?: () => void; // 지뢰찾기 깃발 설치 사운드
  playerCount?: number;
  players?: PlayerData[];
  flappyPreset?: FlappyBirdGamePreset;
  minesweeperPreset?: MineSweeperGamePreset;
  onFlappyJump?: () => void;
  onFlappyStrike?: () => void;
  onFlappyScore?: () => void;
  onGameOver?: (data: { reason: string; finalScore: number }) => void;
  onGameEnd?: (data: any) => void;
}

// todo gametype GameType으로 처리하기
type FlappyCollisionReason = GameOverEvent['reason'];

export type GameEndEvent =
  | {
      gameType: 'apple' | 'minesweeper';
      players: PlayerResultData[];
    }
  | {
      gameType: 'flappy';
      finalScore: number;
      reason: FlappyCollisionReason;
      collidedPlayerId: PlayerId;
      players: PlayerResultData[];
    };

export const GameContainer: React.FC<GameContainerProps> = ({
  gameType,
  onGameReady,
  onMinesweeperScoreUpdate,
  onFlagCountUpdate,
  onMinesweeperTileReveal,
  onMinesweeperMineExplode,
  onMinesweeperFlagPlaced,
  playerCount = 4,
  players = [],
  flappyPreset,
  minesweeperPreset,
  onFlappyJump,
  onFlappyStrike,
  onFlappyScore,
  onGameOver,
  onGameEnd,
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
      (window as any).__GAME_RATIO = ratio;
    };

    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, [config]);

  // 게임 초기화
  useEffect(() => {
    if (!config || gameRef.current || !parentRef.current) return;

    (window as any).__GAME_RATIO = layout.ratio;

    // 씬 인스턴스 생성 (BootScene에 다음 씬 이름 전달)
    const scenes = config.sceneClasses.map((SceneClass) => {
      if (SceneClass === (BootScene as any)) {
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
    };

    const game = new Phaser.Game(gameConfig);
    gameRef.current = game;

    // 비활성 탭에서도 게임 계속 실행 (멀티플레이어 동기화를 위해 필수)
    game.events.on('blur', () => {
      game.loop.wake();
    });
    game.events.on('hidden', () => {
      game.loop.wake();
    });
    game.sound.pauseOnBlur = false;

    onGameReady?.(game);

    game.events.once('ready', () => {
      const targetScene = game.scene.getScene(config.sceneName);
      if (!targetScene) return;

      // 이벤트 리스너 등록
      if (gameType === GameType.APPLE_GAME) {
        // todo
      } else if (gameType === GameType.FLAPPY_BIRD) {
        if (onFlappyJump) targetScene.events.on('flappyJump', onFlappyJump);
        if (onFlappyStrike)
          targetScene.events.on('flappyStrike', onFlappyStrike);
        if (onFlappyScore) targetScene.events.on('flappyScore', onFlappyScore);
      } else if (gameType === GameType.MINESWEEPER) {
        // 지뢰찾기 점수 업데이트 이벤트
        if (onMinesweeperScoreUpdate) {
          targetScene.events.on(
            'scoreUpdate',
            (data: {
              playerIndex: number;
              scoreChange: number;
              newScore: number;
              reason: string;
            }) => {
              onMinesweeperScoreUpdate(data);
            },
          );
        }

        if (onGameOver) {
          targetScene.events.on(
            'game_over',
            (data: { reason: FlappyCollisionReason; finalScore: number }) => {
              onGameOver(data);
            },
          );
        }

        if (onMinesweeperTileReveal) {
          targetScene.events.on('minesweeperTileReveal', () => {
            onMinesweeperTileReveal();
          });
        }

        if (onMinesweeperMineExplode) {
          targetScene.events.on('minesweeperMineExplode', () => {
            onMinesweeperMineExplode();
          });
        }

        if (onMinesweeperFlagPlaced) {
          targetScene.events.on('minesweeperFlagPlaced', () => {
            onMinesweeperFlagPlaced();
          });
        }

        if (onGameEnd) {
          targetScene.events.on(
            'gameEnd',
            (data: { players: PlayerResultData[] }) => {
              onGameEnd({
                gameType: 'minesweeper',
                players: data.players,
              });
            },
          );
        }

        if (onFlagCountUpdate) {
          targetScene.events.on(
            'flagCountUpdate',
            (data: Record<string, number>) => {
              onFlagCountUpdate(data);
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
        console.log('[GameContainer] 게임 정리 시작');
        game.destroy(true);
        gameRef.current = null;
        console.log('[GameContainer] 게임 정리 완료');
      } catch (error) {
        console.error('[GameContainer] 정리 중 오류:', error);
        gameRef.current = null;
      }
    };
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
      });
    }
  }, [playerCount, players, flappyPreset, config, gameType]);

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
