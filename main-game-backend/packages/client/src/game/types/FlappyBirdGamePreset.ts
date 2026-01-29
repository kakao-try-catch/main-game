/**
 * 플래피버드 게임 프리셋 타입 정의
 */

/** 파이프 속도 프리셋 */
export type PipeSpeedPreset = 'slow' | 'normal' | 'fast' | 'manual';

/** 파이프 간격 프리셋 */
export type PipeSpacingPreset = 'narrow' | 'normal' | 'wide' | 'manual';

/** 플래피버드 게임 프리셋 설정 */
export interface FlappyBirdGamePreset {
  /** 파이프 속도 */
  pipeSpeed: PipeSpeedPreset;
  /** 수동 설정 시 속도 */
  manualSpeed?: number;

  /** 파이프 간격 */
  pipeSpacing: PipeSpacingPreset;
  /** 수동 설정 시 간격 (픽셀) */
  manualSpacing?: number;
}

/** 프리셋에서 실제 게임 설정으로 변환 */
export interface ResolvedFlappyBirdConfig {
  pipeSpeed: number;
  pipeSpacing: number;
}

/** 기본 프리셋 */
export const DEFAULT_FLAPPYBIRD_PRESET: FlappyBirdGamePreset = {
  pipeSpeed: 'normal',
  pipeSpacing: 'normal',
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

  // 2. 파이프 간격 결정
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

  return {
    pipeSpeed,
    pipeSpacing,
  };
}
