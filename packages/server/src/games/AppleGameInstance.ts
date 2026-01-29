import { GameInstance } from './GameInstance';
import { AppleGameConfig, GameType } from '../../../common/src/config';
import {
  AppleGamePacket,
  AppleGamePacketType,
} from '../../../common/src/packets';
import { GameStatus } from '../../../common/src/common-type';
import { PlayerState } from '../../../common/src/common-type';

export class AppleGameInstance implements GameInstance {
  readonly gameType = GameType.APPLE_GAME;

  private status: GameStatus = 'waiting';
  private apples: number[] = [];
  private removedIndices: Set<number> = new Set();
  private timerInterval: NodeJS.Timeout | null = null;
  private timeLeft: number = 0;
  private broadcastCallback: (packet: any) => void = () => {};
  private players: Map<string, PlayerState> = new Map();

  // 기존 gameSession.ts에서 Apple 전용 로직 이동
  initialize(config: AppleGameConfig, players: Map<string, PlayerState>): void {
    this.players = players;
    this.timeLeft = config.time;
    this.removedIndices.clear();
    this.generateField(config);
  }

  start(): void {
    this.status = 'playing';
    // this.broadcastField();
    this.startTimer();
  }

  stop(): void {
    this.status = 'ended';
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  destory() {}

  handlePacket(
    socketId: string,
    playerIndex: number,
    packet: AppleGamePacket,
  ): void {
    switch (packet.type) {
      case AppleGamePacketType.DRAWING_DRAG_AREA:
        // 브로드캐스트 로직
        break;
      case AppleGamePacketType.CONFIRM_DRAG_AREA:
        this.handleDragConfirm(socketId, packet.indices);
        break;
    }
  }

  // 기존 gameSession.ts의 Apple 전용 메서드들 이동
  private generateField(config: AppleGameConfig): void {
    /* ... */
  }
  private handleDragConfirm(playerId: string, indices: number[]): void {
    /* ... */
  }
  private startTimer(): void {
    /* ... */
  }
  private finishGame(): void {
    /* ... */
  }
}
