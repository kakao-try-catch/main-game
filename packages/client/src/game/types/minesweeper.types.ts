/**
 * 지뢰찾기 게임 타입 정의
 */

// 프리셋 re-export
export {
  type MapSizePreset,
  type DifficultyPreset,
  type MineSweeperGamePreset,
  type ResolvedMineSweeperConfig,
  DEFAULT_MINESWEEPER_PRESET,
  DEFAULT_RESOLVED_CONFIG,
  resolveMineSweeperPreset,
} from './minesweeperPresets';

// 플레이어 ID
export type PlayerId = string;

// 타일 상태
export enum TileState {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  FLAGGED = 'flagged',
}

// 서버 내부용 타일 데이터 (지뢰 정보 포함)
export interface ServerTileData {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: TileState;
  revealedBy: PlayerId | null;
  flaggedBy: PlayerId | null;
}

// 클라이언트용 타일 데이터 (REVEALED 전까지 지뢰 정보 숨김)
export interface ClientTileData {
  row: number;
  col: number;
  state: TileState;
  // REVEALED 상태일 때만 제공
  isMine?: boolean;
  adjacentMines?: number;
  revealedBy: PlayerId | null;
  flaggedBy: PlayerId | null;
}

// 하위 호환성을 위한 alias
export type TileData = ServerTileData;

// 플레이어 점수 데이터
export interface PlayerScoreData {
  playerId: PlayerId;
  playerName: string;
  playerColor: string;
  score: number;
  tilesRevealed: number;
  minesHit: number;
  flagsPlaced: number;
}

// 게임 설정
export interface MineSweeperConfig {
  gridCols: number;
  gridRows: number;
  mineCount: number;
  // 점수 설정
  tileRevealScore: number;
  minePenalty: number;
  flagCorrectBonus: number;
  flagWrongPenalty: number;
  minScore: number;
}

import { DEFAULT_RESOLVED_CONFIG } from './minesweeperPresets';

// 기본 게임 설정 (DEFAULT_MINESWEEPER_PRESET 기반)
export const DEFAULT_MINESWEEPER_CONFIG: MineSweeperConfig = {
  gridCols: DEFAULT_RESOLVED_CONFIG.gridCols,
  gridRows: DEFAULT_RESOLVED_CONFIG.gridRows,
  mineCount: DEFAULT_RESOLVED_CONFIG.mineCount,
  tileRevealScore: 1,
  minePenalty: -20,
  flagCorrectBonus: 10,
  flagWrongPenalty: -10,
  minScore: Number.NEGATIVE_INFINITY, // 음수 허용 (지뢰 많이 밟으면 마이너스)
};

// ===== 소켓 이벤트 타입 =====

// 클라이언트 -> 서버 이벤트 타입
export type ClientEventType = 'reveal_tile' | 'toggle_flag';

// 타일 열기 요청
export interface RevealTileRequest {
  playerId: PlayerId;
  row: number;
  col: number;
}

// 깃발 토글 요청
export interface ToggleFlagRequest {
  playerId: PlayerId;
  row: number;
  col: number;
}

// 서버 -> 클라이언트 이벤트

// 타일 상태 업데이트
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

// 게임 초기화 이벤트 (게임 시작 시 전체 맵 전송 - 지뢰 정보 제외)
export interface GameInitEvent {
  config: MineSweeperConfig;
  tiles: ClientTileData[][];
  players: PlayerScoreData[];
  remainingMines: number;
  timestamp: number;
}

// 남은 지뢰 수 업데이트 이벤트
export interface RemainingMinesUpdateEvent {
  remainingMines: number;
  timestamp: number;
}

// 점수 업데이트 이벤트
export interface ScoreUpdateEvent {
  playerId: PlayerId;
  scoreChange: number;
  newScore: number;
  position: { row: number; col: number };
  reason: 'safe_tile' | 'flood_fill' | 'mine_hit';
  timestamp: number;
}
