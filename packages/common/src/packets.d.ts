export declare enum SystemPacketType {
    UPDATE_NUMBER = "UPDATE_NUMBER",
    JOIN_ROOM = "JOIN_ROOM",
    ROOM_UPDATE = "ROOM_UPDATE",
    SYSTEM_MESSAGE = "SYSTEM_MESSAGE",
    GAME_CONFIG_UPDATE_REQ = "GAME_CONFIG_UPDATE_REQ",
    GAME_CONFIG_UPDATE = "GAME_CONFIG_UPDATE"
}
export declare enum GameType {
    APPLE_GAME = "APPLE_GAME",
    FLAPPY_BIRD = "FLAPPY_BIRD",
    MINESWEEPER = "MINESWEEPER"
}
export declare enum MapSize {
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE"
}
export declare enum GamePacketType {
    SET_FIELD = "SET_FIELD",
    SET_TIME = "SET_TIME",
    UPDATE_DRAG_AREA = "UPDATE_DRAG_AREA",
    DROP_CELL_INDEX = "DROP_CELL_INDEX",
    TIME_END = "TIME_END",
    CONFIRM_DRAG_AREA = "CONFIRM_DRAG_AREA",
    DRAWING_DRAG_AREA = "DRAWING_DRAG_AREA"
}
type PlayerId = string;
type AppleIndex = number;
export interface PlayerData {
    order: number;
    playerName: string;
    color: string;
    score: number;
}
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
export declare enum RoomUpdateType {
    INIT = 0,
    JOIN = 1
}
export interface RoomUpdatePacket {
    type: SystemPacketType.ROOM_UPDATE;
    players: PlayerData[];
    updateType: RoomUpdateType;
}
export interface SystemMessagePacket {
    type: SystemPacketType.SYSTEM_MESSAGE;
    message: string;
}
export interface AppleGameConfig {
    mapSize: MapSize;
    time: number;
    generation: number;
    zero: boolean;
}
export type GameConfig = AppleGameConfig;
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
export type SystemPacket = UpdateNumberPacket | JoinRoomPacket | RoomUpdatePacket | SystemMessagePacket | GameConfigUpdateReqPacket | GameConfigUpdatePacket;
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
    playerId: PlayerId;
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
    results: {
        rank: number;
        playerId: PlayerId;
        score: number;
    }[];
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
export type GamePacket = SetFieldPacket | SetTimePacket | UpdateDragAreaPacket | DropCellIndexPacket | TimeEndPacket | ConfirmDragAreaPacket | DrawingDragAreaPacket;
export type ServerPacket = SystemPacket | GamePacket;
export { };
//# sourceMappingURL=packets.d.ts.map