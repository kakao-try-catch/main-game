import { type GameConfig, GameType } from './config';
import type {
  FlappyBirdData,
  FlappyPipeData,
  PlayerData,
  ReportCard,
} from './common-type';

// ========== SYSTEM PACKETS (공용) ==========
export enum SystemPacketType {
  UPDATE_NUMBER = 'UPDATE_NUMBER',
  JOIN_ROOM = 'JOIN_ROOM',
  ROOM_UPDATE = 'ROOM_UPDATE',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
  GAME_CONFIG_UPDATE_REQ = 'GAME_CONFIG_UPDATE_REQ',
  GAME_CONFIG_UPDATE = 'GAME_CONFIG_UPDATE',
  GAME_START_REQ = 'GAME_START_REQ',
  READY_SCENE = 'READY_SCENE',
  UPDATE_SCORE = 'UPDATE_SCORE',
  RETURN_TO_THE_LOBBY_REQ = 'RETURN_TO_THE_LOBBY_REQ',
  RETURN_TO_THE_LOBBY = 'RETURN_TO_THE_LOBBY',
  REPLAY_REQ = 'REPLAY_REQ',
  SET_TIME = 'SET_TIME',
  TIME_END = 'TIME_END',
}

export interface UpdateNumberPacket {
  type: SystemPacketType.UPDATE_NUMBER;
  number: number;
}
export interface JoinRoomPacket {
  type: SystemPacketType.JOIN_ROOM;
  roomId: string;
  playerName: string;
}

export enum RoomUpdateType {
  INIT_ROOM = 0,
  PLAYER_JOIN = 1,
  PLAYER_QUIT = 2,
}

export interface RoomUpdatePacket {
  type: SystemPacketType.ROOM_UPDATE;
  players: PlayerData[];
  updateType: RoomUpdateType;
  yourIndex: number;
  roomId: string;
}

export interface SystemMessagePacket {
  type: SystemPacketType.SYSTEM_MESSAGE;
  message: string;
}

export interface GameConfigUpdateReqPacket {
  type: SystemPacketType.GAME_CONFIG_UPDATE_REQ;
  selectedGameType: GameType;
  gameConfig: GameConfig;
}

export interface GameConfigUpdatePacket {
  type: SystemPacketType.GAME_CONFIG_UPDATE;
  selectedGameType: GameType;
  gameConfig: GameConfig;
}

export interface GameStartReqPacket {
  type: SystemPacketType.GAME_START_REQ;
}

export interface ReadyScenePacket {
  type: SystemPacketType.READY_SCENE;
  selectedGameType: GameType;
}

export interface UpdateScorePacket {
  type: SystemPacketType.UPDATE_SCORE;
  // scoreboard is an array of ReportCard objects where index = player order
  scoreboard: ReportCard[];
}

export interface ReturnToTheLobbyReqPacket {
  type: SystemPacketType.RETURN_TO_THE_LOBBY_REQ;
}

export interface ReturnToTheLobbyPacket {
  type: SystemPacketType.RETURN_TO_THE_LOBBY;
}

export interface ReplayReqPacket {
  type: SystemPacketType.REPLAY_REQ;
}

export interface SetTimePacket {
  type: SystemPacketType.SET_TIME;
  limitTime: number;
  serverStartTime: number; // 서버에서 게임이 시작된 시간 (timestamp)
}
export interface TimeEndPacket {
  type: SystemPacketType.TIME_END;
  results: PlayerData[];
}

export type SystemPacket =
  | UpdateNumberPacket
  | JoinRoomPacket
  | RoomUpdatePacket
  | SystemMessagePacket
  | GameConfigUpdateReqPacket
  | GameConfigUpdatePacket
  | GameStartReqPacket
  | ReadyScenePacket
  | UpdateScorePacket
  | ReturnToTheLobbyReqPacket
  | ReturnToTheLobbyPacket
  | ReplayReqPacket
  | SetTimePacket
  | TimeEndPacket;

// ========== APPLE GAME PACKETS ==========

