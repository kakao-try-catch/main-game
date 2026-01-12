import Phaser from 'phaser';
import timerPrefab from './timerPrefab';

export default class TimerSystem {
    private scene: Phaser.Scene;
    private timerPrefab: timerPrefab;
    private totalTime: number = 0;
    private remainingTime: number = 0;
    private timerEvent?: Phaser.Time.TimerEvent;
    private isFinished: boolean = false;

    constructor(scene: Phaser.Scene, timerPrefabInstance: timerPrefab) {
        this.scene = scene;
        this.timerPrefab = timerPrefabInstance;
    }

    /**
     * 전체 시간을 설정하고 타이머를 시작합니다.
     * @param totalSeconds 전체 시간 (초)
     */
    start(totalSeconds: number): void {
        this.totalTime = totalSeconds;
        this.remainingTime = totalSeconds;
        this.isFinished = false;

        // 초기 비율 업데이트 (100%)
        this.updateTimerBar();

        // 1초마다 타이머 업데이트
        this.timerEvent = this.scene.time.addEvent({
            delay: 1000,
            callback: this.tick,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * 매초 호출되어 남은 시간을 감소시키고 UI를 업데이트합니다.
     */
    private tick(): void {
        if (this.isFinished) return;

        this.remainingTime--;

        // 비율 계산 후 timerPrefab에 전달
        this.updateTimerBar();

        // 남은 시간이 0이 되면 종료
        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.isFinished = true;
            this.stop();
            console.log('⏱️ 타이머 종료! 시간이 모두 소진되었습니다.');
        }
    }

    /**
     * 남은 시간 비율을 계산하여 timerPrefab에 전달합니다.
     */
    private updateTimerBar(): void {
        const ratio = this.totalTime > 0 ? this.remainingTime / this.totalTime : 0;
        this.timerPrefab.setBarRatio(ratio);
    }

    /**
     * 타이머를 정지합니다.
     */
    stop(): void {
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = undefined;
        }
    }

    /**
     * 남은 시간을 반환합니다.
     */
    getRemainingTime(): number {
        return this.remainingTime;
    }

    /**
     * 전체 시간을 반환합니다.
     */
    getTotalTime(): number {
        return this.totalTime;
    }

    /**
     * 타이머가 종료되었는지 확인합니다.
     */
    getIsFinished(): boolean {
        return this.isFinished;
    }
}
