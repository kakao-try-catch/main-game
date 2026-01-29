/**
 * 사운드 설정 파일
 * 게임별/화면별 BGM과 SFX를 중앙에서 관리합니다.
 *
 * 사운드 추가 방법:
 * 1. assets/sounds 폴더에 파일 추가
 * 2. 이 파일에서 import
 * 3. BGM_CONFIG 또는 SFX_CONFIG에 추가
 */

// ============= BGM Imports =============
import appleGameBGM from '../assets/sounds/BGM/applegamebgm.mp3';
// TODO: 나중에 추가
// import lobbyBGM from '../assets/sounds/lobby.mp3';
// import flappyBirdBGM from '../assets/sounds/flappybird.mp3';
// import minesweeperBGM from '../assets/sounds/minesweeper.mp3';

// ============= SFX Imports =============
// 사과 게임 SFX
import appleDropSound from '../assets/sounds/SFX/appleDrop.mp3';
import gameStartSound from '../assets/sounds/SFX/gameStart.mp3';
import gameEndSound from '../assets/sounds/SFX/gameResult.mp3';

// 공통 UI SFX
import buttonClickSound from '../assets/sounds/SFX/buttonClick.mp3';
import buttonHoverSound from '../assets/sounds/SFX/buttonHover.mp3';

// 플래피버드 SFX
import flappyJumpSound from '../assets/sounds/SFX/flappyJump.mp3';
import flappyStrikeSound from '../assets/sounds/SFX/flappybirdStrike.mp3';
import flappyScoreSound from '../assets/sounds/SFX/flappyScore.mp3';
// TODO: 나중에 추가
// import flappyHitSound from '../assets/sounds/SFX/flappyHit.mp3';

// 지뢰찾기 SFX
// import mineClickSound from '../assets/sounds/SFX/mineClick.mp3';
import mineExplodeSound from '../assets/sounds/SFX/mine.mp3';
import mineFlagSound from '../assets/sounds/SFX/flag.mp3';

// ============= Type Definitions =============

export interface SoundConfig {
  file: string;
  volume?: number;
  startTime?: number;
}

// BGM 이름 타입 (게임/화면별)
export type BGMName =
  | 'lobby' // 로비 BGM
  | 'appleGame' // 사과 게임 BGM
  | 'flappyBird' // 플래피버드 BGM (추후 추가)
  | 'minesweeper'; // 지뢰찾기 BGM (추후 추가)

// SFX 카테고리별 타입
export type SFXName =
  // 공통 UI SFX
  | 'buttonClick'
  | 'buttonHover'

  // 사과 게임 SFX
  | 'appleDrop'
  | 'appleGameStart'
  | 'appleGameEnd'

  // 플래피버드 SFX
  | 'flappyJump'
  | 'flappyStrike'
  | 'flappyScore'

  // 지뢰찾기 SFX
  | 'mineExplode'
  | 'mineFlag';

// 플래피버드 SFX (추후 추가)
// | 'flappyHit'

// 지뢰찾기 SFX (추후 추가)
// | 'mineClick'
// | 'mineExplode'

// ============= BGM Configuration =============

export const BGM_CONFIG: Record<BGMName, SoundConfig> = {
  lobby: {
    file: appleGameBGM, // TODO: 로비 전용 BGM으로 교체 필요
    volume: 0.6,
  },
  appleGame: {
    file: appleGameBGM,
    volume: 1.0,
  },
  flappyBird: {
    file: appleGameBGM, // TODO: 플래피버드 BGM 추가 필요
    volume: 0.8,
  },
  minesweeper: {
    file: appleGameBGM, // TODO: 지뢰찾기 BGM 추가 필요
    volume: 0.8,
  },
};

// ============= SFX Configuration =============

export const SFX_CONFIG: Record<SFXName, SoundConfig> = {
  // 공통 UI 효과음
  buttonClick: {
    file: buttonClickSound,
    volume: 1.0,
    startTime: 0.2,
  },
  buttonHover: {
    file: buttonHoverSound,
    volume: 1.0,
    startTime: 0,
  },

  // 사과 게임 효과음
  appleDrop: {
    file: appleDropSound,
    volume: 0.7,
    startTime: 0,
  },
  appleGameStart: {
    file: gameStartSound,
    volume: 0.8,
    startTime: 0,
  },
  appleGameEnd: {
    file: gameEndSound,
    volume: 0.8,
    startTime: 0,
  },

  // 플래피버드 효과음
  flappyJump: {
    file: flappyJumpSound,
    volume: 1.5,
    startTime: 0,
  },
  flappyStrike: {
    file: flappyStrikeSound,
    volume: 0.8,
    startTime: 0,
  },
  flappyScore: {
    file: flappyScoreSound,
    volume: 0.7,
    startTime: 0,
  },

  // 지뢰찾기 효과음
  mineExplode: {
    file: mineExplodeSound,
    volume: 0.9,
    startTime: 0.11,
  },
  mineFlag: {
    file: mineFlagSound,
    volume: 0.7,
    startTime: 0,
  },

  // TODO: 플래피버드 효과음 추가
  // flappyHit: { file: flappyHitSound, volume: 0.8 },

  // TODO: 지뢰찾기 효과음 추가
  // mineClick: { file: mineClickSound, volume: 0.6 },
};

// ============= Helper Functions =============

/**
 * 게임 이름으로 BGM 이름 가져오기
 */
export function getBGMNameByGame(gameId: string): BGMName {
  const mapping: Record<string, BGMName> = {
    lobby: 'lobby',
    apple: 'appleGame',
    flappy: 'flappyBird',
    minesweeper: 'minesweeper',
  };

  return mapping[gameId] || 'lobby';
}

/**
 * 화면별 기본 BGM 가져오기
 */
export function getDefaultBGMForScreen(
  screen: 'landing' | 'lobby' | 'game',
): BGMName {
  const mapping: Record<string, BGMName> = {
    landing: 'lobby',
    lobby: 'lobby',
    game: 'appleGame', // 기본값, 실제로는 선택한 게임에 따라 달라짐
  };

  return mapping[screen] || 'lobby';
}
