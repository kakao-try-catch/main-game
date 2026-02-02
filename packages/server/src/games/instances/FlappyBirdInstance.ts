import Matter from 'matter-js';
import { GameInstance } from './GameInstance';
import {
  FlappyBirdGamePreset,
  resolveFlappyBirdPreset,
  FLAPPY_PHYSICS,
} from '../../../../common/src/config';
import {
  FlappyBirdPacketType,
  FlappyScoreUpdatePacket,
  FlappyGameOverPacket,
  FlappyWorldStatePacket,
} from '../../../../common/src/packets';
import {
  FlappyPipeData,
  FlappyBirdData,
  FlappyRopeData,
  FlappyPlayerStats,
} from '../../../../common/src/common-type';
import { GameSession } from '../gameSession';
import { Socket } from 'socket.io';

// 상수 추출
const {
  GRAVITY_Y,
  BIRD_WIDTH,
  BIRD_HEIGHT,
  FLAP_VELOCITY,
  FLAP_VERTICAL_JITTER_RATIO,
  GAME_WIDTH,
  GAME_HEIGHT,
  FLAPPY_GROUND_Y,
  GAME_CENTER_X,
  CATEGORY_BIRD,
  CATEGORY_PIPE,
  CATEGORY_GROUND,
  FRICTION_AIR,
} = FLAPPY_PHYSICS;

/** 서버 내부용 파이프 데이터 (통과 추적 포함) */
interface InternalPipeData extends FlappyPipeData {
  passed: boolean;
  passedPlayers: number[];
}

export class FlappyBirdInstance implements GameInstance {
  // Matter.js
  private engine: Matter.Engine;
  private world: Matter.World;
  private birds: Matter.Body[] = [];
  private ground: Matter.Body | null = null;

  // 게임 상태
  private score: number = 0;
  private isRunning: boolean = false;
  private isGameOverState: boolean = false;
  private physicsTick: number = 0;

  // 파이프 관리
  private pipes: InternalPipeData[] = [];
  private nextPipeId: number = 0;

  // 플레이어 추적
  private lastFlapTime: Map<number, number> = new Map();
  private timeSinceLastBroadcast: number = 0;
  private startTime: number = 0;

  // 통계 추적
  private jumpCounts: Map<number, number> = new Map();
  private totalJumpIntervals: Map<number, number> = new Map();
  private lastJumpTime: Map<number, number> = new Map();

  // 밧줄 물리
  private ropeConnections: [number, number][] = [];

  // 설정 값 (initialize에서 설정)
  private pipeWidth: number = 120;
  private pipeGap: number = 200;
  private pipeSpacing: number = 400;
  private pipeSpeed: number = 1.5;
  private flapBoostBase: number = 0.3;
  private flapBoostRandom: number = 0.7;
  private ropeLength: number = 100;
  private connectAll: boolean = false;

  // 밧줄 스프링-댐퍼 물리 (클라이언트 렌더링과 일치)
  private ropeStiffness: number = 0.0003; // 스프링 강성
  private ropeDamping: number = 0.1; // 감쇠 계수
  private ropeRestLength: number = 70; // 자연 길이 (ropeLength의 70%)

  // 점프 힘 전달
  private forceTransferRate: number = 0.4; // 힘 전달 비율 (normal: 0.4)

  // 루프 관리
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly PHYSICS_FPS = 60;
  private readonly NETWORK_TICK_RATE = 60;

  private session: GameSession;

