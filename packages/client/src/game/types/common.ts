/**
 * 게임 공통 타입 정의
 * 플레이어 정보, 게임 결과 등 여러 게임에서 공유하는 타입들
 */

// PlayerData는 packets.ts의 공통 규격을 사용
// todo 이거 왜 export 임?
export type { PlayerData } from '../../../../common/src/packets';
import type { PlayerData } from '../../../../common/src/packets';

/** 게임 결과를 위한 플레이어 정보 (playerIndex 포함) */
export interface PlayerResultData extends PlayerData {
  playerIndex: number;
}

/** 현재 사용자 정보 */
export interface CurrentUser {
  id: string;
  playerIndex: number;
  name: string;
  isHost: boolean;
}

/** 로비 플레이어 정보 (score 제외) */
export interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

/** 게임 정보 */
export interface Game {
  id: string;
  name: string;
  thumbnail: string;
}

/** 게임 설정 (각 게임별로 확장 가능) */
export interface GameSettings {
  // 사과게임 설정
  mapSize?: 'small' | 'normal' | 'large' | string;
  timeLimit?: number;
  appleRange?: '1-9' | '1-5' | string;
  includeZero?: boolean;
  // 플래피버드 설정
  pipeGap?: 'narrow' | 'normal' | 'wide'; // 상하 파이프 간격
  pipeWidth?: 'narrow' | 'normal' | 'wide'; // 파이프 넓이
  pipeSpacing?: 'narrow' | 'normal' | 'wide'; // 좌우 파이프 간격
  pipeSpeed?: 'slow' | 'normal' | 'fast'; // 이동 속도
  ropeLength?: 'short' | 'normal' | 'long'; // 밧줄 길이
  connectAll?: boolean; // 모두 묶기 (3인 이상일 때 폐쇄형 도형)
  // 지뢰찾기 설정
  mineRatio?: 'easy' | 'normal' | 'hard'; // 지뢰 비율 (10%, 20%, 30%)
}

/** 공통 상수 */
export const CONSTANTS = {
  /** 플레이어 색상 (들어온 순서대로) */
  PLAYER_COLORS: ['#209cee', '#e76e55', '#92cc41', '#f2d024'],
  /** 최대 플레이어 수 */
  MAX_PLAYERS: 4,
  /** 툴팁 표시 시간 (ms) */
  TOOLTIP_DURATION: 2000,
  /** 최소 제한 시간 (초) */
  MIN_TIME_LIMIT: 30,
  /** 최대 제한 시간 (초) */
  MAX_TIME_LIMIT: 300,
  /** 기본 제한 시간 (초) */
  DEFAULT_TIME_LIMIT: 120,
} as const;

/** 게임 이벤트 데이터 타입 */
export interface GameEventData {
  appleScored?: { points: number };
  gameEnd?: { players: PlayerResultData[] };
  gameOver?: { reason: string; finalScore: number };
  updatePlayers?: {
    playerCount?: number;
    players?: PlayerData[];
    preset?: unknown;
  };
}
