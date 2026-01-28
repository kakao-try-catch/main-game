import { type GameConfig, GameType } from './config';

// --- ENUMS ---
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
}

export enum GamePacketType {
  SET_FIELD = 'SET_FIELD',
  SET_TIME = 'SET_TIME',
  UPDATE_DRAG_AREA = 'UPDATE_DRAG_AREA',
  DROP_CELL_INDEX = 'DROP_CELL_INDEX',
  TIME_END = 'TIME_END',
  CONFIRM_DRAG_AREA = 'CONFIRM_DRAG_AREA',
  DRAWING_DRAG_AREA = 'DRAWING_DRAG_AREA',
}

// --- COMMON TYPES ---
type PlayerId = string;
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

// --- SYSTEM PACKETS ---
export interface UpdateNumberPacket {
  type: SystemPacketType.UPDATE_NUMBER;
  number: number;
}
export interface JoinRoomPacket {
  type: SystemPacketType.JOIN_ROOM;
  playerId: PlayerId;
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
  | ReturnToTheLobbyPacket;

// --- GAME PACKETS ---
export interface SetFieldPacket {
  type: GamePacketType.SET_FIELD;
  apples: number[];
}
export interface SetTimePacket {
  type: GamePacketType.SET_TIME;
  limitTime: number;
}
export interface UpdateDragAreaPacket {
  type: GamePacketType.UPDATE_DRAG_AREA;
  playerIndex: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
export interface DropCellIndexPacket {
  type: GamePacketType.DROP_CELL_INDEX;
  winnerId: PlayerId;
  indices: AppleIndex[];
  totalScore: number;
}
export interface TimeEndPacket {
  type: GamePacketType.TIME_END;
  results: PlayerData[];
}
export interface ConfirmDragAreaPacket {
  type: GamePacketType.CONFIRM_DRAG_AREA;
  indices: AppleIndex[];
}
export interface DrawingDragAreaPacket {
  type: GamePacketType.DRAWING_DRAG_AREA;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type GamePacket =
  | SetFieldPacket
  | SetTimePacket
  | UpdateDragAreaPacket
  | DropCellIndexPacket
  | TimeEndPacket
  | ConfirmDragAreaPacket
  | DrawingDragAreaPacket;

// --- UNIFIED PACKET TYPE ---
// 서버에서 클라이언트로 올 수 있는 모든 가능성을 합칩니다.
export type ServerPacket = SystemPacket | GamePacket;
