/**
 * 게임 공통 타입 정의
 * 플레이어 정보, 게임 결과 등 여러 게임에서 공유하는 타입들
 */

/** 플레이어 기본 정보 */
export interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

/** 게임 결과를 위한 플레이어 정보 (playerIndex 포함) */
export interface PlayerResultData extends PlayerData {
  playerIndex: number;
}

/** 게임 타입 */
export type GameType = 'apple' | 'flappy' | 'minesweeper';

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
  mapSize?: 'small' | 'normal' | 'large' | string;
  timeLimit?: number;
  appleRange?: '1-9' | '1-5' | string;
  includeZero?: boolean;
}

/** 로비 Props */
export interface LobbyProps {
  currentPlayer: LobbyPlayer;
  onGameStart: (gameType: string, preset: unknown) => void;
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
