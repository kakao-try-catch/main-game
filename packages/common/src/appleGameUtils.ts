import {
  MapSize,
  type AppleGameConfig,
  type AppleGameRenderConfig,
  APPLE_GAME_CONFIG,
} from './config';

// 통일된 그리드 크기 매핑 (클라이언트 기준)
export const MAP_SIZE_TO_GRID = {
  [MapSize.SMALL]: { cols: 16, rows: 8 },
  [MapSize.MEDIUM]: { cols: 20, rows: 10 },
  [MapSize.LARGE]: { cols: 30, rows: 15 },
} as const;

// AppleGameConfig -> AppleGameRenderConfig 변환
export function resolveAppleGameConfig(
  cfg: AppleGameConfig,
): AppleGameRenderConfig {
  const grid = MAP_SIZE_TO_GRID[cfg.mapSize] ?? MAP_SIZE_TO_GRID[MapSize.MEDIUM];
  const maxNumber = cfg.generation === 1 ? 5 : 9;

  return {
    gridCols: grid.cols,
    gridRows: grid.rows,
    minNumber: cfg.zero ? 0 : 1,
    maxNumber,
    totalTime: cfg.time,
    maxPlayers: APPLE_GAME_CONFIG.maxPlayers,
    includeZero: cfg.zero,
  };
}