export enum AppleGamePacketType {
  SET_FIELD = 'APPLE_SET_FIELD',
  UPDATE_DRAG_AREA = 'APPLE_UPDATE_DRAG_AREA',
  DROP_CELL_INDEX = 'APPLE_DROP_CELL_INDEX',
  CONFIRM_DRAG_AREA = 'APPLE_CONFIRM_DRAG_AREA',
  DRAWING_DRAG_AREA = 'APPLE_DRAWING_DRAG_AREA',
}

export interface SetFieldPacket {
  type: AppleGamePacketType.SET_FIELD;
  apples: number[];
}
export interface UpdateDragAreaPacket {
  type: AppleGamePacketType.UPDATE_DRAG_AREA;
  playerIndex: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
export interface DropCellIndexPacket {
  type: AppleGamePacketType.DROP_CELL_INDEX;
  winnerIndex: number;
  indices: number[];
  totalScore: number;
}
export interface ConfirmDragAreaPacket {
  type: AppleGamePacketType.CONFIRM_DRAG_AREA;
  indices: number[];
}
export interface DrawingDragAreaPacket {
  type: AppleGamePacketType.DRAWING_DRAG_AREA;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type AppleGamePacket =
  | SetFieldPacket
  | UpdateDragAreaPacket
  | DropCellIndexPacket
  | ConfirmDragAreaPacket
  | DrawingDragAreaPacket;

// ========== FLAPPY BIRD PACKETS ==========
export enum FlappyBirdPacketType {
  FLAPPY_JUMP = 'FLAPPY_JUMP',
  FLAPPY_WORLD_STATE = 'FLAPPY_WORLD_STATE',
  FLAPPY_SCORE_UPDATE = 'FLAPPY_SCORE_UPDATE',
  FLAPPY_GAME_OVER = 'FLAPPY_GAME_OVER',
}

export interface FlappyJumpPacket {
  type: FlappyBirdPacketType.FLAPPY_JUMP;
  timestamp: number;
}

export interface FlappyWorldStatePacket {
  type: FlappyBirdPacketType.FLAPPY_WORLD_STATE;
  tick: number;
  birds: FlappyBirdData[];
  pipes: FlappyPipeData[];
  cameraX: number;
}

export interface FlappyScoreUpdatePacket {
  type: FlappyBirdPacketType.FLAPPY_SCORE_UPDATE;
  score: number;
}

export interface FlappyGameOverPacket {
  type: FlappyBirdPacketType.FLAPPY_GAME_OVER;
  collidedPlayerIndex: number;
  reason: 'pipe_collision' | 'ground_collision';
  finalScore: number;
}

export type FlappyBirdPacket =
  | FlappyJumpPacket
  | FlappyWorldStatePacket
  | FlappyScoreUpdatePacket
  | FlappyGameOverPacket;

// ========== MINESWEEPER PACKETS ==========
export enum MineSweeperPacketType {
  // 클라이언트 → 서버
  /** 타일 열기 요청 (좌클릭) */
  MS_REVEAL_TILE = 'MS_REVEAL_TILE',
  /** 깃발 토글 요청 (우클릭) */
  MS_TOGGLE_FLAG = 'MS_TOGGLE_FLAG',

  // 서버 → 클라이언트
  /** 게임 초기화 (필드 + 초기 상태 전송) */
  MS_GAME_INIT = 'MS_GAME_INIT',
  /** 타일 상태 업데이트 (열기/깃발 결과) */
  MS_TILE_UPDATE = 'MS_TILE_UPDATE',
  /** 점수 변경 알림 */
  MS_SCORE_UPDATE = 'MS_SCORE_UPDATE',
  /** 남은 지뢰 수 업데이트 */
  MS_REMAINING_MINES = 'MS_REMAINING_MINES',
  /** 게임 종료 결과 */
  MS_GAME_END = 'MS_GAME_END',
}

// 지뢰찾기 패킷 인터페이스는 minesweeperPackets.ts에서 정의
export type { MineSweeperPacket } from './minesweeperPackets';

// ========== UNIFIED PACKET TYPE ==========
export type ServerPacket =
  | SystemPacket
  | AppleGamePacket
  | FlappyBirdPacket
  | import('./minesweeperPackets').MineSweeperPacket;
