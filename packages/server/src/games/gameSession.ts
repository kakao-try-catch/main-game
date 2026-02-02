import {
  SystemPacketType,
  RoomUpdatePacket,
  RoomUpdateType,
  ServerPacket,
  GameConfigUpdatePacket,
  ReturnToTheLobbyPacket,
} from '../../../common/src/packets';
import {
  GameStatus,
  PLAYER_COLORS,
  PlayerData,
  PlayerState,
} from '../../../common/src/common-type';

import {
  GameType,
  GameConfig,
  AppleGameRenderConfig,
  sanitizeForApple,
} from '../../../common/src/config';
import { Server, Socket } from 'socket.io';
import { GameInstance } from './instances/GameInstance';
import { AppleGameInstance } from './instances/AppleGameInstance';
import { FlappyBirdInstance } from './instances/FlappyBirdInstance';
import { MineSweeperInstance } from './instances/MineSweeperInstance';

export class GameSession {
  // selected game in this session (lobby choice)
  public selectedGameType: GameType = GameType.APPLE_GAME;
  // 게임 인스턴스 (현재 활성화된 게임)
  private games: GameInstance | null = null;

  // 게임별 설정 저장
  public gameConfigs: Map<GameType, GameConfig> = new Map();

  // 게임 상태 관리
  public status: GameStatus = 'waiting';

  // 플레이어 공통 상태 관리
  public players: Map<string, PlayerState> = new Map();
  private availableColors: Set<string> = new Set(PLAYER_COLORS);

  constructor(
    public io: Server,
    public roomId: string,
  ) {}

  // ========== PLAYER MANAGEMENT (공통) ==========
  public addPlayer(id: string, name: string) {
    if (this.players.has(id)) return;

    // 풀에서 색상 하나 가져오기
    const color = this.availableColors.values().next().value;
    if (!color) {
      console.error('[GameSession] No available colors');
      return;
    }
    this.availableColors.delete(color);

    this.players.set(id, {
      id: id,
      playerName: name,
      color: color,
      reportCard: { score: 0 },
    });
  }
  public isHost(playerId: string): boolean {
    const first = this.players.keys().next().value;
    return first === playerId;
  }

  public removePlayer(id: string) {
    const player = this.players.get(id);
    if (player) {
      // 색상 반환
      this.availableColors.add(player.color);
    }
    this.players.delete(id);
    // Notify remaining clients about updated room player list
    this.updateRemainingPlayers(id); // io 필요하면 전달하도록 수정 필요

    if (this.players.size === 0) {
      this.stopGame();
    }
  }

  public getIndex(id: string): number {
    let index = 0;
    for (const [playerId] of this.players) {
      if (playerId === id) {
        return index;
      }
      index++;
    }
    return -1;
  }

  public updateRemainingPlayers(id: string) {
    // Send JOIN to existing players (excluding the new player)
    for (const [playerId] of this.players) {
      if (playerId === id) continue; // 새로 접속한 플레이어 제외

      const otherSocket = this.io.sockets.sockets.get(playerId);
      if (!otherSocket) continue; // 소켓이 없으면 스킵

      const roomUpdatePacket2Other: RoomUpdatePacket = {
        type: SystemPacketType.ROOM_UPDATE,
        players: this.getPlayers(),
        updateType: RoomUpdateType.PLAYER_QUIT,
        yourIndex: this.getIndex(playerId),
        roomId: this.roomId,
      };
      otherSocket.emit(SystemPacketType.ROOM_UPDATE, roomUpdatePacket2Other);
    }
    console.log(
      `[Server] Sent ROOM_UPDATE (JOIN) to room ${this.roomId} (excluding ${id})`,
    );
  }

