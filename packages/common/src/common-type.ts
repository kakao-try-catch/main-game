// --- COMMON TYPES ---
export interface PlayerData {
  playerName: string;
  color: string;
  reportCard: ReportCard;
}

export interface ReportCard {
  score: number;
}

export interface AppleGameReportCard extends ReportCard {}

export interface MineSweeperReportCard extends ReportCard {
  flags: number;
} // todo 리팩토링 할 때 공통적으로 분리 가능한 것 아님?

export type GameStatus = 'waiting' | 'playing' | 'ended';
// todo color 따로 빼낼 수 있음? 서버에서만 관리하는 기능이긴 함
export const PLAYER_COLORS = ['#209cee', '#e76e55', '#92cc41', '#f2d024'];
// PlayerData imported from packets
// 상태 관리 해야 함.

export interface PlayerState extends PlayerData {
  id: string; // Socket ID
}
export interface FlappyBirdData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

export interface FlappyPipeData {
  id: number;
  x: number;
  gapY: number;
  width: number;
  gap: number;
}

export interface FlappyRopeData {
  points: {
    x: number;
    y: number;
  }[];
}

export interface FlappyPlayerStats {
  playerIndex: number;
  playerName: string;
  playerColor: string;
  jumpCount: number;
  avgJumpInterval: number;
}
