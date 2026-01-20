import Matter from 'matter-js';
import type { BirdPosition, RopeData, PlayerId } from '../types/flappybird.types';
import { MockSocket } from '../network/MockSocket';

/**
 * 충돌 카테고리
 */
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

    // 물리 파라미터
    private readonly GRAVITY_Y = 0.8;
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
     * 게임 초기화
     */
    initialize() {
        // 기존 객체 제거
        Matter.World.clear(this.world, false);
        this.birds = [];
        this.constraints = [];
        this.score = 0;

        // 바닥 생성
        this.createGround();

        // 4개의 새 생성
        this.createBirds();

        // 체인으로 연결
        this.createChainConstraints();

        console.log('[MockServerCore] 게임 초기화 완료');
    }

    /**
     * 바닥 생성
     */
    private createGround() {
        this.ground = Matter.Bodies.rectangle(400, 850, 1440, 100, {
            isStatic: true,
            label: 'ground',
            collisionFilter: {
                category: CATEGORY_GROUND,
                mask: CATEGORY_BIRD
            }
        });

        Matter.World.add(this.world, this.ground);
    }

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

        // 충돌 감지
        this.checkCollisions();
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
