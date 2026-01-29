import {
  APPLE_GAME_CONFIG,
  AppleGameConfig,
  AppleGameRenderConfig,
} from '../../../common/src/config';
import { resolveAppleGameConfig } from '../../../common/src/appleGameUtils';
import {
  AppleGamePacketType,
  DropCellIndexPacket,
  TimeEndPacket,
  SetFieldPacket,
  SetTimePacket,
  UpdateScorePacket,
  SystemPacketType,
  RoomUpdatePacket,
  RoomUpdateType,
  ReadyScenePacket,
  ReturnToTheLobbyPacket,
} from '../../../common/src/packets';
import {
  GameStatus,
  PLAYER_COLORS,
  PlayerData,
  PlayerState,
  ReportCard,
} from '../../../common/src/common-type';

import { GameType, MapSize, GameConfig } from '../../../common/src/config';
import { Server } from 'socket.io';

export class GameSession {
  // selected game in this session (lobby choice)
  public selectedGameType: GameType = GameType.APPLE_GAME;

  // Store last-updated configs for each game type (client-sent sanitized configs)
  private gameConfigs: Map<GameType, GameConfig> = new Map();

  private availableColors: Set<string> = new Set(PLAYER_COLORS);

  // 플레이어 공통 상태 관리
  public players: Map<string, PlayerState> = new Map();

  // 게임 상태 관리
  public status: GameStatus = 'waiting';
  public timeLeft: number = APPLE_GAME_CONFIG.totalTime;
  private timerInterval: NodeJS.Timeout | null = null;

  // 사과 게임의 것
  public apples: number[] = [];
  public removedIndices: Set<number> = new Set();

  constructor(
    public io: Server,
    public roomId: string,
    private broadcastCallback: (packet: any) => void,
  ) {
    this.initDefaults();
  }

  private sanitizeTime(rawTime: any): number {
    const timeNum =
      typeof rawTime === 'number' && isFinite(rawTime)
        ? rawTime
        : APPLE_GAME_CONFIG.totalTime;
    return Math.max(10, Math.min(300, Math.floor(timeNum)));
  }

  // initialize defaults for game configs so lobby has a baseline
  private initDefaults() {
    if (!this.gameConfigs.has(GameType.APPLE_GAME)) {
      const defaultCfg: GameConfig = {
        mapSize: MapSize.MEDIUM,
        time: APPLE_GAME_CONFIG.totalTime,
        generation: 0,
        zero: APPLE_GAME_CONFIG.includeZero,
      } as GameConfig;
      this.gameConfigs.set(GameType.APPLE_GAME, defaultCfg);
    }
  }

  // todo id는 바뀌는 애임. 재접속 관련 로직이 필요함.
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

  public startGame() {
    if (this.status === 'playing') return;

    this.status = 'playing';
    const applied = this.getAppliedAppleConfig();
    this.timeLeft = applied.totalTime;
    this.removedIndices.clear();
    this.players.forEach((p) => {
      p.reportCard.score = 0;
    });

    // Generate Apples
    this.generateField(applied);

    // Broadcast Field
    const setFieldPacket: SetFieldPacket = {
      type: AppleGamePacketType.SET_FIELD,
      apples: this.apples,
    };
    this.broadcastCallback(setFieldPacket);

    // ready_scene
    const readyScenePacket: ReadyScenePacket = {
      type: SystemPacketType.READY_SCENE,
      selectedGameType: this.selectedGameType,
    };
    this.broadcastCallback(readyScenePacket);

    // Broadcast Time
    const setTimePacket: SetTimePacket = {
      type: SystemPacketType.SET_TIME,
      limitTime: 10, //this.timeLeft, 일단 10초로.
      serverStartTime: Date.now(), // 서버 시작 시간 전송
    };
    this.broadcastCallback(setTimePacket);

    // 점수 초기화 알리기 (Snapshot)
    this.broadcastScoreboard();

    // Start Timer
    console.log('...Game timer');
    this.timeLeft = 10; // todo 임시
    this.startTimer();
    console.log('...Game Started!');
  }

