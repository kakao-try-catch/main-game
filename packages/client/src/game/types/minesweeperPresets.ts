/**
 * 지뢰찾기 게임 프리셋 타입 정의
 */

/** 맵 크기 프리셋 */
export type MapSizePreset = 'small' | 'medium' | 'large' | 'manual';

/** 난이도 프리셋 (지뢰 비율) */
export type DifficultyPreset = 'easy' | 'normal' | 'hard';

/** 지뢰찾기 게임 프리셋 설정 */
export interface MineSweeperGamePreset {
  /** 맵 크기 */
  mapSize: MapSizePreset;
  /** 수동 설정 시 열(가로) 수 */
  manualCols?: number;
  /** 수동 설정 시 행(세로) 수 */
  manualRows?: number;

  /** 난이도 (지뢰 비율) */
  difficulty: DifficultyPreset;
  /** 수동 설정 시 지뢰 비율 (0~1) */
  manualMineRatio?: number;
}

/** 프리셋에서 실제 게임 설정으로 변환 */
export interface ResolvedMineSweeperConfig {
  gridCols: number;
  gridRows: number;
  mineCount: number;
  mineRatio: number;
}

/** 기본 프리셋 */
export const DEFAULT_MINESWEEPER_PRESET: MineSweeperGamePreset = {
  mapSize: 'medium',
  difficulty: 'normal',
};

/** 프리셋을 실제 게임 설정으로 변환하는 헬퍼 함수 */
export function resolveMineSweeperPreset(
  preset: MineSweeperGamePreset,
): ResolvedMineSweeperConfig {
  // 1. 맵 크기 결정
  let gridCols: number;
  let gridRows: number;
  switch (preset.mapSize) {
    case 'small':
      gridCols = 20;
      gridRows = 10;
      break;
    case 'medium':
      gridCols = 40;
      gridRows = 20;
      break;
    case 'large':
      gridCols = 60;
      gridRows = 30;
      break;
    case 'manual':
      gridCols = preset.manualCols ?? 40;
      gridRows = preset.manualRows ?? 20;
      break;
  }

  // 2. 지뢰 비율 결정
  let mineRatio: number;
  if (preset.manualMineRatio !== undefined) {
    mineRatio = preset.manualMineRatio;
  } else {
    switch (preset.difficulty) {
      case 'easy':
        mineRatio = 0.15; // 15%
        break;
      case 'normal':
        mineRatio = 0.2; // 20%
        break;
      case 'hard':
        mineRatio = 0.25; // 25%
        break;
    }
  }

  // 3. 지뢰 개수 계산
  const totalTiles = gridCols * gridRows;
  const mineCount = Math.floor(totalTiles * mineRatio);

  return {
    gridCols,
    gridRows,
    mineCount,
    mineRatio,
  };
}

/** 기본 해결된 설정 (DEFAULT_MINESWEEPER_PRESET 기반) */
export const DEFAULT_RESOLVED_CONFIG = resolveMineSweeperPreset(
  DEFAULT_MINESWEEPER_PRESET,
);
