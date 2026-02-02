// ========== SYSTEM PACKETS (공용) ==========
export var SystemPacketType;
(function (SystemPacketType) {
    SystemPacketType["UPDATE_NUMBER"] = "UPDATE_NUMBER";
    SystemPacketType["JOIN_ROOM"] = "JOIN_ROOM";
    SystemPacketType["ROOM_UPDATE"] = "ROOM_UPDATE";
    SystemPacketType["SYSTEM_MESSAGE"] = "SYSTEM_MESSAGE";
    SystemPacketType["GAME_CONFIG_UPDATE_REQ"] = "GAME_CONFIG_UPDATE_REQ";
    SystemPacketType["GAME_CONFIG_UPDATE"] = "GAME_CONFIG_UPDATE";
    SystemPacketType["GAME_START_REQ"] = "GAME_START_REQ";
    SystemPacketType["READY_SCENE"] = "READY_SCENE";
    SystemPacketType["UPDATE_SCORE"] = "UPDATE_SCORE";
    SystemPacketType["RETURN_TO_THE_LOBBY_REQ"] = "RETURN_TO_THE_LOBBY_REQ";
    SystemPacketType["RETURN_TO_THE_LOBBY"] = "RETURN_TO_THE_LOBBY";
    SystemPacketType["REPLAY_REQ"] = "REPLAY_REQ";
    SystemPacketType["SET_TIME"] = "SET_TIME";
    SystemPacketType["TIME_END"] = "TIME_END";
})(SystemPacketType || (SystemPacketType = {}));
export var RoomUpdateType;
(function (RoomUpdateType) {
    RoomUpdateType[RoomUpdateType["INIT_ROOM"] = 0] = "INIT_ROOM";
    RoomUpdateType[RoomUpdateType["PLAYER_JOIN"] = 1] = "PLAYER_JOIN";
    RoomUpdateType[RoomUpdateType["PLAYER_QUIT"] = 2] = "PLAYER_QUIT";
})(RoomUpdateType || (RoomUpdateType = {}));
// ========== APPLE GAME PACKETS ==========
export var AppleGamePacketType;
(function (AppleGamePacketType) {
    AppleGamePacketType["SET_FIELD"] = "APPLE_SET_FIELD";
    AppleGamePacketType["UPDATE_DRAG_AREA"] = "APPLE_UPDATE_DRAG_AREA";
    AppleGamePacketType["DROP_CELL_INDEX"] = "APPLE_DROP_CELL_INDEX";
    AppleGamePacketType["CONFIRM_DRAG_AREA"] = "APPLE_CONFIRM_DRAG_AREA";
    AppleGamePacketType["DRAWING_DRAG_AREA"] = "APPLE_DRAWING_DRAG_AREA";
})(AppleGamePacketType || (AppleGamePacketType = {}));
// ========== FLAPPY BIRD PACKETS ==========
export var FlappyBirdPacketType;
(function (FlappyBirdPacketType) {
    FlappyBirdPacketType["FLAPPY_JUMP"] = "FLAPPY_JUMP";
    FlappyBirdPacketType["FLAPPY_WORLD_STATE"] = "FLAPPY_WORLD_STATE";
    FlappyBirdPacketType["FLAPPY_SCORE_UPDATE"] = "FLAPPY_SCORE_UPDATE";
    FlappyBirdPacketType["FLAPPY_GAME_OVER"] = "FLAPPY_GAME_OVER";
})(FlappyBirdPacketType || (FlappyBirdPacketType = {}));
//# sourceMappingURL=packets.js.map