  public getPlayerCount() {
    return this.players.size;
  }
  public getPlayers(): PlayerData[] {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      playerName: p.playerName,
      color: p.color,
      reportCard: p.reportCard,
    }));
  }

  // ========== GAME LIFECYCLE ==========

  public updateGameConfig(
    selectedGameType: GameType,
    inputGameConfig: GameConfig,
  ) {
    console.log(
      '[GameSession] Updating game config:',
      selectedGameType,
      inputGameConfig,
    );
    // Remember previous selected game type so we can decide whether to
    // treat identical configs as changes when the game type changed.
    const prevSelectedGameType = this.selectedGameType;
    // Update the session's selected game type based on the incoming packet
    this.selectedGameType = selectedGameType;

    // Validate & sanitize incoming config before storing.
    // IMPORTANT: If a field is missing or invalid, prefer the existing stored
    // config value for this session. Only fall back to global defaults when
    // there is no existing stored value.
    let storedConfig: GameConfig = inputGameConfig;
    if (selectedGameType === GameType.APPLE_GAME) {
      // todo 얘내 얕은 참조 아님?
      const existingCfg = this.gameConfigs.get(GameType.APPLE_GAME) as
        | AppleGameRenderConfig
        | undefined;
      storedConfig = sanitizeForApple(existingCfg, inputGameConfig);
      // If the new sanitized config has no differences from the existing
      // stored config for this session, avoid storing and broadcasting it.
      const prev = existingCfg;
      const curr = storedConfig as AppleGameRenderConfig;
      const noChange =
        prev &&
        prev.gridCols === curr.gridCols &&
        prev.gridRows === curr.gridRows &&
        prev.minNumber === curr.minNumber &&
        prev.maxNumber === curr.maxNumber &&
        prev.totalTime === curr.totalTime &&
        prev.includeZero === curr.includeZero &&
        // Only treat as duplicate (skip) when the previously-selected
        // game type is the same as the incoming one.
        prevSelectedGameType === selectedGameType;
      if (noChange) {
        console.log(
          '[GameSession] No change in game config; skipping update broadcast.',
        );
        return;
      }
    }

    // store the sanitized config
    this.gameConfigs.set(selectedGameType, storedConfig);
    // todo 제거 대상 this.gameConfigs.set(selectedGameType, storedConfig);

    // Notify clients about the updated game config
    const gameConfigUpdatePacket: GameConfigUpdatePacket = {
      type: SystemPacketType.GAME_CONFIG_UPDATE,
      selectedGameType,
      gameConfig: storedConfig,
    };
    this.broadcastPacket(gameConfigUpdatePacket);
  }

  public startGame(): void {
    if (this.status === 'playing') {
      console.log('status가 playing이라서 시작 못 함.: ', this.status);
      return;
    }
    this.status = 'playing';
    // 게임 인스턴스 생성
    // todo 이거 config 값을 생성할 때부터
    this.games = this.createGameInstance(this.selectedGameType);

    const config = this.gameConfigs.get(this.selectedGameType);
    this.games.initialize(config as GameConfig);

    // READY_SCENE 브로드캐스트
    this.broadcastPacket({
      type: SystemPacketType.READY_SCENE,
      selectedGameType: this.selectedGameType,
    });

    this.games.start();
  }

  public stopGame(): void {
    this.status = 'ended';
    this.games?.stop();
  }

  private createGameInstance(gameType: GameType): GameInstance {
    switch (gameType) {
      case GameType.APPLE_GAME:
        console.log('[GameSession/createGameInstance] appleGameInstance 생성');
        return new AppleGameInstance(this);
      case GameType.FLAPPY_BIRD:
        console.log('[GameSession/createGameInstance] flappyBirdInstance 생성');
        return new FlappyBirdInstance(this);
      case GameType.MINESWEEPER:
        console.log('[GameSession/createGameInstance] mineSweeperInstance 생성');
        return new MineSweeperInstance(this);
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
  }

  public handleReplayRequest(id: string) {
    // 1. 게임 결과창 화면인지 검사
    if (this.status !== 'ended') {
      console.log('[GameSession] Cannot replay: game is not ended');
      return;
    }

    // 2. 방장인지 검사
    if (!this.isHost(id)) {
      console.log('[GameSession] Cannot replay: not a host');
      return;
    }

    // 3. 게임 재시작 (startGame이 상태 초기화 + 패킷 시퀀스 전송 처리)
    this.startGame();
  }

  public returnToLobby(id: string) {
    // 1. 게임 결과창 화면인지 검사
    if (this.status !== 'ended') {
      console.log('[GameSession] Cannot return to lobby: game is not ended');
      // todo 클라에게 정보 보내주어야 함?
      return;
    }

    // 2. 방장인지 검사
    if (!this.isHost(id)) {
      console.log('[GameSession] Cannot return to lobby: not a host');
      return;
    }

    // 3. 상태를 waiting으로 초기화
    this.status = 'waiting';

    // 4. 방 인원 모두에게 ReturnToTheLobby 패킷 전송
    const returnToLobbyPacket: ReturnToTheLobbyPacket = {
      type: SystemPacketType.RETURN_TO_THE_LOBBY,
    };
    this.broadcastPacket(returnToLobbyPacket);

    console.log(`[GameSession] Returning room ${this.roomId} to lobby`);
  }

  // ========== PACKET ROUTING ==========
  public handleGamePacket(socket: Socket, packet: any): void {
    if (!this.games || this.status !== 'playing') {
      console.log(
        `[GameSession] handleGamePacket 무시됨 - games: ${!!this.games}, status: ${this.status}`,
      );
      return;
    }

    const playerIndex = this.getIndex(socket.id);
    console.log(
      `[GameSession] handleGamePacket 전달 - type: ${packet.type}, playerIndex: ${playerIndex}`,
    );
    this.games.handlePacket(socket, playerIndex, packet);
  }

  public broadcastPacket(packet: ServerPacket) {
    // packet에서 type과 나머지 데이터를 분리
    const { type, ...payload } = packet;

    // Broadcast callback
    this.io.to(this.roomId).emit(packet.type, payload);
  }
}
