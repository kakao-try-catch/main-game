import Phaser from 'phaser';
import PipePrefab from './PipePrefab';

/**
 * 파이프 관리 매니저
 * 파이프를 생성하고 왼쪽으로 이동시키는 역할을 담당합니다.
 */
export default class PipeManager {
    private scene: Phaser.Scene;
    private pipe: PipePrefab | null = null;

    // 파이프 설정
    private readonly PIPE_GAP = 200;              // 위아래 파이프 사이 간격
    private readonly MIN_PIPE_HEIGHT = 100;       // 최소 파이프 높이
    private readonly PIPE_SPEED = 200;            // 파이프 이동 속도 (픽셀/초)
    private readonly PIPE_START_X = 800;          // 파이프 시작 X 위치

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        // 파이프 생성
        this.createPipe();
    }

    /**
     * 파이프를 생성합니다.
     */
    private createPipe(): void {
        this.pipe = PipePrefab.createPipeSet(
            this.scene,
            this.PIPE_START_X,
            this.PIPE_GAP,
            this.MIN_PIPE_HEIGHT
        );
    }

    /**
     * 매 프레임마다 호출되어 파이프를 업데이트합니다.
     * @param delta - 이전 프레임으로부터 경과한 시간 (밀리초)
     */
    update(delta: number): void {
        if (!this.pipe) return;

        const deltaSeconds = delta / 1000;
        const moveDistance = this.PIPE_SPEED * deltaSeconds;

        // 파이프를 왼쪽으로 이동
        this.pipe.x -= moveDistance;
    }

}
