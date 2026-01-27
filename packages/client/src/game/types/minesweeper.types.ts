/**
 * 지뢰찾기 게임 타입 정의
 */

// 플레이어 ID
export type PlayerId = string;

// 타일 상태
export enum TileState {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  FLAGGED = 'flagged',
}

// 타일 데이터
export interface TileData {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: TileState;
  revealedBy: PlayerId | null;
  flaggedBy: PlayerId | null;
}

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

// 기본 게임 설정
export const DEFAULT_MINESWEEPER_CONFIG: MineSweeperConfig = {
  gridCols: 30,
  gridRows: 15,
  mineCount: 90,
  tileRevealScore: 1,
  minePenalty: -20,
  flagCorrectBonus: 10,
  flagWrongPenalty: -10,
  minScore: 0,
};

// ===== 소켓 이벤트 타입 =====

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
  timestamp: number;
}

// 게임 초기화 이벤트 (게임 시작 시 전체 맵 전송)
export interface GameInitEvent {
  config: MineSweeperConfig;
  tiles: TileData[][];
  players: PlayerScoreData[];
  timestamp: number;
}
