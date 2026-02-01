// ========== GAME TYPE ==========
export enum GameType {
  APPLE_GAME = 'APPLE_GAME',
  FLAPPY_BIRD = 'FLAPPY_BIRD',
  MINESWEEPER = 'MINESWEEPER',
}

// ========== APPLE GAME CONFIG =========
export enum MapSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export interface AppleGameConfig {
  mapSize: MapSize;
  time: number;
  generation: number;
  zero: boolean;
}

export interface AppleGameRenderConfig {
  gridCols: number; // 가로 사과 개수 (17)
  gridRows: number; // 세로 사과 개수 (10)
  minNumber: number; // 최소 숫자 (1)
  maxNumber: number; // 최대 숫자 (9)
  totalTime: number; // 전체 게임 시간 (110초)
  maxPlayers: number; // 플레이어 수 (4)
  includeZero: boolean; // 0생성 여부
}

export const APPLE_GAME_CONFIG: AppleGameRenderConfig = {
  gridCols: 17,
  gridRows: 10,
  minNumber: 1,
  maxNumber: 9,
  totalTime: 110,
  maxPlayers: 4,
  includeZero: false,
};

// ========== FLAPPY BIRD CONFIG ==========
export type PipeSpeedPreset = 'slow' | 'normal' | 'fast' | 'manual';
export type PipeSpacingPreset = 'narrow' | 'normal' | 'wide' | 'manual';
export type PipeGapPreset = 'narrow' | 'normal' | 'wide';
export type PipeWidthPreset = 'narrow' | 'normal' | 'wide';
export type RopeLengthPreset = 'short' | 'normal' | 'long';

/** 플래피버드 게임 프리셋 설정 */
export interface FlappyBirdGamePreset {
  /** 파이프 속도 (이동 속도) */
  pipeSpeed: PipeSpeedPreset;
  /** 수동 설정 시 속도 */
  manualSpeed?: number;

  /** 파이프 좌우 간격 */
  pipeSpacing: PipeSpacingPreset;
  /** 수동 설정 시 간격 (픽셀) */
  manualSpacing?: number;

  /** 파이프 상하 간격 (통과 공간) */
  pipeGap: PipeGapPreset;

  /** 파이프 넓이 (두께) */
  pipeWidth: PipeWidthPreset;

  /** 밧줄 길이 */
  ropeLength?: RopeLengthPreset;

  /** 모두 묶기 (3인 이상일 때 폐쇄형 도형으로 연결) */
  connectAll?: boolean;
}

export interface ResolvedFlappyBirdConfig {
  pipeSpeed: number;
  pipeSpacing: number;
  pipeGap: number;
  pipeWidth: number;
  ropeLength: number;
  flapBoostBase: number; // 점프 시 기본 전진력 (pipeSpeed에 비례)
  flapBoostRandom: number; // 점프 시 랜덤 추가 전진력 범위 (pipeSpeed에 비례)
  connectAll: boolean; // 모두 묶기 (3인 이상일 때 폐쇄형 도형으로 연결)
}

/** 프리셋을 실제 게임 설정으로 변환하는 헬퍼 함수 */
export function resolveFlappyBirdPreset(
  preset: FlappyBirdGamePreset,
): ResolvedFlappyBirdConfig {
  // 1. 파이프 속도 결정 (main 브랜치 기준: 1.5)
  let pipeSpeed: number;
  switch (preset.pipeSpeed) {
    case 'slow':
      pipeSpeed = 1.5;
      break;
    case 'normal':
      pipeSpeed = 2.0;
      break;
    case 'fast':
      pipeSpeed = 2.5;
      break;
    case 'manual':
      pipeSpeed = preset.manualSpeed ?? 2.0;
      break;
  }

  // 2. 파이프 좌우 간격 결정 (main 브랜치 기준: 400)
  let pipeSpacing: number;
  switch (preset.pipeSpacing) {
    case 'narrow':
      pipeSpacing = 300;
      break;
    case 'normal':
      pipeSpacing = 600;
      break;
    case 'wide':
      pipeSpacing = 800;
      break;
    case 'manual':
      pipeSpacing = preset.manualSpacing ?? 400;
      break;
  }

  // 3. 파이프 상하 간격 (통과 공간) 결정 (main 브랜치 기준: 200)
  let pipeGap: number;
  switch (preset.pipeGap) {
    case 'narrow':
      pipeGap = 200;
      break;
    case 'normal':
      pipeGap = 250;
      break;
    case 'wide':
      pipeGap = 300;
      break;
  }

  // 4. 파이프 넓이 (두께) 결정 (main 브랜치 기준: 120)
  let pipeWidth: number;
  switch (preset.pipeWidth) {
    case 'narrow':
      pipeWidth = 80;
      break;
    case 'normal':
      pipeWidth = 120;
      break;
    case 'wide':
      pipeWidth = 160;
      break;
  }

  // 5. 점프 시 전진력 결정 (pipeSpeed에 비례)
  // normal(2.0) 기준 0.3 + 0~0.7 = 0.3 ~ 1.0 범위
  const speedRatio = pipeSpeed / 2.0; // normal 기준
  const flapBoostBase = 0.5 * speedRatio;
  const flapBoostRandom = 0.5 * speedRatio;

  // 6. 밧줄 길이 결정 (main 브랜치 기준: 100)
  let ropeLength: number;
  switch (preset.ropeLength ?? 'normal') {
    case 'short':
      ropeLength = 80;
      break;
    case 'normal':
      ropeLength = 100;
      break;
    case 'long':
      ropeLength = 140;
      break;
  }

  return {
    pipeSpeed,
    pipeSpacing,
    pipeGap,
    pipeWidth,
    ropeLength,
    flapBoostBase,
    flapBoostRandom,
    connectAll: preset.connectAll ?? false,
  };
}

// ========== UNION TYPE ==========
export type GameConfig = AppleGameConfig | FlappyBirdGamePreset; // 통일된 그리드 크기 매핑 (클라이언트 기준)

export const MAP_SIZE_TO_GRID = {
  [MapSize.SMALL]: { cols: 16, rows: 8 },
  [MapSize.MEDIUM]: { cols: 20, rows: 10 },
  [MapSize.LARGE]: { cols: 30, rows: 15 },
} as const;
// AppleGameConfig -> AppleGameRenderConfig 변환

export function resolveAppleGameConfig(
  cfg: AppleGameConfig,
): AppleGameRenderConfig {
  const grid =
    MAP_SIZE_TO_GRID[cfg.mapSize] ?? MAP_SIZE_TO_GRID[MapSize.MEDIUM];
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

export function sanitizeTime(rawTime: any): number {
  const timeNum =
    typeof rawTime === 'number' && isFinite(rawTime)
      ? rawTime
      : APPLE_GAME_CONFIG.totalTime;
  return Math.max(10, Math.min(300, Math.floor(timeNum)));
}
