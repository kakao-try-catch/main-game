/**
 * @main-game/common 패키지 진입점
 *
 * 서버와 클라이언트가 공유하는 모든 타입과 유틸리티를 export합니다.
 */

// ========== Config ==========
export {
  // Game Type
  GameType,

  // Apple Game
  MapSize,
  type AppleGameRenderConfig,
  DEFAULT_APPLE_GAME_RENDER_CONFIG,
  type AppleGameConfigRequest,
  DEFAULT_APPLE_GAME_CONFIG_REQ,
  MAP_SIZE_TO_GRID,
  resolveAppleGameConfig,
  sanitizeTime,
  sanitizeForApple,

  // Flappy Bird
  type PipeSpeedPreset,
  type PipeSpacingPreset,
  type PipeGapPreset,
  type PipeWidthPreset,
  type RopeLengthPreset,
  type FlappyBirdGamePreset,
  type ResolvedFlappyBirdConfig,
  FLAPPY_PHYSICS,
  resolveFlappyBirdPreset,

  // Minesweeper (re-exported from minesweeperPackets)
  type MineSweeperGamePreset,
  type MineSweeperConfig,
  type ResolvedMineSweeperConfig,
  type MapSizePreset,
  type DifficultyPreset,
  type TimeLimit,
  DEFAULT_MINESWEEPER_PRESET,
  DEFAULT_MINESWEEPER_CONFIG,
  DEFAULT_RESOLVED_MINESWEEPER_CONFIG,
  resolveMineSweeperPreset,

  // Union Type
  type GameConfig,
  getDefaultConfig,
} from './config';

// ========== Packets ==========
export {
  // System Packets
  SystemPacketType,
  RoomUpdateType,
  type UpdateNumberPacket,
  type JoinRoomPacket,
  type RoomUpdatePacket,
  type SystemMessagePacket,
  type GameConfigUpdateReqPacket,
  type GameConfigUpdatePacket,
  type GameStartReqPacket,
  type ReadyScenePacket,
  type UpdateScorePacket,
  type ReturnToTheLobbyReqPacket,
  type ReturnToTheLobbyPacket,
  type ReplayReqPacket,
  type SetTimePacket,
  type TimeEndPacket,
  type SystemPacket,

  // Apple Game Packets
  AppleGamePacketType,
  type SetFieldPacket,
  type UpdateDragAreaPacket,
  type DropCellIndexPacket,
  type ConfirmDragAreaPacket,
  type DrawingDragAreaPacket,
  type AppleGamePacket,

  // Flappy Bird Packets
  FlappyBirdPacketType,
  type FlappyJumpPacket,
  type FlappyWorldStatePacket,
  type FlappyScoreUpdatePacket,
  type FlappyGameOverPacket,
  type FlappyBirdPacket,

  // Minesweeper Packets
  MineSweeperPacketType,
  type MineSweeperPacket,

  // Unified Packet Type
  type ServerPacket,
} from './packets';

// ========== Minesweeper Packets (detailed exports) ==========
export {
  // Common Types
  TileState,
  type PlayerId,
  type ServerTileData,
  type ClientTileData,
  type PlayerScoreData,

  // Client -> Server Packets
  type MSRevealTilePacket,
  type MSToggleFlagPacket,
  type MineSweeperClientPacket,

  // Server -> Client Packets
  type MSGameInitPacket,
  type MSTileUpdatePacket,
  type MSScoreUpdatePacket,
  type MSRemainingMinesPacket,
  type MSGameEndPacket,
  type MineSweeperServerPacket,

  // Default Values
  DEFAULT_RESOLVED_CONFIG,
} from './minesweeperPackets';

// ========== Common Types ==========
export {
  type PlayerData,
  type ReportCard,
  type AppleGameReportCard,
  type MineSweeperReportCard,
  type GameStatus,
  PLAYER_COLORS,
  type PlayerState,
  type FlappyBirdData,
  type FlappyPipeData,
} from './common-type';

