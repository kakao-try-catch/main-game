import Phaser from 'phaser';
import PipePrefab from './PipePrefab';

/**
 * 파이프 관리 매니저
 * 여러 파이프 세트를 생성하고, 이동시키며, 재사용하는 역할을 담당합니다.
 */
export default class PipeManager {
    private scene: Phaser.Scene;
    private pipes: PipePrefab[] = [];

    // 파이프 설정 (생성자에서 화면 크기에 맞춰 계산됨)
    private PIPE_GAP: number = 200;              // 위아래 파이프 사이 간격
    private MIN_PIPE_HEIGHT: number = 100;       // 최소 파이프 높이
    private PIPE_SPEED: number = 200;            // 파이프 이동 속도 (픽셀/초)
    private PIPE_SPAWN_DISTANCE: number = 400;   // 파이프 간 거리
    private PIPE_START_X: number = 1400;         // 파이프 시작 X 위치
    private PIPE_THICKNESS: number = 120;        // 파이프 두께

    private screenWidth: number;
    private screenHeight: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.screenWidth = scene.cameras.main.width;
        this.screenHeight = scene.cameras.main.height;

        // 화면 크기에 맞춰 파이프 설정값 계산
        this.PIPE_GAP = this.screenHeight * 0.25;            // 높이의 25%
        this.MIN_PIPE_HEIGHT = this.screenHeight * 0.15;     // 높이의 15%
        this.PIPE_SPAWN_DISTANCE = this.screenWidth * 0.35;  // 너비의 35%
        this.PIPE_THICKNESS = this.screenWidth * 0.1;        // 너비의 10%
        this.PIPE_SPEED = this.screenWidth * 0.2;            // 초당 너비의 20% 이동
        this.PIPE_START_X = this.screenWidth + this.PIPE_THICKNESS;

        // 초기 파이프 세트 생성
        this.createInitialPipes();
    }

    /**
     * 초기 파이프 세트들을 생성합니다.
     */
    private createInitialPipes(): void {
        // 화면에 보이는 파이프 + 여유분 생성
        const numPipes = Math.ceil(this.screenWidth / this.PIPE_SPAWN_DISTANCE) + 2;

        for (let i = 0; i < numPipes; i++) {
            const x = this.PIPE_START_X + (i * this.PIPE_SPAWN_DISTANCE);
            this.createPipe(x);
        }
    }

    /**
     * 새로운 파이프를 생성합니다.
     * @param x - 파이프의 X 좌표
     */
    private createPipe(x: number): PipePrefab {
        const pipe = PipePrefab.createPipeSet(
            this.scene,
            x,
            this.PIPE_GAP,
            this.MIN_PIPE_HEIGHT,
            this.PIPE_THICKNESS
        );
        this.pipes.push(pipe);
        return pipe;
    }

    /**
     * 매 프레임마다 호출되어 파이프들을 업데이트합니다.
     * @param delta - 이전 프레임으로부터 경과한 시간 (밀리초)
     */
    update(delta: number): void {
        const deltaSeconds = delta / 1000;
        const moveDistance = this.PIPE_SPEED * deltaSeconds;

        // 모든 파이프를 왼쪽으로 이동
        for (const pipe of this.pipes) {
            pipe.x -= moveDistance;
        }

        // 화면 왼쪽 밖으로 나간 파이프 재사용
        this.recyclePipes();
    }

    /**
     * 화면 밖으로 나간 파이프를 재사용합니다.
     */
    private recyclePipes(): void {
        // 가장 오른쪽에 있는 파이프의 X 좌표 찾기
        let rightmostX = -Infinity;
        for (const pipe of this.pipes) {
            if (pipe.x > rightmostX) {
                rightmostX = pipe.x;
            }
        }

        for (const pipe of this.pipes) {
            // 파이프가 화면 왼쪽 밖으로 완전히 나갔는지 확인
            if (pipe.x < -100) {
                // 가장 오른쪽 파이프 뒤에 배치
                const newX = rightmostX + this.PIPE_SPAWN_DISTANCE;

                // 파이프를 재생성하여 랜덤한 높이 적용
                this.regeneratePipe(pipe, newX);

                // rightmostX 업데이트
                rightmostX = newX;
            }
        }
    }

    /**
     * 파이프를 재생성하여 새로운 랜덤 높이를 적용합니다.
     * @param pipe - 재생성할 파이프
     * @param x - 새로운 X 좌표
     */
    private regeneratePipe(pipe: PipePrefab, x: number): void {
        // 기존 파이프 제거
        pipe.destroy();

        // 새 파이프 생성
        const newPipe = PipePrefab.createPipeSet(
            this.scene,
            x,
            this.PIPE_GAP,
            this.MIN_PIPE_HEIGHT,
            this.PIPE_THICKNESS
        );

        // 배열에서 교체
        const index = this.pipes.indexOf(pipe);
        if (index !== -1) {
            this.pipes[index] = newPipe;
        }
    }

    /**
     * 모든 파이프를 제거합니다.
     */
    destroy(): void {
        for (const pipe of this.pipes) {
            pipe.destroy();
        }
        this.pipes = [];
    }

    /**
     * 현재 활성화된 모든 파이프를 반환합니다.
     */
    getPipes(): PipePrefab[] {
        return this.pipes;
    }

    /**
     * 파이프 이동 속도를 설정합니다.
     * @param speed - 새로운 속도
     */
    setPipeSpeed(speed: number): void {
        (this as any).PIPE_SPEED = speed;
    }
}
