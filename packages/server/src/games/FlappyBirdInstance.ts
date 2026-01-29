import Matter from 'matter-js';
import { GameInstance } from './GameInstance';
import {
  ResolvedFlappyBirdConfig,
  GameType,
  FlappyBirdGamePreset,
  resolveFlappyBirdPreset,
} from '../../../common/src/config';
import {
  FlappyBirdPacketType,
  FlappyBirdData,
  FlappyPipeData,
} from '../../../common/src/packets';
import { PlayerState } from '../../../common/src/common-type';

export class FlappyBirdInstance implements GameInstance {
  readonly gameType = GameType.FLAPPY_BIRD;

  // Matter.js (MockServerCore에서 이전)
  private engine: Matter.Engine;
  private world: Matter.World;
  private birds: Matter.Body[] = [];

  // Game state
  private status: 'waiting' | 'playing' | 'ended' = 'waiting';
  private score: number = 0;
  private pipes: FlappyPipeData[] = [];
  private config: ResolvedFlappyBirdConfig;

  // Loop
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly PHYSICS_FPS = 60;
  private readonly NETWORK_TICK_RATE = 20;
  private physicsTick: number = 0;

  private broadcastCallback: (packet: any) => void = () => {};
  private players: Map<string, PlayerState> = new Map();

  initialize(
    config: FlappyBirdGamePreset,
    players: Map<string, PlayerState>,
  ): void {
    this.players = players;
    this.config = resolveFlappyBirdPreset(config);
    this.initializePhysics();
    this.createBirds(players.size);
  }

  start(): void {
    this.status = 'playing';
    this.updateInterval = setInterval(
      () => this.physicsUpdate(),
      1000 / this.PHYSICS_FPS,
    );
  }

  stop(): void {
    this.status = 'ended';
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  handlePacket(socketId: string, playerIndex: number, packet: any): void {
    switch (packet.type) {
      case FlappyBirdPacketType.FLAPPY_JUMP:
        this.handleJump(playerIndex);
        break;
    }
  }

  // MockServerCore에서 이전할 메서드들
  private initializePhysics(): void {
    /* ... */
  }
  private createBirds(count: number): void {
    /* ... */
  }
  private physicsUpdate(): void {
    /* ... */
  }
  private handleJump(playerIndex: number): void {
    /* ... */
  }
  private checkCollisions(): void {
    /* ... */
  }
  private broadcastWorldState(): void {
    /* ... */
  }
}
