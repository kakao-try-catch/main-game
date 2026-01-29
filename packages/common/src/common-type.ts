// --- COMMON TYPES ---
type AppleIndex = number;

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
}
