// --- ENUMS ---
export var SystemPacketType;
(function (SystemPacketType) {
  SystemPacketType['UPDATE_NUMBER'] = 'UPDATE_NUMBER';
  SystemPacketType['JOIN_ROOM'] = 'JOIN_ROOM';
  SystemPacketType['ROOM_UPDATE'] = 'ROOM_UPDATE';
  SystemPacketType['SYSTEM_MESSAGE'] = 'SYSTEM_MESSAGE';
  SystemPacketType['GAME_CONFIG_UPDATE_REQ'] = 'GAME_CONFIG_UPDATE_REQ';
  SystemPacketType['GAME_CONFIG_UPDATE'] = 'GAME_CONFIG_UPDATE';
})(SystemPacketType || (SystemPacketType = {}));
export var GameType;
(function (GameType) {
  GameType['APPLE_GAME'] = 'APPLE_GAME';
  GameType['FLAPPY_BIRD'] = 'FLAPPY_BIRD';
  GameType['MINESWEEPER'] = 'MINESWEEPER';
})(GameType || (GameType = {}));
export var MapSize;
(function (MapSize) {
  MapSize['SMALL'] = 'SMALL';
  MapSize['MEDIUM'] = 'MEDIUM';
  MapSize['LARGE'] = 'LARGE';
})(MapSize || (MapSize = {}));
export var GamePacketType;
(function (GamePacketType) {
  GamePacketType['SET_FIELD'] = 'SET_FIELD';
  GamePacketType['SET_TIME'] = 'SET_TIME';
  GamePacketType['UPDATE_DRAG_AREA'] = 'UPDATE_DRAG_AREA';
  GamePacketType['DROP_CELL_INDEX'] = 'DROP_CELL_INDEX';
  GamePacketType['TIME_END'] = 'TIME_END';
  GamePacketType['CONFIRM_DRAG_AREA'] = 'CONFIRM_DRAG_AREA';
  GamePacketType['DRAWING_DRAG_AREA'] = 'DRAWING_DRAG_AREA';
})(GamePacketType || (GamePacketType = {}));
export var RoomUpdateType;
(function (RoomUpdateType) {
  RoomUpdateType[(RoomUpdateType['INIT'] = 0)] = 'INIT';
  RoomUpdateType[(RoomUpdateType['JOIN'] = 1)] = 'JOIN';
})(RoomUpdateType || (RoomUpdateType = {}));
//# sourceMappingURL=packets.js.map
