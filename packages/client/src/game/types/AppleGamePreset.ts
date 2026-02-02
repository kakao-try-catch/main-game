/**
 * 사과 게임 프리셋 타입 정의 (레거시 - Lobby UI 호환용)
 *
 * 참고: 실제 게임 설정은 gameStore.gameConfig (AppleGameConfig)를 사용합니다.
 * 이 파일의 타입들은 Lobby UI 호환성을 위해 유지됩니다.
 * 새 코드에서는 common/src/appleGameUtils.ts의 resolveAppleGameConfig()를 사용하세요.
 */

/** 사과 생성 개수 프리셋 (S, M, L만 지원) */
export type AppleGridSize = 'S' | 'M' | 'L';

/** 제한 시간 프리셋 */
export type TimeLimit = 90 | 120 | 180 | 'manual';

/** 사과 숫자 범위 프리셋 (1-9, 1-5만 지원) */
export type NumberRange = '1-9' | '1-5';

/** 사과 게임 프리셋 설정 (간소화됨) */
export interface AppleGamePreset {
  /** 사과 생성 개수 (S: 16×8, M: 20×10, L: 30×15) */
  gridSize: AppleGridSize;

  /** 제한 시간 (초) */
  timeLimit: TimeLimit;

  /** 사과 숫자 범위 */
  numberRange: NumberRange;

  /** 0 포함 여부 */
  includeZero: boolean;
}

/** 기본 프리셋 */
export const DEFAULT_PRESET: AppleGamePreset = {
  gridSize: 'M',
  timeLimit: 120,
  numberRange: '1-9',
  includeZero: false,
};
