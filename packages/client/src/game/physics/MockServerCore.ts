import Matter from 'matter-js';
import type {
  BirdPosition,
  RopeData,
  PlayerId,
  PipeData,
} from '../types/flappybird.types';
import type { ResolvedFlappyBirdConfig } from '../types/FlappyBirdGamePreset';
import { MockSocket } from '../network/MockSocket';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  FLAPPY_GROUND_Y,
  GAME_CENTER_X,
} from '../config/gameConfig';

/**
 * 충돌 카테고리
 */
const CATEGORY_BIRD = 0x0001;
const CATEGORY_PIPE = 0x0002;
const CATEGORY_GROUND = 0x0004;

/**
 * MockServerCore - 서버 역할을 대신하는 로컬 물리 엔진
 * 실제 서버 개발 완료 시 이 로직을 서버로 이전할 수 있습니다.
 */
export class MockServerCore {
  private engine: Matter.Engine;
  private world: Matter.World;
  private birds: Matter.Body[] = [];
  private ground: Matter.Body | null = null;
  private socket: MockSocket;
  private updateInterval: number | null = null;
  private score: number = 0;
  private isRunning: boolean = false;
  private playerCount: number = 4;

  // 파이프 관련
  private pipes: PipeData[] = [];
  private nextPipeId: number = 0;
  private screenWidth: number = GAME_WIDTH;
  private screenHeight: number = GAME_HEIGHT;

  // 물리 파라미터
  private readonly GRAVITY_Y = 1.2; // 더 빨리 떨어지도록 상향 (0.8 -> 1.2)
  private readonly BIRD_WIDTH = 80; // 57 * 1.4 (해상도 변경 반영)
  private readonly BIRD_HEIGHT = 50; // 36 * 1.4 (해상도 변경 반영)
  private readonly FLAP_VELOCITY = -10; // 플랩 정도
  private isGameOverState: boolean = false; // 게임 오버 상태 추적

  // 밧줄 물리 파라미터
  private readonly IDEAL_LENGTH = 100; // 밧줄 여유 길이 단축 (120 -> 100)
  private readonly ROPE_STIFFNESS = 0.3; // 밧줄 장력 최대치 근사값
  private readonly ROPE_SOFTNESS = 50; // 장력 완화 계수 (로그 함수 대체용)

  // 파이프 파라미터
  private readonly PIPE_WIDTH = 80;
  private readonly PIPE_GAP = 200;
  private pipeSpacing: number = 400; // 파이프 간 거리

  // 파이프 속도 관리 (원래 속도 1.5로 복구)
  private pipeSpeed: number = 1.5;

  constructor(socket: MockSocket) {
    this.socket = socket;
    socket.setServerCore(this);

    // Matter.js 엔진 생성
    this.engine = Matter.Engine.create({
      gravity: {
        x: 0,
        y: this.GRAVITY_Y,
      },
      enableSleeping: false,
      // 물리 정밀도 향상 (빠른 낙하 시 바닥 뚫림 방지)
      positionIterations: 10,
      velocityIterations: 10,
    });

    this.world = this.engine.world;

    console.log('[MockServerCore] 초기화됨');
  }

  /**
   * 플레이어 수 설정
   */
  setPlayerCount(count: number) {
    this.playerCount = count;
    console.log(`[MockServerCore] 플레이어 수 설정: ${count}`);
  }

  /**
   * 게임 초기화
   * @param config 게임 설정
   */
  initialize(config?: ResolvedFlappyBirdConfig) {
    // 기존 객체 제거
    Matter.World.clear(this.world, false);
    this.birds = [];
    this.score = 0;
    this.isGameOverState = false;
    this.pipes = [];
    this.nextPipeId = 0;

    // 설정 적용
    if (config) {
      this.pipeSpeed = config.pipeSpeed;
      this.pipeSpacing = config.pipeSpacing;
    }

    // 바닥 생성
    this.createGround();

    // 설정된 플레이어 수만큼 새 생성
    this.createBirds(this.playerCount);

    // ※ 이제 고정된 Constraint 대신 update 루프에서 동적인 장력을 계산하여 적용합니다.

    console.log('[MockServerCore] 게임 초기화 완료');
  }

