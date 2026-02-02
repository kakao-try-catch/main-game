/**
 * 지뢰찾기 멀티플레이어 패킷 인터페이스 정의
 *
 * 이 파일은 서버-클라이언트 간 지뢰찾기 게임 통신에 사용되는
 * 모든 패킷 타입과 관련 인터페이스를 정의합니다.
 */

import { MineSweeperPacketType } from './packets';

// ========== 공통 타입 ==========

/** 플레이어 ID */
export type PlayerId = string;

/** 타일 상태 */
export enum TileState {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  FLAGGED = 'flagged',
}

/** 서버 내부용 타일 데이터 (지뢰 정보 포함 - 클라이언트에 전송 금지) */
export interface ServerTileData {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: TileState;
  revealedBy: PlayerId | null;
  flaggedBy: PlayerId | null;
}

/** 클라이언트용 타일 데이터 (REVEALED 전까지 지뢰 정보 숨김) */
export interface ClientTileData {
  row: number;
  col: number;
  state: TileState;
  /** REVEALED 상태일 때만 제공 */
  isMine?: boolean;
  /** REVEALED 상태일 때만 제공 */
  adjacentMines?: number;
  revealedBy: PlayerId | null;
  flaggedBy: PlayerId | null;
}

/** 플레이어 점수 데이터 */
export interface PlayerScoreData {
  playerId: PlayerId;
  playerName: string;
  playerColor: string;
  score: number;
  tilesRevealed: number;
  minesHit: number;
  flagsPlaced: number;
}

// ========== 게임 설정 ==========

/** 맵 크기 프리셋 */
export type MapSizePreset = 'small' | 'medium' | 'large' | 'manual';

/** 난이도 프리셋 (지뢰 비율) */
export type DifficultyPreset = 'easy' | 'normal' | 'hard';

/** 제한 시간 프리셋 */
export type TimeLimit = 120 | 180 | 240 | 'manual';

/** 지뢰찾기 게임 프리셋 설정 (로비에서 선택) */
export interface MineSweeperGamePreset {
  /** 맵 크기 */
  mapSize: MapSizePreset;
  /** 수동 설정 시 열(가로) 수 */
  manualCols?: number;
  /** 수동 설정 시 행(세로) 수 */
  manualRows?: number;
  /** 난이도 (지뢰 비율) */
  difficulty: DifficultyPreset;
  /** 수동 설정 시 지뢰 비율 (0~1) */
  manualMineRatio?: number;
  /** 제한 시간 (초) */
  timeLimit: TimeLimit;
  /** 수동 설정 시 시간 (초) */
  manualTime?: number;
}

/** 실제 게임에서 사용되는 설정 (프리셋 해석 후) */
export interface MineSweeperConfig {
  gridCols: number;
  gridRows: number;
  mineCount: number;
  /** 점수 설정 */
  tileRevealScore: number;
  minePenalty: number;
  flagCorrectBonus: number;
  flagWrongPenalty: number;
  minScore: number;
}

/** 프리셋에서 실제 게임 설정으로 변환된 결과 */
export interface ResolvedMineSweeperConfig {
  gridCols: number;
  gridRows: number;
  mineCount: number;
  mineRatio: number;
  totalTime: number;
}

// ========== 클라이언트 → 서버 패킷 ==========

/**
 * 타일 열기 요청 패킷 (좌클릭)
 * 클라이언트가 특정 타일을 열려고 할 때 전송
 */
export interface MSRevealTilePacket {
  type: MineSweeperPacketType.MS_REVEAL_TILE;
  row: number;
  col: number;
}

/**
 * 깃발 토글 요청 패킷 (우클릭)
 * 클라이언트가 특정 타일에 깃발을 설치/해제하려고 할 때 전송
 */
export interface MSToggleFlagPacket {
  type: MineSweeperPacketType.MS_TOGGLE_FLAG;
  row: number;
  col: number;
}

// ========== 서버 → 클라이언트 패킷 ==========

/**
 * 게임 초기화 패킷
 * 게임 시작 시 전체 맵 상태와 설정을 전송
 */
