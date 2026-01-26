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
  private readonly FLAP_VERTICAL_JITTER_RATIO = 0.2; // 규칙적 플랩 정렬 방지용 수직 변동 비율
  private isGameOverState: boolean = false; // 게임 오버 상태 추적
  private lastFlapTime: Map<number, number> = new Map(); // 각 새의 마지막 점프 시간
  private frameCount: number = 0; // 프레임 카운터

  // 밧줄 물리 파라미터
  private readonly IDEAL_LENGTH = 100; // 밧줄 여유 길이 단축 (120 -> 100)
  private readonly ROPE_STIFFNESS = 0.3; // 밧줄 장력 최대치 근사값
  private readonly ROPE_SOFTNESS = 50; // 장력 완화 계수 (로그 함수 대체용)

  // 파이프 파라미터 (프리셋에서 설정)
  private pipeWidth: number = 120;
  private pipeGap: number = 200;
  private pipeSpacing: number = 400; // 파이프 간 거리
  private pipeSpeed: number = 1.5;
  private flapBoostBase: number = 0.3; // 점프 시 기본 전진력
  private flapBoostRandom: number = 0.7; // 점프 시 랜덤 추가 전진력 범위

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
    this.lastFlapTime.clear();
    this.frameCount = 0;

    // 설정 적용
    if (config) {
      this.pipeSpeed = config.pipeSpeed;
      this.pipeSpacing = config.pipeSpacing;
      this.pipeGap = config.pipeGap;
      this.pipeWidth = config.pipeWidth;
      this.flapBoostBase = config.flapBoostBase;
      this.flapBoostRandom = config.flapBoostRandom;
      console.log(`[MockServerCore] 설정 적용: speed=${config.pipeSpeed}, spacing=${config.pipeSpacing}, gap=${config.pipeGap}, width=${config.pipeWidth}, flapBoost=${config.flapBoostBase}+${config.flapBoostRandom}`);
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
    this.frameCount++;

    // 1. 파이프 업데이트 (전체 상태에 대해 한 번만)
    this.updatePipes();

    // 2. 개별 새 물리 제어
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      if (bird.isStatic) continue;

      if (this.isGameOverState) {
        // 게임 오버 시에는 수평 속도를 서서히 줄임
        Matter.Body.setVelocity(bird, {
          x: bird.velocity.x * 0.95,
          y: bird.velocity.y,
        });
        continue;
      }

      // 1. 기본 전진 속도 유지 (pipeSpeed 기준으로 일정한 게임 진행)
      // 점프를 하지 않으면 감속되어 뒤로 밀림
      const baseForwardSpeed = this.pipeSpeed * 1.5; // 파이프 속도의 1.5배
      const currentVelX = bird.velocity.x;
      
      // 마지막 점프로부터 경과된 프레임 수 (60fps 기준)
      const lastFlap = this.lastFlapTime.get(i) ?? 0;
      const framesSinceFlap = this.frameCount - lastFlap;
      
      // 점프하지 않은 시간이 길수록 더 많이 감속 (30프레임 = 0.5초 기준)
      const noFlapPenalty = framesSinceFlap > 30 ? 0.97 : 0.995; // 점프 안하면 더 빠른 감속

      // 기본 속도보다 느리면 가속, 빠르면 공기저항으로 감속
      let newVelX: number;
      if (currentVelX < baseForwardSpeed) {
        newVelX = currentVelX + 0.05; // 점진적 가속
      } else {
        newVelX = currentVelX * noFlapPenalty; // 점프 안한 새는 더 빠르게 감속
      }

      Matter.Body.setVelocity(bird, {
        x: newVelX,
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
        // 바닥에 닿으면 시계방향 90도(보고 있는 방향이 아래)로 회전
        Matter.Body.setAngle(bird, Math.PI / 2);
        this.handleGameOver('ground_collision', String(i) as PlayerId);
        continue;
      }

      // 2. 천장과의 충돌 (상단 0 기준, 죽지 않고 막기만 함)
      if (bird.position.y - this.BIRD_HEIGHT / 2 <= 0) {
        Matter.Body.setPosition(bird, {
          x: bird.position.x,
          y: this.BIRD_HEIGHT / 2,
        });
        // 위로 올라가는 속도만 제거
        if (bird.velocity.y < 0) {
          Matter.Body.setVelocity(bird, { x: bird.velocity.x, y: 0 });
        }
      }

      // 3. 좌우 벽과의 충돌 (죽지 않고 막기만 함)
      // 왼쪽 벽
      if (bird.position.x - this.BIRD_WIDTH / 2 <= 0) {
        Matter.Body.setPosition(bird, {
          x: this.BIRD_WIDTH / 2,
          y: bird.position.y,
        });
        if (bird.velocity.x < 0) {
          Matter.Body.setVelocity(bird, { x: 0, y: bird.velocity.y });
        }
      }
      // 오른쪽 벽 제거됨 - 카메라가 새를 따라가므로 무한히 앞으로 이동 가능

      // 2. 파이프와의 충돌
      const birdX = bird.position.x;
      const birdY = bird.position.y;
      const halfBirdW = (this.BIRD_WIDTH * 0.8) / 2;
      const halfBirdH = (this.BIRD_HEIGHT * 0.8) / 2;

      for (const pipe of this.pipes) {
        const halfPipeW = (pipe.width * 0.8) / 2;

        // X축 겹침 확인
        if (
          birdX + halfBirdW > pipe.x - halfPipeW &&
          birdX - halfBirdW < pipe.x + halfPipeW
        ) {
          const gapTop = pipe.gapY - pipe.gap / 2;
          const gapBottom = pipe.gapY + pipe.gap / 2;

          // Y축 충돌 확인 (갭 밖에 있으면 충돌)
          if (birdY - halfBirdH < gapTop || birdY + halfBirdH > gapBottom) {
            // 파이프 충돌 시 멈추지 않고 그대로 아래로 미끄러지도록(추락) 수정
            // setStatic(true)를 하지 않으면 중력에 의해 자연스럽게 떨어짐
            this.handleGameOver('pipe_collision', String(i) as PlayerId);
            return;
          }
        }

        // 통과 판정 (새의 X 좌표가 파이프의 오른쪽 끝을 지났을 때)
        const playerId = String(i) as PlayerId;
        if (
          !pipe.passedPlayers.includes(playerId) &&
          birdX - halfBirdW > pipe.x
        ) {
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
  handleClientEvent(
    event: string,
    data: { playerId: PlayerId; active?: boolean },
  ) {
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

      // 점프 시간 기록
      this.lastFlapTime.set(birdIndex, this.frameCount);

      // 플랩 시 약간의 추가 전진력 (새들 간 위치 변화용)
      // 0.3 + 0~0.7 랜덤 (pipeSpeed에 비례)
      const extraBoost = this.flapBoostBase + Math.random() * this.flapBoostRandom;
      // 규칙적인 플랩이 반복될 때 새들이 일직선으로 정렬되는 현상 완화
      const verticalJitter =
        (Math.random() - 0.5) * Math.abs(this.FLAP_VELOCITY) * this.FLAP_VERTICAL_JITTER_RATIO;
      Matter.Body.setVelocity(bird, {
        x: bird.velocity.x + extraBoost,
        y: this.FLAP_VELOCITY + verticalJitter,
      });

      // 플랩 시 즉시 앞을 보게 함 (0도 유지) 및 회전 속도 초기화
      Matter.Body.setAngle(bird, 0);
      Matter.Body.setAngularVelocity(bird, 0);

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
      width: this.pipeWidth,
      gap: this.pipeGap,
      passed: false,
      passedPlayers: [],
    };

    this.pipes.push(pipe);
  }

  private updatePipes() {
    if (this.isGameOverState) return; // 게임 오버 시 파이프 정지

    // 새들의 평균 X 위치 계산 (카메라 기준점)
    let avgBirdX = 250; // 기본값
    if (this.birds.length > 0) {
      let totalX = 0;
      for (const bird of this.birds) {
        totalX += bird.position.x;
      }
      avgBirdX = totalX / this.birds.length;
    }

    // 화면 밖으로 나간 파이프 제거
    this.pipes = this.pipes.filter((pipe) => pipe.x > -this.pipeWidth);
    // 카메라 뷰 범위 계산 (새들 기준)
    const viewLeft = avgBirdX - this.screenWidth / 4;
    const viewRight = avgBirdX + (this.screenWidth * 3) / 4;

    // 새들 앞에 파이프 미리 생성 (화면 오른쪽 + 여유 공간)
    const spawnAhead = this.screenWidth; // 화면 너비만큼 앞에 미리 생성
    const targetX = viewRight + spawnAhead;

    // 뷰 오른쪽 + spawnAhead까지 파이프 생성
    let maxPipeX = this.pipes.length > 0
      ? Math.max(...this.pipes.map(p => p.x))
      : viewLeft;

    while (maxPipeX < targetX) {
      const newPipeX = this.pipes.length === 0
        ? viewRight + this.pipeSpacing
        : maxPipeX + this.pipeSpacing;
      this.createPipe(newPipeX);
      maxPipeX = newPipeX;
    }
  }

  /**
   * 현재 게임 설정 조회
   */
  getGameConfig(): ResolvedFlappyBirdConfig {
    return {
      pipeSpeed: this.pipeSpeed,
      pipeSpacing: this.pipeSpacing,
      pipeGap: this.pipeGap,
      pipeWidth: this.pipeWidth,
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
