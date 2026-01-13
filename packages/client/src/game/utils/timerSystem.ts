import Phaser from 'phaser';
import timerPrefab from './Timer.prefab';

/** 타이머 이벤트 타입 */
export const TimerEvents = {
    TICK: 'timer:tick',
    COMPLETE: 'timer:complete',
} as const;

export default class TimerSystem {
    private readonly scene: Phaser.Scene;
    private readonly timerPrefab: timerPrefab;
    
    private totalTime = 0;
    private remainingTime = 0;
    
    private tickEvent?: Phaser.Time.TimerEvent;  // 1초마다 남은 시간 추적용
    private barTween?: Phaser.Tweens.Tween;      // 부드러운 바 애니메이션
    private isFinished = false;
    private isPaused = false;

    constructor(scene: Phaser.Scene, timerPrefabInstance: timerPrefab) {
        this.scene = scene;
        this.timerPrefab = timerPrefabInstance;
        
        // 씬 종료 시 자동 정리
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    /** 전체 시간을 설정하고 타이머를 시작합니다. */
    start(totalSeconds: number): void {
        if (totalSeconds <= 0) return;
        
        this.totalTime = totalSeconds;
        this.remainingTime = totalSeconds;
        this.isFinished = false;
        this.isPaused = false;

        // 초기 상태 - 바를 가득 채움
        this.timerPrefab.setBarScale(1);

        // 하나의 Tween으로 전체 시간 동안 부드럽게 애니메이션 (최적화: 매 프레임 계산 없이 엔진이 처리)
        this.barTween = this.scene.tweens.add({
            targets: this.timerPrefab.getBar(),
            scaleY: 0,
            duration: totalSeconds * 1000,
            ease: 'Linear',
            onComplete: () => this.onTimerComplete()
        });

        // 1초마다 남은 시간 추적 및 이벤트 발생 (게임 로직용)
        this.tickEvent = this.scene.time.addEvent({
            delay: 1000,
            callback: this.tick,
            callbackScope: this,
            loop: true
        });
    }

    /** 매초 호출 - 남은 시간 추적 및 이벤트 발생 */
    private tick(): void {
        if (this.isFinished || this.isPaused) return;

        this.remainingTime--;
        this.scene.events.emit(TimerEvents.TICK, this.remainingTime);
    }

    /** 타이머 완료 처리 */
    private onTimerComplete(): void {
        if (this.isFinished) return;
        
        this.remainingTime = 0;
        this.isFinished = true;
        this.stop();
        
        console.log('⏱️ 타이머 종료! 시간이 모두 소진되었습니다.');
        this.scene.events.emit(TimerEvents.COMPLETE);
    }

    /** 타이머 일시정지 */
    pause(): void {
        if (this.isFinished) return;
        this.isPaused = true;
        this.barTween?.pause();
        if (this.tickEvent) this.tickEvent.paused = true;
    }

    /** 타이머 재개 */
    resume(): void {
        if (this.isFinished) return;
        this.isPaused = false;
        this.barTween?.resume();
        if (this.tickEvent) this.tickEvent.paused = false;
    }

    /** 타이머 정지 */
    stop(): void {
        this.barTween?.stop();
        this.barTween = undefined;
        this.tickEvent?.destroy();
        this.tickEvent = undefined;
    }

    /** 시스템 정리 */
    destroy(): void {
        this.stop();
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    // Getters
    get remaining(): number { return this.remainingTime; }
    get total(): number { return this.totalTime; }
    get finished(): boolean { return this.isFinished; }
    get paused(): boolean { return this.isPaused; }
    get ratio(): number { return this.totalTime > 0 ? this.remainingTime / this.totalTime : 0; }
}
