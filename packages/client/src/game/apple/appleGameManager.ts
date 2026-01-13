import Phaser from 'phaser';
import applePrefab from './Apple.prefab';
import timerPrefab from '../utils/Timer.prefab';
import TimerSystem from '../utils/TimerSystem';
import { attachDragSelection } from '../utils/DragSelection';

/** 사과 게임 설정 */
interface AppleGameConfig {
    gridCols: number;       // 가로 사과 개수 (17)
    gridRows: number;       // 세로 사과 개수 (10)
    baseX: number;          // 시작 X 좌표 (91)
    baseY: number;          // 시작 Y 좌표 (91)
    spacingX: number;       // X 간격 (73px)
    spacingY: number;       // Y 간격 (74px)
    minNumber: number;      // 최소 숫자 (1)
    maxNumber: number;      // 최대 숫자 (9)
    totalTime: number;      // 전체 게임 시간 (110초)
}

const DEFAULT_CONFIG: AppleGameConfig = {
    gridCols: 17,
    gridRows: 10,
    baseX: 91,
    baseY: 91,
    spacingX: 73,
    spacingY: 74,
    minNumber: 1,
    maxNumber: 9,
    totalTime: 110,
};

export default class AppleGameManager {
    private readonly scene: Phaser.Scene;
    private readonly config: AppleGameConfig;
    
    // 전체 사과 리스트
    private apples: applePrefab[] = [];
    
    // 현재 선택된 사과들 (합이 10일시 이걸 apples에서 삭제함)
    private selectedApples: Set<applePrefab> = new Set();
    
    // 타이머 관련
    private timerPrefab!: timerPrefab;
    private timerSystem!: TimerSystem;
    
    // 드래그 선택 해제용
    private detachDrag?: () => void;

    constructor(scene: Phaser.Scene, timer: timerPrefab, config: Partial<AppleGameConfig> = {}) {
        this.scene = scene;
        this.timerPrefab = timer;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** 게임 초기화 및 시작 */
    init(): void {

        this.createApples();
        this.setupDragSelection();
        this.startTimer();
    }

    /** 사과 그리드 생성 */
    private createApples(): void {
        const { gridCols, gridRows, baseX, baseY, spacingX, spacingY, minNumber, maxNumber } = this.config;
        
        this.apples = [];
        
        for (let col = 0; col < gridCols; col++) {
            for (let row = 0; row < gridRows; row++) {
                const x = baseX + col * spacingX;
                const y = baseY + row * spacingY;
                
                const apple = new applePrefab(this.scene, x, y);
                this.scene.add.existing(apple);
                
                // 랜덤 숫자 설정 (minNumber ~ maxNumber)
                const randomNum = Phaser.Math.Between(minNumber, maxNumber);
                apple.setNumber(randomNum);
                
                this.apples.push(apple);
            }
        }
    }

    /** 드래그 선택 박스 초기화 */
    private setupDragSelection(): void {
        this.detachDrag?.();

        this.detachDrag = attachDragSelection(this.scene, {
            fillColor: 0xfff200,
            lineColor: 0xfff200,
            onDrag: (rect) => this.onDragUpdate(rect),
            onDragEnd: (rect) => this.onDragEnd(rect),
        });
    }

    /** 드래그 중 호출 - 선택 영역 업데이트 */
    private onDragUpdate(rect: Phaser.Geom.Rectangle): void {
        // 이전 선택 해제
        this.selectedApples.forEach(apple => apple.setFrameVisible(false));
        this.selectedApples.clear();

        // 새로운 선택 영역 내 사과들 프레임 표시
        for (const apple of this.apples) {
            if (apple.isInRect(rect)) {
                apple.setFrameVisible(true);
                this.selectedApples.add(apple);
            }
        }
    }

    /** 드래그 종료 시 호출 */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private onDragEnd(rect: Phaser.Geom.Rectangle): void {
        // 선택된 사과들의 숫자 합 계산
        let sum = 0;
        this.selectedApples.forEach(apple => {
            sum += apple.getNumber();
        });

        console.log(`선택된 사과 수: ${this.selectedApples.size}, 합계: ${sum}`);

        // 합이 10이면 사과 제거
        if (sum === 10) {
            this.selectedApples.forEach(apple => {
                apple.destroy();
            });
            // 삭제된 사과들을 리스트에서 한 번에 필터링
            this.apples = this.apples.filter(apple => apple.active);
        } else {
            // 프레임 숨기기 (삭제하지 않은 경우에만)
            this.selectedApples.forEach(apple => apple.setFrameVisible(false));
        }
        
        this.selectedApples.clear();
    }

    /** 타이머 시작 */
    private startTimer(): void {
        this.timerSystem = new TimerSystem(this.scene, this.timerPrefab);
        this.timerSystem.start(this.config.totalTime);
    }

    /** 전체 사과 리스트 반환 */
    getApples(): applePrefab[] {
        return this.apples;
    }

    /** 현재 선택된 사과들 반환 */
    getSelectedApples(): applePrefab[] {
        return Array.from(this.selectedApples);
    }

    /** 특정 사각형 범위 안의 사과들 반환 */
    getApplesInRect(rect: Phaser.Geom.Rectangle): applePrefab[] {
        return this.apples.filter(apple => apple.isInRect(rect));
    }

    /** 타이머 시스템 반환 */
    getTimerSystem(): TimerSystem {
        return this.timerSystem;
    }

    /** 정리 */
    destroy(): void {
        this.detachDrag?.();
        this.timerSystem?.destroy();
        this.apples.forEach(apple => apple.destroy());
        this.apples = [];
        this.selectedApples.clear();
    }
}