  /**
   * 바닥 생성
   */
  private createGround() {
    // x: GAME_CENTER_X, y: FLAPPY_GROUND_Y + 500 = 1300, width: GAME_WIDTH, height: 1000
    // 상단 표면(FLAPPY_GROUND_Y)은 유지하되, 두께를 1000px로 대폭 늘려 터널링(뛫림) 현상 방지
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
          mask: CATEGORY_BIRD,
        },
        friction: 0.5,
        restitution: 0.2, // 약간의 탄성
      },
    );

    Matter.World.add(this.world, this.ground);
  }

  /**
   * 새 생성
   */
  private createBirds(count: number) {
    const startX = 250; // 좀 더 앞쪽에서 시작
    const startY = 300;
    const spacing = 90; // 새들 사이 간격을 촘촘하게 (120 -> 90)

    for (let i = 0; i < count; i++) {
      // 각 새에 약간의 Y 오프셋을 주어 초기 장력 생성 (물리 안정화)
      const yOffset = i * 3; // 0, 5, 10, 15 픽셀 차이

      // 새의 형태가 57*36 이므로 원형보다는 직사각형(또는 둥근 사각형)이 적합
      const bird = Matter.Bodies.rectangle(
        startX + i * spacing,
        startY + yOffset,
        this.BIRD_WIDTH,
        this.BIRD_HEIGHT,
        {
          chamfer: { radius: 10 }, // 모서리를 약간 둥글게 처리
          density: 0.001,
          restitution: 0.5,
          friction: 0.1,
          frictionAir: 0.05,
          label: 'bird',
          collisionFilter: {
            category: CATEGORY_BIRD,
            mask: CATEGORY_BIRD | CATEGORY_PIPE | CATEGORY_GROUND, // 서로 튕겨나가도록 다시 추가 (게임오버는 아님)
          },
        },
      );

      this.birds.push(bird);
      Matter.World.add(this.world, bird);
    }

    console.log(`[MockServerCore] ${count}개의 새 생성 완료 (초기 장력 적용)`);
  }

  /**
   * 게임 시작 (60fps 물리 업데이트)
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000 / 60); // 60fps

    console.log('[MockServerCore] 게임 시작 (60fps)');
  }

  /**
   * 게임 정지
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;

    console.log('[MockServerCore] 게임 정지');
  }

  /**
   * 물리 업데이트 및 브로드캐스트
   */
  private update() {
    // 1. 파이프 업데이트 (전체 상태에 대해 한 번만)
    this.updatePipes();

    // 2. 개별 새 물리 제어
    for (const bird of this.birds) {
      if (bird.isStatic) continue;

      if (this.isGameOverState) {
        // 게임 오버 시에는 수평 속도를 서서히 줄임
        Matter.Body.setVelocity(bird, {
          x: bird.velocity.x * 0.95,
          y: bird.velocity.y,
        });
        continue;
      }

      // 고정된 위치(startX)로 돌아가려는 복원력 적용 (관성을 위해 점진적으로 조정)
      const birdIndex = this.birds.indexOf(bird);
      const startX = 250 + birdIndex * 90; // 줄어든 간격 반영
      const currentX = bird.position.x;

      // 복원력과 저항의 밸런스 조정 (0.1로 높여 더 쫀득하게 복귀)
      const targetRestoringVX = (startX - currentX) * 0.1;
      const newVX = bird.velocity.x * 0.85 + targetRestoringVX;

      Matter.Body.setVelocity(bird, {
        x: newVX,
        y: bird.velocity.y,
      });
    }

    // 3. 가변 장력 적용
    this.applyDynamicTension();

    // 2. 물리 서브스테핑 (바닥 뚫림 현상 완벽 차단)
    // 60fps 프레임을 5번으로 쪼개서 정밀 연산
    const subSteps = 5;
    const stepTime = 1000 / 60 / subSteps;
    for (let s = 0; s < subSteps; s++) {
      Matter.Engine.update(this.engine, stepTime);
      this.checkCollisions(); // 매 세부 단계마다 충돌 검사
    }

    // 4. 위치 데이터 생성
    const birds: BirdPosition[] = this.birds.map((bird, index) => ({
      playerId: String(index) as PlayerId,
      x: bird.position.x,
      y: bird.position.y,
      velocityX: bird.velocity.x,
      velocityY: bird.velocity.y,
      angle: bird.angle * (180 / Math.PI),
    }));

    // 5. 밧줄 정점 계산
    const ropes: RopeData[] = this.calculateRopePoints();

    // 6. 클라이언트로 브로드캐스트
    this.socket.triggerEvent('update_positions', {
      timestamp: Date.now(),
      birds,
      ropes,
      pipes: this.pipes,
    });
  }

  /**
   * 동적 장력 계산 및 적용
   * 거리가 멀수록(팽팽할수록) 서로를 당기는 힘이 강해집니다.
   */
  private applyDynamicTension() {
    for (let i = 0; i < this.birds.length - 1; i++) {
      const birdA = this.birds[i];
      const birdB = this.birds[i + 1];

      const dx = birdB.position.x - birdA.position.x;
      const dy = birdB.position.y - birdA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 1. 인장력(Tension) 계산: 유리 함수(Rational Function)를 사용하여 로그 함수와 유사한 곡선 구현
      // 연산 비용이 높은 Math.log 대신 (x * a) / (x + b) 형태의 산술 연산으로 대체
      if (distance > this.IDEAL_LENGTH) {
        const stretch = distance - this.IDEAL_LENGTH;

        // (stretch * 0.3) / (stretch + 50) 은 0.05 * log(1+stretch)와 매우 유사한 감쇠 곡선을 가짐
        const forceMagnitude =
          (stretch * this.ROPE_STIFFNESS) / (stretch + this.ROPE_SOFTNESS);

        const ux = dx / distance;
        const uy = dy / distance;

        // Bird A를 Bird B 쪽으로 당김
        Matter.Body.applyForce(birdA, birdA.position, {
          x: ux * forceMagnitude,
          y: uy * forceMagnitude,
        });

        // Bird B를 Bird A 쪽으로 당김
        Matter.Body.applyForce(birdB, birdB.position, {
          x: -ux * forceMagnitude,
          y: -uy * forceMagnitude,
        });
      }
    }
  }

  /**
   * 밧줄 정점 계산 (선형 보간)
   */
  private calculateRopePoints(): RopeData[] {
    const ropes: RopeData[] = [];
    const segments = 10;

    for (let i = 0; i < this.birds.length - 1; i++) {
      const birdA = this.birds[i];
      const birdB = this.birds[i + 1];
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

  /**
   * 충돌 감지
   */
  private checkCollisions() {
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      if (bird.isStatic) continue;

      // 1. 바닥과의 충돌 (상단 표면 FLAPPY_GROUND_Y 기준)
      if (bird.position.y + this.BIRD_HEIGHT / 2 >= FLAPPY_GROUND_Y) {
        Matter.Body.setPosition(bird, {
          x: bird.position.x,
          y: FLAPPY_GROUND_Y - this.BIRD_HEIGHT / 2,
        });
        Matter.Body.setVelocity(bird, { x: 0, y: 0 });
        Matter.Body.setStatic(bird, true);
        this.handleGameOver('ground_collision', String(i) as PlayerId);
        continue;
      }

      // 2. 파이프와의 충돌
      const birdX = bird.position.x;
      const birdY = bird.position.y;
      const halfBirdW = this.BIRD_WIDTH / 2;
      const halfBirdH = this.BIRD_HEIGHT / 2;

      for (const pipe of this.pipes) {
        const halfPipeW = pipe.width / 2;

        // X축 겹침 확인
        if (
          birdX + halfBirdW > pipe.x - halfPipeW &&
          birdX - halfBirdW < pipe.x + halfPipeW
        ) {
          const gapTop = pipe.gapY - pipe.gap / 2;
          const gapBottom = pipe.gapY + pipe.gap / 2;

          // 상단 파이프 충돌 (새의 상단이 갭 상단보다 위에 있을 때)
          // 하단 파이프 충돌 (새의 하단이 갭 하단보다 아래에 있을 때)
          if (birdY - halfBirdH < gapTop || birdY + halfBirdH > gapBottom) {
            this.handleGameOver('pipe_collision', String(i) as PlayerId);
            return; // 한 명이라도 부딪히면 종료
          }
        }

        // 통과 판정 (새의 X 좌표가 파이프의 오른쪽 끝을 지났을 때)
        const playerId = String(i) as PlayerId;
        if (!pipe.passedPlayers.includes(playerId) && birdX > pipe.x) {
          pipe.passedPlayers.push(playerId);

          // 모든 플레이어가 통과했을 때만 점수 증가 (팀 점수)
          if (pipe.passedPlayers.length === this.birds.length && !pipe.passed) {
            pipe.passed = true;
            this.score++;

            // 점수 업데이트 이벤트 전달
            this.socket.triggerEvent('score_update', {
              score: this.score,
              timestamp: Date.now(),
            });

            console.log(`[MockServerCore] 점수 업데이트: ${this.score}`);
          }
        }
      }
    }
  }

  /**
   * 게임 오버 처리
   */
  private handleGameOver(
    reason: 'pipe_collision' | 'ground_collision',
    playerId: PlayerId = '0',
  ) {
    if (this.isGameOverState) return;

    this.isGameOverState = true;
    // 이제 즉시 stop()을 부르지 않고 물리 시뮬레이션은 계속 유지합니다.

    this.socket.triggerEvent('game_over', {
      reason,
      finalScore: this.score,
      collidedPlayerId: playerId,
      timestamp: Date.now(),
    });

    console.log(
      `[MockServerCore] 게임 오버 발생: ${reason} (Player ${playerId})`,
    );
  }

  /**
   * 클라이언트 이벤트 처리
   */
  handleClientEvent(event: string, data: { playerId: PlayerId }) {
    switch (event) {
      case 'flap':
        this.handleFlap(data.playerId);
        break;
      case 'restart_game':
        this.initialize();
        this.start();
        break;
      default:
        console.log(`[MockServerCore] 알 수 없는 이벤트: ${event}`);
    }
  }

  /**
   * Flap 처리
   */
  private handleFlap(playerId: PlayerId) {
    if (this.isGameOverState) return; // 게임 오버 상태면 입력 무시

    const birdIndex = parseInt(playerId);
    if (birdIndex >= 0 && birdIndex < this.birds.length) {
      const bird = this.birds[birdIndex];

      Matter.Body.setVelocity(bird, {
        x: bird.velocity.x + 5.0, // 전진 파워 대폭 강화 (2.5 -> 5.0)
        y: this.FLAP_VELOCITY,
      });

      console.log(`[MockServerCore] Player ${playerId} Flap!`);
    }
  }

  private createPipe(x: number) {
    const minGapY = this.screenHeight * 0.1;
    const maxGapY = this.screenHeight * 0.5;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);

    const pipe: PipeData = {
      id: `pipe_${this.nextPipeId++}`,
      x,
      gapY,
      width: this.PIPE_WIDTH,
      gap: this.PIPE_GAP,
      passed: false,
      passedPlayers: [],
    };

    this.pipes.push(pipe);
  }

  private updatePipes() {
    if (this.isGameOverState) return; // 게임 오버 시 파이프 정지

    // 파이프 이동 (일정한 속도 유지)
    for (const pipe of this.pipes) {
      pipe.x -= this.pipeSpeed;
    }

    // 화면 밖으로 나간 파이프 제거
    this.pipes = this.pipes.filter((pipe) => pipe.x > -this.PIPE_WIDTH);

    // 거리 기반 파이프 생성 (일정한 간격 유지)
    // 마지막 파이프가 없거나, 마지막 파이프가 충분히 왼쪽으로 이동했을 때 새 파이프 생성
    const shouldSpawnPipe =
      this.pipes.length === 0 ||
      this.pipes[this.pipes.length - 1].x <=
        this.screenWidth - this.pipeSpacing;

    if (shouldSpawnPipe) {
      this.createPipe(this.screenWidth + this.PIPE_WIDTH);
    }
  }

  /**
   * 현재 게임 설정 조회
   */
  getGameConfig(): ResolvedFlappyBirdConfig {
    return {
      pipeSpeed: this.pipeSpeed,
      pipeSpacing: this.pipeSpacing,
    };
  }

  /**
   * 정리
   */
  destroy() {
    console.log('[MockServerCore] 정리 시작');

    // 업데이트 루프 중지
    this.stop();

    // 모든 상태 초기화
    this.birds = [];
    this.pipes = [];
    this.score = 0;
    this.nextPipeId = 0;
    this.isGameOverState = false;
    this.isRunning = false;
    this.ground = null;

    // Matter.js 월드와 엔진 정리
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);

    console.log('[MockServerCore] 정리 완료');
  }
}
