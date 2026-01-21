import Matter from 'matter-js';
import type { BirdPosition, RopeData, PlayerId, PipeData } from '../types/flappybird.types';
import type { ResolvedFlappyBirdConfig } from '../types/FlappyBirdGamePreset';
import { MockSocket } from '../network/MockSocket';

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
    private constraints: Matter.Constraint[] = [];
    private ground: Matter.Body | null = null;
    private socket: MockSocket;
    private updateInterval: number | null = null;
    private score: number = 0;
    private isRunning: boolean = false;
    private playerCount: number = 4;

    // 파이프 관련
    private pipes: PipeData[] = [];
    private nextPipeId: number = 0;
    private screenWidth: number = 1440;
    private screenHeight: number = 896;

    // 물리 파라미터
    private readonly GRAVITY_Y = 0.8;
    private readonly BIRD_RADIUS = 20;
    private readonly FLAP_VELOCITY = -8;
    private readonly CHAIN_LENGTH = 100;
    private readonly CHAIN_STIFFNESS = 0.15;  // 0.4 → 0.15로 감소 (끌고가는 힘 약화)
    private readonly CHAIN_DAMPING = 0.1;

    // 파이프 파라미터
    private readonly PIPE_WIDTH = 80;
    private readonly PIPE_GAP = 200;
    private pipeSpacing: number = 400;  // 파이프 간 거리

    // 파이프 속도 관리
    private pipeSpeed: number = 3;  // 파이프 속도

    constructor(socket: MockSocket) {
        this.socket = socket;
        socket.setServerCore(this);

        // Matter.js 엔진 생성
        this.engine = Matter.Engine.create({
            gravity: {
                x: 0,
                y: this.GRAVITY_Y
            },
            enableSleeping: false
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
        this.constraints = [];
        this.score = 0;
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

        // 체인으로 연결
        this.createChainConstraints();


        console.log('[MockServerCore] 게임 초기화 완료');
    }

    /**
     * 바닥 생성
     */
    private createGround() {
        // x: 720 (1440의 중앙), y: 847 (896 - 49), width: 1440, height: 98
        // 상단 표면은 896 - 98 = 798 입니다.
        this.ground = Matter.Bodies.rectangle(720, 847, 1440, 98, {
            isStatic: true,
            label: 'ground',
            collisionFilter: {
                category: CATEGORY_GROUND,
                mask: CATEGORY_BIRD
            }
        });

        Matter.World.add(this.world, this.ground);
    }

    /**
     * 새 생성
     */
    private createBirds(count: number) {
        const startX = 200;
        const startY = 300;
        const spacing = 120;

        for (let i = 0; i < count; i++) {
            // 각 새에 약간의 Y 오프셋을 주어 초기 장력 생성 (물리 안정화)
            const yOffset = i * 3; // 0, 5, 10, 15 픽셀 차이

            const bird = Matter.Bodies.circle(
                startX + i * spacing,
                startY + yOffset,  // 약간씩 다른 높이에서 시작
                this.BIRD_RADIUS,
                {
                    density: 0.001,
                    restitution: 0,
                    friction: 0,
                    frictionAir: 0.01,
                    label: 'bird',
                    collisionFilter: {
                        category: CATEGORY_BIRD,
                        mask: CATEGORY_PIPE | CATEGORY_GROUND
                    }
                }
            );

            this.birds.push(bird);
            Matter.World.add(this.world, bird);
        }

        console.log(`[MockServerCore] ${count}개의 새 생성 완료 (초기 장력 적용)`);
    }

    /**
     * 체인 연결 생성
     */
    private createChainConstraints() {
        for (let i = 0; i < this.birds.length - 1; i++) {
            const constraint = Matter.Constraint.create({
                bodyA: this.birds[i],
                bodyB: this.birds[i + 1],
                length: this.CHAIN_LENGTH,
                stiffness: this.CHAIN_STIFFNESS,
                damping: this.CHAIN_DAMPING,
                render: {
                    visible: false
                }
            });

            this.constraints.push(constraint);
            Matter.World.add(this.world, constraint);
        }

        console.log(`[MockServerCore] ${this.constraints.length}개의 체인 생성 완료`);
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
        // Matter.js 물리 연산
        Matter.Engine.update(this.engine, 1000 / 60);

        // 파이프 업데이트
        this.updatePipes();

        // 충돌 감지
        this.checkCollisions();

        // 위치 데이터 생성
        const birds: BirdPosition[] = this.birds.map((bird, index) => ({
            playerId: String(index) as PlayerId,
            x: bird.position.x,
            y: bird.position.y,
            velocityX: bird.velocity.x,
            velocityY: bird.velocity.y,
            angle: bird.angle * (180 / Math.PI)
        }));

        // 밧줄 정점 계산
        const ropes: RopeData[] = this.calculateRopePoints();

        // 클라이언트로 브로드캐스트
        this.socket.emit('update_positions', {
            timestamp: Date.now(),
            birds,
            ropes,
            pipes: this.pipes
        });
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
                    y: birdA.position.y + (birdB.position.y - birdA.position.y) * t
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
        // 모든 새에 대해 충돌 검사
        for (const bird of this.birds) {
            // 바닥과의 충돌
            if (this.ground && bird.position.y + this.BIRD_RADIUS >= this.ground.position.y - 50) {
                this.handleGameOver('ground_collision');
                return;
            }

            // 파이프와의 충돌 (나중에 추가)
            // TODO: 파이프 구현 후 충돌 감지 추가
        }
    }

    /**
     * 게임 오버 처리
     */
    private handleGameOver(reason: 'pipe_collision' | 'ground_collision') {
        this.stop();

        this.socket.emit('game_over', {
            reason,
            finalScore: this.score,
            collidedPlayerId: '0', // TODO: 실제 충돌한 플레이어 ID 계산
            timestamp: Date.now()
        });

        console.log(`[MockServerCore] 게임 오버: ${reason}`);
    }

    /**
     * 클라이언트 이벤트 처리
     */
    handleClientEvent(event: string, data: any) {
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
        const birdIndex = parseInt(playerId);
        if (birdIndex >= 0 && birdIndex < this.birds.length) {
            const bird = this.birds[birdIndex];

            Matter.Body.setVelocity(bird, {
                x: bird.velocity.x,
                y: this.FLAP_VELOCITY
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
            passed: false
        };

        this.pipes.push(pipe);
    }

    private updatePipes() {
        // 파이프 이동 (일정한 속도 유지)
        for (const pipe of this.pipes) {
            pipe.x -= this.pipeSpeed;
        }

        // 화면 밖으로 나간 파이프 제거
        this.pipes = this.pipes.filter(pipe => pipe.x > -this.PIPE_WIDTH);

        // 거리 기반 파이프 생성 (일정한 간격 유지)
        // 마지막 파이프가 없거나, 마지막 파이프가 충분히 왼쪽으로 이동했을 때 새 파이프 생성
        const shouldSpawnPipe = this.pipes.length === 0 ||
            this.pipes[this.pipes.length - 1].x <= this.screenWidth - this.pipeSpacing;

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
        this.stop();
        Matter.World.clear(this.world, false);
        Matter.Engine.clear(this.engine);
        console.log('[MockServerCore] 정리 완료');
    }
}
