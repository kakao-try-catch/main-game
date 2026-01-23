/**
 * 플래피버드 게임 프리셋 타입 정의
 */

/** 파이프 속도 프리셋 (이동 속도) */
export type PipeSpeedPreset = 'slow' | 'normal' | 'fast' | 'manual';

/** 파이프 좌우 간격 프리셋 */
export type PipeSpacingPreset = 'narrow' | 'normal' | 'wide' | 'manual';

/** 파이프 상하 간격 프리셋 (통과 공간) */
export type PipeGapPreset = 'narrow' | 'normal' | 'wide';

/** 파이프 넓이(두께) 프리셋 */
export type PipeWidthPreset = 'narrow' | 'normal' | 'wide';

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
}

/** 프리셋에서 실제 게임 설정으로 변환 */
export interface ResolvedFlappyBirdConfig {
  pipeSpeed: number;
  pipeSpacing: number;
  pipeGap: number;
  pipeWidth: number;
}

/** 기본 프리셋 */
export const DEFAULT_FLAPPYBIRD_PRESET: FlappyBirdGamePreset = {
  pipeSpeed: 'normal',
  pipeSpacing: 'normal',
  pipeGap: 'normal',
  pipeWidth: 'normal',
};

/** 프리셋을 실제 게임 설정으로 변환하는 헬퍼 함수 */
export function resolveFlappyBirdPreset(
  preset: FlappyBirdGamePreset,
): ResolvedFlappyBirdConfig {
  // 1. 파이프 속도 결정
  let pipeSpeed: number;
  switch (preset.pipeSpeed) {
    case 'slow':
      pipeSpeed = 2;
      break;
    case 'normal':
      pipeSpeed = 3;
      break;
    case 'fast':
      pipeSpeed = 5;
      break;
    case 'manual':
      pipeSpeed = preset.manualSpeed ?? 3;
      break;
  }

  // 2. 파이프 좌우 간격 결정
  let pipeSpacing: number;
  switch (preset.pipeSpacing) {
    case 'narrow':
      pipeSpacing = 200;
      break;
    case 'normal':
      pipeSpacing = 300;
      break;
    case 'wide':
      pipeSpacing = 400;
      break;
    case 'manual':
      pipeSpacing = preset.manualSpacing ?? 400;
      break;
  }

  // 3. 파이프 상하 간격 (통과 공간) 결정
  let pipeGap: number;
  switch (preset.pipeGap) {
    case 'narrow':
      pipeGap = 120;
      break;
    case 'normal':
      pipeGap = 150;
      break;
    case 'wide':
      pipeGap = 200;
      break;
  }

  // 4. 파이프 넓이 (두께) 결정
  let pipeWidth: number;
  switch (preset.pipeWidth) {
    case 'narrow':
      pipeWidth = 60;
      break;
    case 'normal':
      pipeWidth = 80;
      break;
    case 'wide':
      pipeWidth = 100;
      break;
  }

  return {
    pipeSpeed,
    pipeSpacing,
    pipeGap,
    pipeWidth,
  };
}