  public stopGame() {
    this.status = 'ended';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private generateField(cfg?: AppleGameRenderConfig) {
    const used = cfg ?? this.getAppliedAppleConfig();
    // todo MapSize로부터 grid 얻는 공통 코드 두기
    const count = used.gridCols * used.gridRows;
    const minNumber = used.includeZero ? 0 : used.minNumber;
    this.apples = Array.from(
      { length: count },
      () =>
        Math.floor(Math.random() * (used.maxNumber - minNumber + 1)) +
        minNumber,
    );
  }

  private getAppliedAppleConfig(): AppleGameRenderConfig {
    const raw = this.gameConfigs.get(GameType.APPLE_GAME) as AppleGameConfig;

    // 기본 설정 생성
    const cfg: AppleGameConfig = {
      mapSize: raw?.mapSize ?? MapSize.MEDIUM,
      time: this.sanitizeTime(raw?.time),
      generation: raw?.generation ?? 0,
      zero: raw?.zero ?? false,
    };

    // 공통 유틸리티 사용
    return resolveAppleGameConfig(cfg);
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    console.log('[GameSession] Timer started with', this.timeLeft, 'seconds');
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.finishGame();
      }
    }, 1000);
  }

  private finishGame() {
    this.stopGame();

    console.log('게임 끝남. 결과: ');
    for (const [id, player] of this.players) {
      console.log(`- ${player.playerName} (${id}): ${player.reportCard.score}`);
    }
    // Calculate Rank
    const results: PlayerData[] = Array.from(this.players.values())
      .map(({ playerName, color, reportCard }) => ({
        playerName,
        color,
        reportCard,
      }))
      .sort((a, b) => b.reportCard.score - a.reportCard.score);

    const endPacket: TimeEndPacket = {
      type: SystemPacketType.TIME_END,
      results,
    };
    this.broadcastCallback(endPacket);
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
    this.broadcastCallback(returnToLobbyPacket);

    console.log(`[GameSession] Returning room ${this.roomId} to lobby`);
  }

  public updateGameConfig(selectedGameType: GameType, gameConfig: GameConfig) {
    console.log(
      '[GameSession] Updating game config:',
      selectedGameType,
      gameConfig,
    );
    // Remember previous selected game type so we can decide whether to
    // treat identical configs as changes when the game type changed.
    const prevSelectedGameType = this.selectedGameType;
    // Update the session's selected game type based on the incoming packet
    this.selectedGameType = selectedGameType;

    // todo apple game config 라면 apple game config로 형변환 해주고 config 업데이트 작업하는 거
    // Validate & sanitize incoming config before storing.
    // IMPORTANT: If a field is missing or invalid, prefer the existing stored
    // config value for this session. Only fall back to global defaults when
    // there is no existing stored value.
    const existingCfg = this.gameConfigs.get(
      GameType.APPLE_GAME,
    ) as AppleGameConfig;

    const sanitizeForApple = (raw: any) => {
      const out: any = {};

      // mapSize: must be one of MapSize values; prefer existing, then MEDIUM
      const mapSizeValid =
        raw && raw.mapSize && Object.values(MapSize).includes(raw.mapSize);
      out.mapSize = mapSizeValid
        ? raw.mapSize
        : (existingCfg?.mapSize ?? MapSize.MEDIUM);

      // time: numeric, clamp between sensible bounds; prefer existing, then default
      out.time =
        typeof raw?.time === 'number' && isFinite(raw.time)
          ? this.sanitizeTime(raw.time)
          : (existingCfg?.time ?? APPLE_GAME_CONFIG.totalTime);

      // generation: 0 or 1 (treat other numbers as 0); prefer existing
      const gen =
        typeof raw?.generation === 'number' && Number.isInteger(raw.generation)
          ? raw.generation
          : (existingCfg?.generation ?? 0);
      out.generation = gen === 1 ? 1 : 0;

      // zero: boolean; prefer existing
      out.zero =
        typeof raw?.zero === 'boolean'
          ? raw.zero
          : (existingCfg?.zero ?? !!APPLE_GAME_CONFIG.includeZero);

      return out as GameConfig;
    };

    let storedConfig: GameConfig = gameConfig;
    if (selectedGameType === GameType.APPLE_GAME) {
      storedConfig = sanitizeForApple(gameConfig) as AppleGameConfig;
      // If the new sanitized config has no differences from the existing
      // stored config for this session, avoid storing and broadcasting it.
      const prev = existingCfg;
      const noChange =
        prev &&
        prev.mapSize === storedConfig.mapSize &&
        prev.time === storedConfig.time &&
        prev.generation === storedConfig.generation &&
        prev.zero === storedConfig.zero &&
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

    // Notify clients about the updated game config
    const gameConfigUpdatePacket = {
      type: SystemPacketType.GAME_CONFIG_UPDATE,
      selectedGameType,
      gameConfig: storedConfig,
    };
    this.broadcastCallback(gameConfigUpdatePacket);
  }

  public handleDragConfirm(playerId: string, indices: number[]) {
    if (this.status !== 'playing') return;

    // Check if any index is already removed (Race condition check)
    const alreadyTaken = indices.some((idx) => this.removedIndices.has(idx));
    if (alreadyTaken) {
      // Ignore request
      return;
    }

    // Validate sum
    const sum = indices.reduce((acc, idx) => acc + (this.apples[idx] || 0), 0);
    if (sum === 10) {
      // Update State
      indices.forEach((idx) => this.removedIndices.add(idx));

      const player = this.players.get(playerId);
      if (player) {
        const addedScore = indices.length;
        player.reportCard.score += addedScore;
        console.log(
          '[GameSession] Player',
          playerId,
          'scored',
          addedScore,
          'points. total score:',
          player.reportCard.score,
        );

        const winnerIndex = this.getIndex(playerId);
        if (winnerIndex === -1) {
          console.error(
            '[GameSession] Cannot find winner index for playerId',
            playerId,
          );
        }
        const dropCellIndexPacket: DropCellIndexPacket = {
          type: AppleGamePacketType.DROP_CELL_INDEX,
          winnerIndex: winnerIndex,
          indices: indices,
          totalScore: player.reportCard.score,
        };
        this.broadcastCallback(dropCellIndexPacket);
      }
    }
  }

  public getPlayers(): PlayerData[] {
    return Array.from(this.players.values()).map((p) => ({
      playerName: p.playerName,
      color: p.color,
      reportCard: p.reportCard,
    }));
  }

  // Returns true if the given playerId corresponds to the host (order 0)
  public isHost(playerId: string): boolean {
    const first = this.players.keys().next().value;
    return first === playerId;
  }

  public getPlayerCount() {
    return this.players.size;
  }

  private broadcastScoreboard() {
    const scoreboard: ReportCard[] = Array.from(this.players.values()).map(
      (p) => p.reportCard,
    );

    const updateScorePacket: UpdateScorePacket = {
      type: SystemPacketType.UPDATE_SCORE,
      scoreboard,
    };
    this.broadcastCallback(updateScorePacket);
  }
}
