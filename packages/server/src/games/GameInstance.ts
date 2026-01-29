// import { Server } from 'socket.io'; todo 안 쓰고 있음.
import { GameType, GameConfig } from '../../../common/src/config';
import { GameStatus, PlayerState } from '../../../common/src/common-type';

export interface GameInstance {
  readonly gameType: GameType;

  // Lifecycle
  initialize(config: GameConfig, players: Map<string, PlayerState>): void;
  start(): void;
  stop(): void;
  destroy(): void;

  // State
  getStatus(): GameStatus;

  // Player actions (game-specific packets)
  handlePacket(socketId: string, playerIndex: number, packet: any): void;

  // Broadcast callback 설정
  setBroadcastCallback(callback: (packet: any) => void): void;
}