  constructor(session: GameSession) {
    this.session = session;

    // Matter.js 엔진 생성
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY_Y },
      enableSleeping: false,
      positionIterations: 10,
      velocityIterations: 10,
    });

    this.world = this.engine.world;
  }

  initialize(config: FlappyBirdGamePreset): void {
    // 프리셋을 실제 값으로 변환
    const resolved = resolveFlappyBirdPreset(config);

    // 기존 객체 제거
    Matter.World.clear(this.world, false);
    this.birds = [];
    this.score = 0;
    this.isGameOverState = false;
    this.pipes = [];
    this.nextPipeId = 0;
    this.lastFlapTime.clear();
    this.physicsTick = 0;
    this.timeSinceLastBroadcast = 0;
    this.startTime = Date.now();

    // 통계 초기화
    this.jumpCounts.clear();
    this.totalJumpIntervals.clear();
    this.lastJumpTime.clear();

    // 설정 적용
    this.pipeSpeed = resolved.pipeSpeed;
    this.pipeSpacing = resolved.pipeSpacing;
    this.pipeGap = resolved.pipeGap;
    this.pipeWidth = resolved.pipeWidth;
    this.flapBoostBase = resolved.flapBoostBase;
    this.flapBoostRandom = resolved.flapBoostRandom;
    this.ropeLength = resolved.ropeLength;
    this.connectAll = resolved.connectAll;

    // 밧줄 스프링-댐퍼 물리 설정 (클라이언트 렌더링과 일치)
    this.ropeRestLength = this.ropeLength * 0.7; // 자연 길이 70%
    this.ropeStiffness = 0.0003; // normal 프리셋 기본값
    this.ropeDamping = 0.1; // normal 프리셋 기본값

    console.log(
      `[FlappyBirdInstance] 설정 적용: speed=${resolved.pipeSpeed}, spacing=${resolved.pipeSpacing}, gap=${resolved.pipeGap}, width=${resolved.pipeWidth}, ropeLength=${resolved.ropeLength}, connectAll=${resolved.connectAll}`,
    );

    // 바닥 생성
    this.createGround();

    // 플레이어 수만큼 새 생성
    const playerCount = this.session.players.size;
    const playerIds = Array.from(this.session.players.keys());
    console.log(
      `[FlappyBirdInstance] Creating birds for ${playerCount} players: ${playerIds.join(', ')}`,
    );
    this.createBirds(playerCount);

    // 밧줄 연결 쌍 계산
    this.ropeConnections = this.calculateRopeConnections(playerCount);

    console.log(
      `[FlappyBirdInstance] 게임 초기화 완료 (플레이어: ${playerCount}, 새 개수: ${this.birds.length}, 밧줄 연결: ${this.ropeConnections.map((c) => `${c[0]}-${c[1]}`).join(', ')})`,
    );

    // 초기 상태 브로드캐스트하여 클라이언트 동기화
    this.broadcastWorldState();
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.session.status = 'playing';

    this.updateInterval = setInterval(
      () => this.physicsUpdate(),
      1000 / this.PHYSICS_FPS,
    );

    console.log('[FlappyBirdInstance] 게임 시작');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('[FlappyBirdInstance] 게임 정지');
  }

  destroy(): void {
    this.stop();

    this.birds = [];
    this.pipes = [];
    this.score = 0;
    this.nextPipeId = 0;
    this.isGameOverState = false;
    this.ground = null;
    this.lastFlapTime.clear();

    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);

    console.log('[FlappyBirdInstance] 정리 완료');
  }

  handlePacket(socket: Socket, playerIndex: number, packet: any): void {
    switch (packet.type) {
      case FlappyBirdPacketType.FLAPPY_JUMP:
        this.handleJump(playerIndex);
        break;
    }
  }

  // ========== 물리 생성 메서드 ==========

  private createGround(): void {
    this.ground = Matter.Bodies.rectangle(
      GAME_CENTER_X,
      FLAPPY_GROUND_Y + 500,
      GAME_WIDTH,
      1000,
      {
        isStatic: true,
        label: 'ground',
        collisionFilter: {
          category: CATEGORY_GROUND,
          mask: 0, // 물리 충돌 비활성화 - checkCollisions에서 처리
        },
      },
    );

    Matter.World.add(this.world, this.ground);
  }

  private createBirds(count: number): void {
    const positions = this.calculateBirdPositions(count);

    for (let i = 0; i < count; i++) {
      const { x, y } = positions[i];

      const bird = Matter.Bodies.rectangle(x, y, BIRD_WIDTH, BIRD_HEIGHT, {
        chamfer: { radius: 10 },
        density: 0.001,
        restitution: 0.2,
        friction: 0.1,
        frictionAir: FRICTION_AIR,
        label: 'bird',
        collisionFilter: {
          category: CATEGORY_BIRD,
          mask: CATEGORY_BIRD | CATEGORY_PIPE | CATEGORY_GROUND,
        },
      });

      this.birds.push(bird);
      Matter.World.add(this.world, bird);
    }

    console.log(
      `[FlappyBirdInstance] ${count}개의 새 생성 완료 (connectAll=${this.connectAll})`,
    );
  }

  /**
   * 새 초기 위치 계산
   * connectAll=false: 수평 일렬
   * connectAll=true: 3인 삼각형, 4인 마름모
   */
  private calculateBirdPositions(count: number): { x: number; y: number }[] {
    const centerX = 300;
    const centerY = 350;
    const spacing = 80;

    // 기본: 수평 일렬 배치
    if (!this.connectAll || count < 3) {
      const startX = 250;
      const startY = 300;
      return Array.from({ length: count }, (_, i) => ({
        x: startX + i * 90,
        y: startY + i * 3,
      }));
    }

    // 모두 묶기: 도형 형태로 배치
    if (count === 3) {
      // 삼각형
      return [
        { x: centerX, y: centerY - spacing * 0.6 },
        { x: centerX - spacing, y: centerY + spacing * 0.4 },
        { x: centerX + spacing, y: centerY + spacing * 0.4 },
      ];
    }

    if (count === 4) {
      // 마름모
      return [
        { x: centerX, y: centerY - spacing },
        { x: centerX - spacing, y: centerY },
        { x: centerX, y: centerY + spacing },
        { x: centerX + spacing, y: centerY },
      ];
    }

    // 5인 이상: 원형 배치
    return Array.from({ length: count }, (_, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        x: centerX + spacing * Math.cos(angle),
        y: centerY + spacing * Math.sin(angle),
      };
    });
  }

  /**
   * 밧줄 연결 쌍 계산
   * connectAll=false: 선형 연결 (0-1, 1-2, 2-3)
   * connectAll=true: 폐쇄형 도형 (3인+)
   */
  private calculateRopeConnections(playerCount: number): [number, number][] {
    if (playerCount < 2) return [];

    const connections: [number, number][] = [];
    for (let i = 0; i < playerCount - 1; i++) {
      connections.push([i, i + 1]);
    }

    // 모두 묶기: 마지막과 첫 번째 연결 (3인 이상)
    if (this.connectAll && playerCount >= 3) {
      connections.push([playerCount - 1, 0]);
    }

    return connections;
  }

  // ========== 게임 루프 ==========

  private physicsUpdate(): void {
    this.physicsTick++;

    // 1. 파이프 업데이트
    this.updatePipes();

    // 2. 개별 새 물리 제어
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      if (bird.isStatic) continue;

      if (this.isGameOverState) {
        // 게임 오버 시 수평 속도 감소
        Matter.Body.setVelocity(bird, {
          x: bird.velocity.x * 0.95,
          y: bird.velocity.y,
        });
        continue;
      }

      // 기본 전진 속도 유지
      const baseForwardSpeed = this.pipeSpeed * 1.5;
      const currentVelX = bird.velocity.x;

      // 마지막 점프 이후 경과 프레임
      const lastFlap = this.lastFlapTime.get(i) ?? 0;
      const framesSinceFlap = this.physicsTick - lastFlap;

      // 점프하지 않은 시간이 길수록 감속
      const noFlapPenalty = framesSinceFlap > 30 ? 0.97 : 0.995;

      let newVelX: number;
      if (currentVelX < baseForwardSpeed) {
        newVelX = currentVelX + 0.05;
      } else {
        newVelX = currentVelX * noFlapPenalty;
      }

      Matter.Body.setVelocity(bird, {
        x: newVelX,
        y: bird.velocity.y,
      });
    }

    // 3. 밧줄 스프링-댐퍼 힘 적용 (클라이언트 렌더링과 일치)
    this.applyRopeSpringForce();

    // 4. 밧줄 최대 길이 제한 (하드 제약, 안전장치)
    this.enforceRopeConstraint();

    // 5. velocityY 기반 새 각도 업데이트
    for (const bird of this.birds) {
      if (!bird.isStatic) {
        const angleDeg = Math.max(-30, Math.min(90, bird.velocity.y * 10));
        Matter.Body.setAngle(bird, angleDeg * (Math.PI / 180));
      }
    }

    // 6. 물리 서브스테핑 (바닥 뚫림 방지)
    const subSteps = 5;
    const stepTime = 1000 / 60 / subSteps;
    for (let s = 0; s < subSteps; s++) {
      Matter.Engine.update(this.engine, stepTime);
      this.checkCollisions();
    }

    // 7. 네트워크 브로드캐스트 (40Hz)
    this.timeSinceLastBroadcast += 1000 / this.PHYSICS_FPS;
    const networkInterval = 1000 / this.NETWORK_TICK_RATE;
    if (this.timeSinceLastBroadcast >= networkInterval) {
      this.broadcastWorldState();
      this.timeSinceLastBroadcast -= networkInterval;
    }
  }

  private updatePipes(): void {
    if (this.isGameOverState) return;

    // 새들의 평균 X 위치 계산 (카메라 기준점)
    let avgBirdX = 250;
    if (this.birds.length > 0) {
      let totalX = 0;
      for (const bird of this.birds) {
        totalX += bird.position.x;
      }
      avgBirdX = totalX / this.birds.length;
    }

    // 화면 밖 파이프 제거
    this.pipes = this.pipes.filter((pipe) => pipe.x > avgBirdX - GAME_WIDTH);

    // 카메라 뷰 범위 계산
    const viewRight = avgBirdX + (GAME_WIDTH * 3) / 4;
    const spawnAhead = GAME_WIDTH;
    const targetX = viewRight + spawnAhead;

    // 파이프 생성
    let maxPipeX =
      this.pipes.length > 0
        ? Math.max(...this.pipes.map((p) => p.x))
        : avgBirdX - GAME_WIDTH / 4;

    while (maxPipeX < targetX) {
      const newPipeX =
        this.pipes.length === 0
          ? viewRight + this.pipeSpacing
          : maxPipeX + this.pipeSpacing;
      this.createPipe(newPipeX);
      maxPipeX = newPipeX;
    }
  }

  private createPipe(x: number): void {
    const minGapY = GAME_HEIGHT * 0.1;
    const maxGapY = GAME_HEIGHT * 0.5;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);

    const pipe: InternalPipeData = {
      id: this.nextPipeId++,
      x,
      gapY,
      width: this.pipeWidth,
      gap: this.pipeGap,
      passed: false,
      passedPlayers: [],
    };

    this.pipes.push(pipe);
  }

  // ========== 충돌 감지 ==========

  private checkCollisions(): void {
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      if (bird.isStatic) continue;

      // 1. 바닥 충돌
      const birdBottom = bird.position.y + BIRD_HEIGHT / 2;
      if (birdBottom >= FLAPPY_GROUND_Y) {
        Matter.Body.setPosition(bird, {
          x: bird.position.x,
          y: FLAPPY_GROUND_Y - BIRD_HEIGHT / 2,
        });
        Matter.Body.setVelocity(bird, { x: 0, y: 0 });
        Matter.Body.setStatic(bird, true);
        Matter.Body.setAngle(bird, Math.PI / 2);
        this.handleGameOver('ground_collision', i);
        continue;
      }

      // 2. 천장 충돌 (죽지 않고 막기만)
      if (bird.position.y - BIRD_HEIGHT / 2 <= 0) {
        Matter.Body.setPosition(bird, {
          x: bird.position.x,
          y: BIRD_HEIGHT / 2,
        });
        if (bird.velocity.y < 0) {
          Matter.Body.setVelocity(bird, { x: bird.velocity.x, y: 0 });
        }
      }

      // 3. 왼쪽 벽 충돌 (죽지 않고 막기만)
      if (bird.position.x - BIRD_WIDTH / 2 <= 0) {
        Matter.Body.setPosition(bird, {
          x: BIRD_WIDTH / 2,
          y: bird.position.y,
        });
        if (bird.velocity.x < 0) {
          Matter.Body.setVelocity(bird, { x: 0, y: bird.velocity.y });
        }
      }

      // 4. 파이프 충돌
      const birdX = bird.position.x;
      const birdY = bird.position.y;
      const hitboxSize = 36;
      const halfHitbox = hitboxSize / 2;

      for (const pipe of this.pipes) {
        const halfPipeW = pipe.width / 2;
        const pipeLeft = pipe.x - halfPipeW;
        const pipeRight = pipe.x + halfPipeW;

        // X축 충돌 체크
        if (birdX + halfHitbox < pipeLeft || birdX - halfHitbox > pipeRight) {
          continue;
        }

        const gapTop = pipe.gapY - pipe.gap / 2;
        const gapBottom = pipe.gapY + pipe.gap / 2;

        // Y축 충돌: 새가 갭 밖에 있으면 충돌
        if (birdY - halfHitbox < gapTop || birdY + halfHitbox > gapBottom) {
          this.handleGameOver('pipe_collision', i);
          return;
        }

        // 통과 판정
        if (!pipe.passedPlayers.includes(i) && birdX - halfHitbox > pipe.x) {
          pipe.passedPlayers.push(i);

          // 모든 플레이어가 통과했을 때만 점수 증가
          if (pipe.passedPlayers.length === this.birds.length && !pipe.passed) {
            pipe.passed = true;
            this.score++;

            const scorePacket: FlappyScoreUpdatePacket = {
              type: FlappyBirdPacketType.FLAPPY_SCORE_UPDATE,
              score: this.score,
            };
            this.session.broadcastPacket(scorePacket);

            console.log(`[FlappyBirdInstance] 점수 업데이트: ${this.score}`);
          }
        }
      }
    }
  }

  // ========== 게임 오버 ==========

  private handleGameOver(
    reason: 'pipe_collision' | 'ground_collision',
    playerIndex: number,
  ): void {
    if (this.isGameOverState) return;

    this.isGameOverState = true;
    this.session.stopGame();

    const gameDuration = Date.now() - this.startTime;
    const players = Array.from(this.session.players.values());
    const collidedPlayer = players[playerIndex];
    const collidedPlayerName =
      collidedPlayer?.playerName || `Player ${playerIndex + 1}`;

    // 통계 빌드
    const playerStats: FlappyPlayerStats[] = players.map((p, idx) => {
      const jumpCount = this.jumpCounts.get(idx) || 0;
      const totalInterval = this.totalJumpIntervals.get(idx) || 0;
      const avgJumpInterval =
        jumpCount > 1 ? totalInterval / (jumpCount - 1) : 0;

      return {
        playerIndex: idx,
        playerName: p.playerName,
        playerColor: p.color,
        jumpCount,
        avgJumpInterval,
      };
    });

    const gameOverPacket: FlappyGameOverPacket = {
      type: FlappyBirdPacketType.FLAPPY_GAME_OVER,
      reason,
      finalScore: this.score,
      collidedPlayerIndex: playerIndex,
      collidedPlayerName,
      gameDuration,
      playerStats,
    };
    this.session.broadcastPacket(gameOverPacket);

    console.log(
      `[FlappyBirdInstance] 게임 오버: ${reason} (Player ${playerIndex}), Duration: ${gameDuration}ms`,
    );
  }

  // ========== 입력 처리 ==========

  private handleJump(playerIndex: number): void {
    if (this.isGameOverState) return;

    if (playerIndex >= 0 && playerIndex < this.birds.length) {
      const bird = this.birds[playerIndex];

      // 점프 시간 기록
      this.lastFlapTime.set(playerIndex, this.physicsTick);

      // 통계 기록
      const now = Date.now();
      const count = (this.jumpCounts.get(playerIndex) || 0) + 1;
      this.jumpCounts.set(playerIndex, count);

      const lastTime = this.lastJumpTime.get(playerIndex);
      if (lastTime) {
        const interval = now - lastTime;
        const totalInterval =
          (this.totalJumpIntervals.get(playerIndex) || 0) + interval;
        this.totalJumpIntervals.set(playerIndex, totalInterval);
      }
      this.lastJumpTime.set(playerIndex, now);

      // 1. 점프하는 새에 기본 힘 적용
      const extraBoost =
        this.flapBoostBase + Math.random() * this.flapBoostRandom;
      const verticalJitter =
        (Math.random() - 0.5) *
        Math.abs(FLAP_VELOCITY) *
        FLAP_VERTICAL_JITTER_RATIO;

      Matter.Body.setVelocity(bird, {
        x: bird.velocity.x + extraBoost,
        y: FLAP_VELOCITY + verticalJitter,
      });

      Matter.Body.setAngularVelocity(bird, 0);

      // 2. 연결된 새들에게 부분 힘 전달
      this.transferJumpForceToConnectedBirds(playerIndex);
    }
  }

  /**
   * 점프한 새와 연결된 다른 새들에게 일부 힘을 전달
   * 거리가 가까울수록 더 많은 힘이 전달됨
   */
  private transferJumpForceToConnectedBirds(jumperIndex: number): void {
    const jumpingBird = this.birds[jumperIndex];

    for (const [indexA, indexB] of this.ropeConnections) {
      // 점프한 새와 연결된 경우만 처리
      if (indexA !== jumperIndex && indexB !== jumperIndex) continue;

      const connectedIndex = indexA === jumperIndex ? indexB : indexA;
      const connectedBird = this.birds[connectedIndex];

      if (!connectedBird || connectedBird.isStatic) continue;

      // 힘 전달 비율 계산 (거리에 반비례)
      const transferRatio = this.calculateForceTransferRatio(
        jumpingBird,
        connectedBird,
      );

      // 부분 점프력 전달 (위로 당기는 힘)
      const transferredVelocityY =
        FLAP_VELOCITY * transferRatio * this.forceTransferRate;

      // 직접 속도 변경 대신 힘으로 적용 (더 자연스러움)
      Matter.Body.applyForce(connectedBird, connectedBird.position, {
        x: 0,
        y: transferredVelocityY * connectedBird.mass * 0.1,
      });

      console.log(
        `[FlappyBirdInstance] 힘 전달: Player ${jumperIndex} -> Player ${connectedIndex}, ratio: ${transferRatio.toFixed(2)}`,
      );
    }
  }

  /**
   * 두 새 사이의 거리에 따른 힘 전달 비율 계산
   * 가까울수록 더 많은 힘이 전달됨
   *
   * @returns 0.0 ~ 1.0 사이의 비율
   */
  private calculateForceTransferRatio(
    birdA: Matter.Body,
    birdB: Matter.Body,
  ): number {
    const dx = birdB.position.x - birdA.position.x;
    const dy = birdB.position.y - birdA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 거리가 0이면 최대 전달, 밧줄 길이면 0
    // 선형 보간: ratio = 1 - (distance / ropeLength)
    const ratio = 1 - distance / this.ropeLength;

    // 0 ~ 1 범위로 클램핑
    return Math.max(0, Math.min(1, ratio));
  }

  // ========== 밧줄 물리 ==========

  /**
   * 스프링-댐퍼 힘 적용 (클라이언트 렌더링과 일치)
   * Hooke's Law + Damping Force
   */
  private applyRopeSpringForce(): void {
    for (const [indexA, indexB] of this.ropeConnections) {
      const birdA = this.birds[indexA];
      const birdB = this.birds[indexB];
      if (!birdA || !birdB) continue;

      const dx = birdB.position.x - birdA.position.x;
      const dy = birdB.position.y - birdA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) continue;

      // 단위 벡터
      const nx = dx / distance;
      const ny = dy / distance;

      // 스프링 힘 (자연 길이에서 벗어난 정도에 비례)
      const displacement = distance - this.ropeRestLength;
      const springForce = this.ropeStiffness * displacement;

      // 감쇠 힘 (상대 속도의 밧줄 방향 성분)
      const relVx = birdB.velocity.x - birdA.velocity.x;
      const relVy = birdB.velocity.y - birdA.velocity.y;
      const relVelAlongRope = relVx * nx + relVy * ny;
      const dampingForce = this.ropeDamping * relVelAlongRope;

      // 총 힘
      const totalForce = springForce + dampingForce;

      // 각 새에 힘 적용 (반대 방향)
      const forceX = totalForce * nx;
      const forceY = totalForce * ny;

      Matter.Body.applyForce(birdA, birdA.position, {
        x: forceX * 0.5,
        y: forceY * 0.5,
      });
      Matter.Body.applyForce(birdB, birdB.position, {
        x: -forceX * 0.5,
        y: -forceY * 0.5,
      });
    }
  }

  private enforceRopeConstraint(): void {
    for (const [indexA, indexB] of this.ropeConnections) {
      const birdA = this.birds[indexA];
      const birdB = this.birds[indexB];
      if (!birdA || !birdB) continue;

      const dx = birdB.position.x - birdA.position.x;
      const dy = birdB.position.y - birdA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0) continue;

      if (distance > this.ropeLength) {
        const nx = dx / distance;
        const ny = dy / distance;
        const excess = distance - this.ropeLength;
        const correction = excess / 2;

        // 위치 보정
        Matter.Body.setPosition(birdA, {
          x: birdA.position.x + nx * correction,
          y: birdA.position.y + ny * correction,
        });
        Matter.Body.setPosition(birdB, {
          x: birdB.position.x - nx * correction,
          y: birdB.position.y - ny * correction,
        });

        // 속도 보정
        const relVx = birdB.velocity.x - birdA.velocity.x;
        const relVy = birdB.velocity.y - birdA.velocity.y;
        const separatingSpeed = relVx * nx + relVy * ny;
        if (separatingSpeed > 0) {
          const adjust = separatingSpeed / 2;
          Matter.Body.setVelocity(birdA, {
            x: birdA.velocity.x + nx * adjust,
            y: birdA.velocity.y + ny * adjust,
          });
          Matter.Body.setVelocity(birdB, {
            x: birdB.velocity.x - nx * adjust,
            y: birdB.velocity.y - ny * adjust,
          });
        }
      }
    }
  }

  /**
   * 밧줄 정점 계산 (선형 보간) - MockServerCore.ts와 동일
   */
  private calculateRopePoints(): FlappyRopeData[] {
    const ropes: FlappyRopeData[] = [];
    const segments = 10;

    for (const [indexA, indexB] of this.ropeConnections) {
      const birdA = this.birds[indexA];
      const birdB = this.birds[indexB];
      if (!birdA || !birdB) continue;

      const points: { x: number; y: number }[] = [];

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        points.push({
          x: birdA.position.x + (birdB.position.x - birdA.position.x) * t,
          y: birdA.position.y + (birdB.position.y - birdA.position.y) * t,
        });
      }

      ropes.push({ points });
    }

    return ropes;
  }

  // ========== 브로드캐스트 ==========

  private broadcastWorldState(): void {
    // 카메라 X 계산 (새들 평균 위치)
    let cameraX = 250;
    if (this.birds.length > 0) {
      let totalX = 0;
      for (const bird of this.birds) {
        totalX += bird.position.x;
      }
      cameraX = totalX / this.birds.length;
    }

    // FlappyBirdData로 변환
    const birds: FlappyBirdData[] = this.birds.map((bird) => ({
      x: bird.position.x,
      y: bird.position.y,
      vx: bird.velocity.x,
      vy: bird.velocity.y,
      angle: bird.angle * (180 / Math.PI),
    }));

    // FlappyPipeData로 변환 (내부 추적 필드 제거)
    const pipes: FlappyPipeData[] = this.pipes.map((pipe) => ({
      id: pipe.id,
      x: pipe.x,
      gapY: pipe.gapY,
      width: pipe.width,
      gap: pipe.gap,
    }));

    // 밧줄 정점 계산
    const ropes: FlappyRopeData[] = this.calculateRopePoints();

    const worldStatePacket: FlappyWorldStatePacket = {
      type: FlappyBirdPacketType.FLAPPY_WORLD_STATE,
      tick: this.physicsTick,
      birds,
      pipes,
      ropes,
      cameraX,
    };

    this.session.broadcastPacket(worldStatePacket);
  }
}
