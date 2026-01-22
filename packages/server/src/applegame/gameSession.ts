
import { APPLE_GAME_CONFIG } from "../../../common/src/config";
import { GamePacketType, DropCellIndexPacket, TimeEndPacket, SetFieldPacket, SetTimePacket, PlayerData, UpdateScorePacket, SystemPacketType, ReportCard, PlayerSummary } from "../../../common/src/packets";

export type GameStatus = "waiting" | "playing" | "ended";

const PLAYER_COLORS = ['#209cee', '#e76e55', '#92cc41', '#f2d024'];

// PlayerData imported from packets

// 상태 관리 해야 함.
export interface PlayerState {
  id: string; // Socket ID
  name: string;
  order: number;
  color: string;
  reportCard: ReportCard;
}

export class GameSession {
  // todo 게임 콘피그는 가변적이어야 함.
  private readonly config = APPLE_GAME_CONFIG;

  // 플레이어 공통 상태 관리
  public players: Map<string, PlayerState> = new Map();

  // 게임 상태 관리
  public status: GameStatus = "waiting";
  public timeLeft: number = this.config.totalTime;
  private timerInterval: NodeJS.Timeout | null = null;

  // 사과 게임의 것
  public apples: number[] = [];
  public removedIndices: Set<number> = new Set();


  constructor(public roomId: string, private broadcastCallback: (packet: any) => void) { }

  // todo id는 바뀌는 애임
  public addPlayer(id: string, name: string) {
    if (this.players.has(id)) return;

    const order = this.players.size;
    const color = PLAYER_COLORS[order % PLAYER_COLORS.length]; // 순서대로 부여 (4명 넘으면 순환 or 에러처리는 나중에)

    this.players.set(id, {
      id,
      name,
      order,
      color,
      reportCard: { score: 0 }
    });
  }

  public removePlayer(id: string) {
    this.players.delete(id);
    if (this.players.size === 0) {
      this.stopGame();
    }
  }

  public startGame() {
    if (this.status === "playing") return;

    this.status = "playing";
    this.timeLeft = this.config.totalTime;
    this.removedIndices.clear();
    this.players.forEach(p => {
      p.reportCard.score = 0;
    });

    // Generate Apples
    this.generateField();

    // Broadcast Field
    const setFieldPacket: SetFieldPacket = {
      type: GamePacketType.SET_FIELD,
      apples: this.apples,
    };
    this.broadcastCallback(setFieldPacket);

    // Broadcast Time
    const setTimePacket: SetTimePacket = {
      type: GamePacketType.SET_TIME,
      limitTime: this.timeLeft,
    };
    this.broadcastCallback(setTimePacket);

    // 점수 초기화 알리기 (Snapshot)
    this.broadcastScoreboard();

    // Start Timer
    this.startTimer();
  }

  public stopGame() {
    this.status = "ended";
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private generateField() {
    const count = this.config.gridCols * this.config.gridRows;
    const minNumber = this.config.includeZero ? 0 : this.config.minNumber;
    this.apples = Array.from({ length: count }, () =>
      Math.floor(Math.random() * (this.config.maxNumber - minNumber + 1)) + minNumber
    );
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.finishGame();
      }
    }, 1000);
  }

  private finishGame() {
    this.stopGame();

    // Calculate Rank
    const results = Array.from(this.players.values())
      .sort((a, b) => b.reportCard.score - a.reportCard.score)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.id,
        score: p.reportCard.score
      }));

    const endPacket: TimeEndPacket = {
      type: GamePacketType.TIME_END,
      results
    };
    this.broadcastCallback(endPacket);
  }

  public handleDragConfirm(playerId: string, indices: number[]) {
    if (this.status !== "playing") return;

    // Check if any index is already removed (Race condition check)
    const alreadyTaken = indices.some(idx => this.removedIndices.has(idx));
    if (alreadyTaken) {
      // Ignore request
      return;
    }

    // Validate sum
    const sum = indices.reduce((acc, idx) => acc + (this.apples[idx] || 0), 0);
    if (sum === 10) {
      // Update State
      indices.forEach(idx => this.removedIndices.add(idx));

      const player = this.players.get(playerId);
      if (player) {
        const addedScore = indices.length;
        player.reportCard.score += addedScore;

        // Broadcast Success
        const dropPacket: DropCellIndexPacket = {
          type: GamePacketType.DROP_CELL_INDEX,
          winnerId: playerId,
          indices: indices,
          totalScore: player.reportCard.score
        };
        this.broadcastCallback(dropPacket);
      }
    }
  }

  public getPlayers(): PlayerData[] {
    return Array.from(this.players.values())
      .sort((a, b) => a.order - b.order)
      .map(p => ({
        order: p.order,
        playerName: p.name,
        color: p.color,
        score: p.reportCard.score
      }));
  }

  public getPlayerCount() {
    return this.players.size;
  }

  private broadcastScoreboard() {
    const scoreboard: PlayerSummary[] = Array.from(this.players.values())
      .sort((a, b) => a.order - b.order) // Ensure consistent order if needed
      .map(p => ({
        playerOrder: p.order,
        reportCard: [p.reportCard]
      }));

    const updateScorePacket: UpdateScorePacket = {
      type: SystemPacketType.UPDATE_SCORE,
      scoreboard
    };
    this.broadcastCallback(updateScorePacket);
  }


}
