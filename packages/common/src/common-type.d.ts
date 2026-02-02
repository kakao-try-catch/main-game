export interface PlayerData {
    playerName: string;
    color: string;
    reportCard: ReportCard;
}
export interface ReportCard {
    score: number;
}
export interface AppleGameReportCard extends ReportCard {
}
export interface MineSweeperReportCard extends ReportCard {
    flags: number;
}
export type GameStatus = 'waiting' | 'playing' | 'ended';
export declare const PLAYER_COLORS: string[];
export interface PlayerState extends PlayerData {
    id: string;
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
//# sourceMappingURL=common-type.d.ts.map