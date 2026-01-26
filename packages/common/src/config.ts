export interface AppleGameConfig {
  gridCols: number; // 가로 사과 개수 (17)
  gridRows: number; // 세로 사과 개수 (10)
  minNumber: number; // 최소 숫자 (1)
  maxNumber: number; // 최대 숫자 (9)
  totalTime: number; // 전체 게임 시간 (110초)
  maxPlayers: number; // 플레이어 수 (4)
  includeZero: boolean; // 0생성 여부
}

export const APPLE_GAME_CONFIG: AppleGameConfig = {
  gridCols: 17,
  gridRows: 10,
  minNumber: 1,
  maxNumber: 9,
  totalTime: 110,
  maxPlayers: 4,
  includeZero: false,
};
export interface AppleGameConfig {
  mapSize: MapSize;
  time: number;
  generation: number;
  zero: boolean;
}

export type GameConfig = AppleGameConfig;
export enum GameType {
  APPLE_GAME = 'APPLE_GAME',
  FLAPPY_BIRD = 'FLAPPY_BIRD',
  MINESWEEPER = 'MINESWEEPER',
}

export enum MapSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}
