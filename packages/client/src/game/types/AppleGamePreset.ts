/**
 * 사과 게임 프리셋 타입 정의
 */

/** 사과 생성 개수 프리셋 */
export type AppleGridSize = 'S' | 'M' | 'L' | 'manual';

/** 제한 시간 프리셋 */
export type TimeLimit = 120 | 180 | 240 | 'manual';

/** 사과 숫자 범위 프리셋 */
export type NumberRange = '1-9' | '1-5' | '1-3';

/** 사과 게임 프리셋 설정 */
export interface AppleGamePreset {
  /** 사과 생성 개수 (S: 16×8, M: 20×10, L: 30×15) */
  gridSize: AppleGridSize;
  /** 수동 설정 시 가로 개수 */
  manualCols?: number;
  /** 수동 설정 시 세로 개수 */
  manualRows?: number;

  /** 제한 시간 (초) */
  timeLimit: TimeLimit;
  /** 수동 설정 시 시간 (초) */
  manualTime?: number;

  /** 사과 숫자 범위 */
  numberRange: NumberRange;
  /** 0 포함 여부 */
  includeZero: boolean;
}

/** 프리셋에서 실제 게임 설정으로 변환 */
export interface ResolvedGameConfig {
  gridCols: number;
  gridRows: number;
  totalTime: number;
  minNumber: number;
  maxNumber: number;
}

/** 기본 프리셋 (현재 상태) */
export const DEFAULT_PRESET: AppleGamePreset = {
  gridSize: 'M',
  timeLimit: 120,
  numberRange: '1-9',
  includeZero: false,
};

/** 프리셋을 실제 게임 설정으로 변환하는 헬퍼 함수 */
export function resolvePreset(preset: AppleGamePreset): ResolvedGameConfig {
  // 1. 그리드 크기 결정
  let gridCols: number;
  let gridRows: number;

  switch (preset.gridSize) {
    case 'S':
      gridCols = 16;
      gridRows = 8;
      break;
    case 'M':
      gridCols = 20;
      gridRows = 10;
      break;
    case 'L':
      gridCols = 30;
      gridRows = 15;
      break;
    case 'manual':
      gridCols = preset.manualCols ?? 20;
      gridRows = preset.manualRows ?? 10;
      break;
  }

  // 2. 제한 시간 결정
  let totalTime: number;
  if (preset.timeLimit === 'manual') {
    totalTime = preset.manualTime ?? 120;
  } else {
    totalTime = preset.timeLimit;
  }

  // 3. 숫자 범위 결정
  let minNumber: number;
  let maxNumber: number;

  switch (preset.numberRange) {
    case '1-3':
      minNumber = 1;
      maxNumber = 3;
      break;
    case '1-5':
      minNumber = 1;
      maxNumber = 5;
      break;
    case '1-9':
      minNumber = 1;
      maxNumber = 9;
      break;
  }

  // 4. 0 포함 여부
  if (preset.includeZero) {
    minNumber = 0;
  }

  return {
    gridCols,
    gridRows,
    totalTime,
    minNumber,
    maxNumber,
  };
}
