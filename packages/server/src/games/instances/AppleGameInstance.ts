import { GameInstance } from './GameInstance';
import {
  AppleGameRenderConfig,
  DEFAULT_APPLE_GAME_RENDER_CONFIG,
  GameType,
} from '../../../../common/src/config';
import {
  AppleGamePacket,
  AppleGamePacketType,
  DropCellIndexPacket,
  ReadyScenePacket,
  ReturnToTheLobbyPacket,
  SetFieldPacket,
  SetTimePacket,
  SystemPacketType,
  TimeEndPacket,
  UpdateScorePacket,
} from '../../../../common/src/packets';
import { PlayerData, ReportCard } from '../../../../common/src/common-type';
import { GameSession } from '../gameSession';
import { Socket } from 'socket.io';

export class AppleGameInstance implements GameInstance {
  private apples: number[] = [];
  private removedIndices: Set<number> = new Set();
  private timerInterval: NodeJS.Timeout | null = null;
  private timeLeft: number = 0;

  // Player ID -> last drag area & repeat count
  private playerDragState = new Map<
    number,
    {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      repeatCount: number;
    }
  >();

  private session: GameSession;

  constructor(session: GameSession) {
    this.session = session;
  }

  // 기존 gameSession.ts에서 Apple 전용 로직 이동
  initialize(config: AppleGameRenderConfig): void {
    const validConfig = config ?? this.getAppliedAppleConfig();
    this.timeLeft = validConfig.totalTime;
    this.removedIndices.clear();
    this.generateField(validConfig);
  }

  start(): void {
    // TODO 중복?
    const applied = this.getAppliedAppleConfig();
    this.timeLeft = applied.totalTime;
    this.removedIndices.clear();
    this.session.players.forEach((p) => {
      p.reportCard.score = 0;
    });

    // Generate Apples
    console.log('[appleGameInstance/start] generateField');
    this.generateField(applied);

    // Broadcast Field
    const setFieldPacket: SetFieldPacket = {
      type: AppleGamePacketType.SET_FIELD,
      apples: this.apples,
    };
    console.log('[appleGameInstance/start] setfield');
    this.session.broadcastPacket(setFieldPacket);

    // ready_scene
    const readyScenePacket: ReadyScenePacket = {
      type: SystemPacketType.READY_SCENE,
      selectedGameType: this.session.selectedGameType,
    };
    console.log('[appleGameInstance/start] readyscene');
    this.session.broadcastPacket(readyScenePacket);

    // Broadcast Time
    const setTimePacket: SetTimePacket = {
      type: SystemPacketType.SET_TIME,
      limitTime: this.timeLeft,
      serverStartTime: Date.now(), // 서버 시작 시간 전송
    };
    this.session.broadcastPacket(setTimePacket);

    // 점수 초기화 알리기 (Snapshot)
    this.broadcastScoreboard();

    // Start Timer
    console.log('...Game timer');
    this.startTimer();
    console.log('...Game Started!');
  }

  stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  destroy(): void {}

  // todo 얘내 gameSession으로 빼내야 함
  handlePacket(
    socket: Socket,
    playerIndex: number,
    packet: AppleGamePacket,
  ): void {
    switch (packet.type) {
      case AppleGamePacketType.DRAWING_DRAG_AREA:
        // 브로드캐스트 (나 제외)
        // 검증 로직 필요함. 게임 안쪽 영역이 맞는지, 그리고 정규화된 건지
        // 드래그 영역은 정규화가 필요함.
        // 추가: 이전에 보냈던 것과 동일한지 비교해 동일한 패킷이 3번까지만 브로드캐스트,
        // 4번째부터는 무시하도록 함.
        const playerIndex = this.session.getIndex(socket.id);
        const sx = packet.startX;
        const sy = packet.startY;
        const ex = packet.endX;
        const ey = packet.endY;

        const prev = this.playerDragState.get(playerIndex);
        const isSame =
          !!prev &&
          prev.startX === sx &&
          prev.startY === sy &&
          prev.endX === ex &&
          prev.endY === ey;

        if (isSame) {
          prev.repeatCount = (prev.repeatCount || 0) + 1;
          if (prev.repeatCount <= 3 || true) {
            socket
              .to(this.session.roomId)
              .emit(AppleGamePacketType.UPDATE_DRAG_AREA, {
                type: AppleGamePacketType.UPDATE_DRAG_AREA,
                playerIndex: playerIndex,
                startX: sx,
                startY: sy,
                endX: ex,
                endY: ey,
              });
          } else {
            // 4번째 이상 동일한 패킷은 무시
            // 필요하면 로깅 추가
          }
        } else {
          this.playerDragState.set(playerIndex, {
            startX: sx,
            startY: sy,
            endX: ex,
            endY: ey,
            repeatCount: 1,
          });
          socket
            .to(this.session.roomId)
            .emit(AppleGamePacketType.UPDATE_DRAG_AREA, {
              type: AppleGamePacketType.UPDATE_DRAG_AREA,
              playerIndex: playerIndex,
              startX: sx,
              startY: sy,
              endX: ex,
              endY: ey,
            });
        }

        break;
      case AppleGamePacketType.CONFIRM_DRAG_AREA:
        this.handleDragConfirm(socket.id, packet.indices);
        break;
    }
  }

  // initialize defaults for game configs so lobby has a baseline
  // private initDefaults() {
  //   if (!this.gameConfigs.has(GameType.APPLE_GAME)) {
  //     const defaultCfg: GameConfig = {
  //       mapSize: MapSize.MEDIUM,
  //       time: APPLE_GAME_CONFIG.totalTime,
  //       generation: 0,
  //       zero: APPLE_GAME_CONFIG.includeZero,
  //     } as GameConfig;
  //     this.gameConfigs.set(GameType.APPLE_GAME, defaultCfg);
  //   }
  // }
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

  // todo 없어도 되는 것 아님?
  private getAppliedAppleConfig(): AppleGameRenderConfig {
    const stored = this.session.gameConfigs.get(GameType.APPLE_GAME) as
      | AppleGameRenderConfig
      | undefined;
    return stored ?? DEFAULT_APPLE_GAME_RENDER_CONFIG;
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
    // 이미 게임이 종료된 상태면 중복 처리 방지
    if (this.session.status === 'ended') {
      console.log('[AppleGameInstance] 게임이 이미 종료됨 - finishGame 무시');
      return;
    }

    this.session.stopGame();

    console.log('게임 끝남. 결과: ');
    for (const [id, player] of this.session.players) {
      console.log(`- ${player.playerName} (${id}): ${player.reportCard.score}`);
    }
    // Calculate Rank
    const results: PlayerData[] = Array.from(this.session.players.values())
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
    this.session.broadcastPacket(endPacket);
  }

  public handleDragConfirm(playerId: string, indices: number[]) {
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

      const player = this.session.players.get(playerId);
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

        const winnerIndex = this.session.getIndex(playerId);
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
        this.session.broadcastPacket(dropCellIndexPacket);

        // 점수 변경 시 UPDATE_SCORE 전송 (사운드 재생용)
        this.broadcastScoreboard();
      }
    }
  }

  private broadcastScoreboard() {
    const scoreboard: ReportCard[] = Array.from(
      this.session.players.values(),
    ).map((p) => p.reportCard);

    const updateScorePacket: UpdateScorePacket = {
      type: SystemPacketType.UPDATE_SCORE,
      scoreboard,
    };
    this.session.broadcastPacket(updateScorePacket);
  }
}
