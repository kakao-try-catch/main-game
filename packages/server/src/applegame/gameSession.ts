
import { APPLE_GAME_CONFIG } from "../../../common/src/config";
import { GamePacketType, DropCellIndexPacket, TimeEndPacket, SetFieldPacket, SetTimePacket, PlayerData } from "../../../common/src/packets";

export type GameStatus = "waiting" | "playing" | "ended";

export interface PlayerState {
  id: string;
  name: string;
  score: number;
}

export class GameSession {
  public apples: number[] = [];
  public removedIndices: Set<number> = new Set();
  public players: Map<string, PlayerState> = new Map();
  public status: GameStatus = "waiting";
  public timeLeft: number = APPLE_GAME_CONFIG.totalTime;

  private timerInterval: NodeJS.Timeout | null = null;
  private readonly config = APPLE_GAME_CONFIG;

  constructor(public roomId: string, private broadcastCallback: (packet: any) => void) { }

  public addPlayer(id: string, name: string) {
    if (this.players.has(id)) return;
    this.players.set(id, { id, name, score: 0 });
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
    this.players.forEach(p => p.score = 0);

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
    this.apples = Array.from({ length: count }, () =>
      Math.floor(Math.random() * (this.config.maxNumber - this.config.minNumber + 1)) + this.config.minNumber
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
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.id,
        score: p.score
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
        player.score += addedScore;

        // Broadcast Success
        const dropPacket: DropCellIndexPacket = {
          type: GamePacketType.DROP_CELL_INDEX,
          winnerId: playerId,
          indices: indices,
          totalScore: player.score
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
        score: p.score
      }));
  }

  public getPlayerCount() {
    return this.players.size;
  }


}
