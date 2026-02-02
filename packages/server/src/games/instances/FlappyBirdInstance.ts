import Matter from 'matter-js';
import { GameInstance } from './GameInstance';
import {
  ResolvedFlappyBirdConfig,
  GameType,
  FlappyBirdGamePreset,
  resolveFlappyBirdPreset,
} from '../../../../common/src/config';
import { FlappyBirdPacketType } from '../../../../common/src/packets';
import {
  FlappyPipeData,
  PlayerState,
} from '../../../../common/src/common-type';
import { GameSession } from '../../../../common/src/config';

export class FlappyBirdInstance implements GameInstance {
  // Matter.js (MockServerCore에서 이전)
  private engine: Matter.Engine;
  private world: Matter.World;
  private birds: Matter.Body[] = [];

  private score: number = 0;
  private pipes: FlappyPipeData[] = [];
  private config: ResolvedFlappyBirdConfig;

  // Loop
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly PHYSICS_FPS = 60;
  private readonly NETWORK_TICK_RATE = 20;
  private physicsTick: number = 0;

  private session: GameSession;

  constructor(session: GameSession) {
    this.session = session;
  }

  initialize(config: FlappyBirdGamePreset): void {
    this.config = resolveFlappyBirdPreset(config);
    this.initializePhysics();
    this.createBirds(players.size);
  }

  start(): void {
    this.session.status = 'playing';
    this.updateInterval = setInterval(
      () => this.physicsUpdate(),
      1000 / this.PHYSICS_FPS,
    );
  }

  stop(): void {
    this.session.status = 'ended';
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  destroy(): void {}

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
