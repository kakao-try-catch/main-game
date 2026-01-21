/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useLayoutEffect } from 'react';
import Phaser from 'phaser';

interface GameContainerConfig {
  sceneName: string;
  sceneClasses: (typeof Phaser.Scene)[];
  maxWidth: number;
  maxHeight: number;
  backgroundColor: string;
  ratioKey: '__APPLE_GAME_RATIO' | '__FLAPPY_GAME_RATIO';
  onGameReady?: (game: Phaser.Game) => void;
  setupSceneEvents?: (scene: Phaser.Scene) => void | (() => void);
}

interface GameContainerData {
  playerCount: number;
  players: any[];
  currentPlayerIndex: number;
  preset: any;
}

export function useGameContainer(
  config: GameContainerConfig,
  data: GameContainerData,
) {
  const {
    sceneName,
    sceneClasses,
    maxWidth,
    maxHeight,
    backgroundColor,
    ratioKey,
    onGameReady,
    setupSceneEvents,
  } = config;

  const { playerCount, players, currentPlayerIndex, preset } = data;
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene(sceneName);
    if (scene) {
      scene.events.emit('updatePlayers', {
        playerCount,
        players,
        currentPlayerIndex,
        preset,
      });
    }
  }, [playerCount, players, currentPlayerIndex, preset, sceneName]);

  useLayoutEffect(() => {
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
  }, [maxWidth, ratioKey]);

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;

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

    let targetScene: Phaser.Scene | null = null;
    let cleanup: (() => void) | void;

    game.events.once('ready', () => {
      targetScene = game.scene.getScene(sceneName);
      if (targetScene) {
        if (targetScene.scene.isActive()) {
          targetScene.events.emit('updatePlayers', {
            playerCount,
            players,
            currentPlayerIndex,
            preset,
          });
        } else {
          targetScene.events.once('create', () => {
            targetScene?.events.emit('updatePlayers', {
              playerCount,
              players,
              currentPlayerIndex,
              preset,
            });
          });
        }

        if (setupSceneEvents && targetScene) {
          cleanup = setupSceneEvents(targetScene);
        }
      }
    });

    return () => {
      if (cleanup) cleanup();
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameReady]);

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
    (window as any)[ratioKey] = ratio;
  }, [ratio, ratioKey]);

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

  return { parentRef, containerStyle };
}
