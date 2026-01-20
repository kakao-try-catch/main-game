import Phaser from 'phaser';
import PipePrefab from './PipePrefab';

/**
 * 파이프 관리 매니저
 * 여러 파이프 세트를 생성하고, 이동시키며, 재사용하는 역할을 담당합니다.
 */
export default class PipeManager {
    private scene: Phaser.Scene;
    private pipes: PipePrefab[] = [];

    // 파이프 설정
    private PIPE_GAP = 200;              // 위아래 파이프 사이 간격
    private MIN_PIPE_HEIGHT = 100;       // 최소 파이프 높이
    private PIPE_SPEED = 200;            // 파이프 이동 속도 (픽셀/초)
    private PIPE_SPAWN_DISTANCE = 400;   // 파이프 간 거리
    private PIPE_START_X = 1400;         // 파이프 시작 X 위치 (화면 오른쪽 밖)

    private screenWidth: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.screenWidth = scene.cameras.main.width;

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
            this.MIN_PIPE_HEIGHT
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

    }


    /**
     * 파이프 이동 속도를 설정합니다.
     * @param speed - 새로운 속도 (픽셀/초)
     */
    setPipeSpeed(speed: number): void {
        (this as any).PIPE_SPEED = speed;
    }
}