export interface MSGameInitPacket {
  type: MineSweeperPacketType.MS_GAME_INIT;
  /** 게임 설정 */
  config: MineSweeperConfig;
  /** 초기 타일 상태 (지뢰 정보 숨김) */
  tiles: ClientTileData[][];
  /** 플레이어 목록 및 초기 점수 */
  players: PlayerScoreData[];
  /** 남은 지뢰 수 (전체 지뢰 수 - 깃발 수) */
  remainingMines: number;
  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 타일 상태 업데이트 패킷
 * 타일 열기/깃발 토글 결과를 브로드캐스트
 */
export interface MSTileUpdatePacket {
  type: MineSweeperPacketType.MS_TILE_UPDATE;
  /** 변경된 타일 목록 */
  tiles: {
    row: number;
    col: number;
    state: TileState;
    /** REVEALED 상태에서만 전송 */
    isMine?: boolean;
    /** REVEALED 상태에서만 전송 */
    adjacentMines?: number;
    /** 타일을 연 플레이어 */
    revealedBy?: PlayerId;
    /** 깃발을 설치한 플레이어 */
    flaggedBy?: PlayerId;
    /** Flood Fill 애니메이션용 거리 (시작점 기준) */
    distance?: number;
  }[];
  /** 남은 지뢰 수 */
  remainingMines: number;
  /** 순차 애니메이션 플래그 (Flood Fill 시 true) */
  isSequentialReveal?: boolean;
  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 점수 업데이트 패킷
 * 플레이어 점수 변경 시 전송
 */
export interface MSScoreUpdatePacket {
  type: MineSweeperPacketType.MS_SCORE_UPDATE;
  /** 점수가 변경된 플레이어 */
  playerId: PlayerId;
  /** 점수 변화량 (+/-) */
  scoreChange: number;
  /** 변경 후 총 점수 */
  newScore: number;
  /** 점수 변경이 발생한 위치 (UI 표시용) */
  position: { row: number; col: number } | null;
  /** 점수 변경 이유 */
  reason: 'safe_tile' | 'flood_fill' | 'mine_hit' | 'final_settlement';
  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 남은 지뢰 수 업데이트 패킷
 * 깃발 설치/해제 시 전송
 */
export interface MSRemainingMinesPacket {
  type: MineSweeperPacketType.MS_REMAINING_MINES;
  /** 남은 지뢰 수 (전체 지뢰 수 - 깃발 수) */
  remainingMines: number;
  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 게임 종료 패킷
 * 게임 종료 시 최종 결과와 함께 전송
 */
export interface MSGameEndPacket {
  type: MineSweeperPacketType.MS_GAME_END;
  /** 종료 이유 */
  reason: 'win' | 'timeout' | 'all_mines_hit';
  /** 최종 결과 (순위순 정렬) */
  results: {
    rank: number;
    playerId: PlayerId;
    score: number;
    tilesRevealed: number;
    minesHit: number;
    correctFlags: number;
    totalFlags: number;
  }[];
  /** 타임스탬프 */
  timestamp: number;
}

// ========== UNION TYPE ==========

/** 클라이언트 → 서버 패킷 Union */
export type MineSweeperClientPacket = MSRevealTilePacket | MSToggleFlagPacket;

/** 서버 → 클라이언트 패킷 Union */
export type MineSweeperServerPacket =
  | MSGameInitPacket
  | MSTileUpdatePacket
  | MSScoreUpdatePacket
  | MSRemainingMinesPacket
  | MSGameEndPacket;

/** 모든 지뢰찾기 패킷 Union */
export type MineSweeperPacket =
  | MineSweeperClientPacket
  | MineSweeperServerPacket;

// ========== 헬퍼 함수 ==========

/** 기본 지뢰찾기 프리셋 */
export const DEFAULT_MINESWEEPER_PRESET: MineSweeperGamePreset = {
  mapSize: 'medium',
  difficulty: 'normal',
  timeLimit: 180,
};

/** 프리셋을 실제 게임 설정으로 변환 */
export function resolveMineSweeperPreset(
  preset: MineSweeperGamePreset,
): ResolvedMineSweeperConfig {
  // 1. 맵 크기 결정
  let gridCols: number;
  let gridRows: number;
  switch (preset.mapSize) {
    case 'small':
      gridCols = 30;
      gridRows = 18;
      break;
    case 'medium':
      gridCols = 45;
      gridRows = 27;
      break;
    case 'large':
      gridCols = 50;
      gridRows = 30;
      break;
    case 'manual':
      gridCols = preset.manualCols ?? 40;
      gridRows = preset.manualRows ?? 20;
      break;
  }

  // 2. 지뢰 비율 결정
  let mineRatio: number;
  if (preset.manualMineRatio !== undefined) {
    mineRatio = preset.manualMineRatio;
  } else {
    switch (preset.difficulty) {
      case 'easy':
        mineRatio = 0.1; // 10%
        break;
      case 'normal':
        mineRatio = 0.2; // 20%
        break;
      case 'hard':
        mineRatio = 0.3; // 30%
        break;
    }
  }

  // 3. 지뢰 개수 계산
  const totalTiles = gridCols * gridRows;
  const mineCount = Math.floor(totalTiles * mineRatio);

  // 4. 제한 시간 결정
  let totalTime: number;
  if (preset.timeLimit === 'manual') {
    totalTime = preset.manualTime ?? 180;
  } else {
    totalTime = preset.timeLimit;
  }

  return {
    gridCols,
    gridRows,
    mineCount,
    mineRatio,
    totalTime,
  };
}

/** 기본 해결된 설정 */
export const DEFAULT_RESOLVED_CONFIG = resolveMineSweeperPreset(
  DEFAULT_MINESWEEPER_PRESET,
);

/** 기본 게임 설정 */
export const DEFAULT_MINESWEEPER_CONFIG: MineSweeperConfig = {
  gridCols: DEFAULT_RESOLVED_CONFIG.gridCols,
  gridRows: DEFAULT_RESOLVED_CONFIG.gridRows,
  mineCount: DEFAULT_RESOLVED_CONFIG.mineCount,
  tileRevealScore: 1,
  minePenalty: -20,
  flagCorrectBonus: 10,
  flagWrongPenalty: -10,
  minScore: Number.NEGATIVE_INFINITY,
};
