/**
 * 지뢰찾기 게임 타입 정의
 *
 * 공통 타입은 common 패키지에서 import하여 사용합니다.
 * 이 파일은 클라이언트 전용 타입과 re-export를 담당합니다.
 */

import type { PlayerResultData } from './common';

// ========== common 패키지에서 타입 re-export ==========
export {
  // 타일 관련
  TileState,
  type ServerTileData,
  type ClientTileData,
  type PlayerId,
  type PlayerScoreData,

  // 게임 설정 관련
  type MapSizePreset,
  type DifficultyPreset,
  type TimeLimit,
  type MineSweeperGamePreset,
  type MineSweeperConfig,
  type ResolvedMineSweeperConfig,

  // 기본값
  DEFAULT_MINESWEEPER_PRESET,
  DEFAULT_MINESWEEPER_CONFIG,
  DEFAULT_RESOLVED_CONFIG,
  resolveMineSweeperPreset,
} from '../../../../common/src/minesweeperPackets';

// 하위 호환성을 위한 import
import {
  type ServerTileData,
  DEFAULT_RESOLVED_CONFIG,
  type MineSweeperConfig,
  TileState,
  type PlayerId,
} from '../../../../common/src/minesweeperPackets';

// 하위 호환성을 위한 alias
export type TileData = ServerTileData;

// ========== 클라이언트 전용 타입 ==========

/** 지뢰찾기 결과 화면용 플레이어 데이터 */
export interface MineSweeperResultPlayer extends PlayerResultData {
  correctFlags?: number;
  totalFlags?: number;
}

// ========== 하위 호환성을 위한 기본 설정 ==========

/** @deprecated DEFAULT_MINESWEEPER_CONFIG 사용 권장 */
export const DEFAULT_MINESWEEPER_CONFIG_LEGACY: MineSweeperConfig = {
  gridCols: DEFAULT_RESOLVED_CONFIG.gridCols,
  gridRows: DEFAULT_RESOLVED_CONFIG.gridRows,
  mineCount: DEFAULT_RESOLVED_CONFIG.mineCount,
  tileRevealScore: 1,
  minePenalty: -20,
  flagCorrectBonus: 10,
  flagWrongPenalty: -10,
  minScore: Number.NEGATIVE_INFINITY,
};

// ========== 소켓 이벤트 타입 (Mock용 - 추후 제거 예정) ==========

/** 클라이언트 -> 서버 이벤트 타입 */
export type ClientEventType = 'reveal_tile' | 'toggle_flag';

/** 타일 열기 요청 */
export interface RevealTileRequest {
  playerId: string;
  row: number;
  col: number;
}

/** 깃발 토글 요청 */
export interface ToggleFlagRequest {
  playerId: string;
  row: number;
  col: number;
}

// ========== 서버 -> 클라이언트 이벤트 (Mock용 - 추후 제거 예정) ==========

import type {
  ClientTileData,
  PlayerScoreData,
} from '../../../../common/src/minesweeperPackets';

/** 타일 상태 업데이트 */
export interface TileUpdateEvent {
  tiles: {
    row: number;
    col: number;
    state: TileState;
    isMine?: boolean;
    adjacentMines?: number;
    revealedBy?: PlayerId | null;
    flaggedBy?: PlayerId | null;
  }[];
  remainingMines: number;
  timestamp: number;
}

/** 게임 초기화 이벤트 */
export interface GameInitEvent {
  config: MineSweeperConfig;
  tiles: ClientTileData[][];
  players: PlayerScoreData[];
  remainingMines: number;
  timestamp: number;
}

/** 남은 지뢰 수 업데이트 이벤트 */
export interface RemainingMinesUpdateEvent {
  remainingMines: number;
  timestamp: number;
}

/** 점수 업데이트 이벤트 */
export interface ScoreUpdateEvent {
  playerId: PlayerId;
  scoreChange: number;
  newScore: number;
  position: { row: number; col: number };
  reason: 'safe_tile' | 'flood_fill' | 'mine_hit';
  timestamp: number;
}
