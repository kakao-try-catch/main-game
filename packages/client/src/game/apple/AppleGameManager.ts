import Phaser from 'phaser';
import applePrefab from './ApplePrefab';
import TimerPrefab from '../utils/TimerPrefab';
import TimerSystem from '../utils/TimerSystem';
import { attachDragSelection } from '../utils/DragSelection';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import GameResultPrefab, { type PlayerResultData } from '../utils/game-result/GameResultPrefab';

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
    playerCount: number;    // 플레이어 수 (1~4)
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
    playerCount: 4,
};

/** 플레이어 데이터 */
export interface PlayerData {
    id: string;
    name: string;
    score: number;
    color: string;
}

/** HEX 색상을 숫자로 변환 */
function hexStringToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
}

/** HSV에서 명도(V)를 조절한 색상 반환 */
function adjustBrightness(hexColor: string, brightnessOffset: number): number {
    const color = Phaser.Display.Color.HexStringToColor(hexColor);
    const hsv = Phaser.Display.Color.RGBToHSV(color.red, color.green, color.blue);
    
    // 명도 조정 (0~1 범위, brightnessOffset는 0~100 범위로 가정)
    const newV = Math.max(0, Math.min(1, (hsv.v as number) - brightnessOffset / 100));
    
    const rgb = Phaser.Display.Color.HSVToRGB(hsv.h as number, hsv.s as number, newV) as { r: number; g: number; b: number };
    return Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);
}

export default class AppleGameManager {
    private readonly scene: Phaser.Scene;
    private readonly config: AppleGameConfig;
    
    // 현재 유저의 플레이어 인덱스
    private currentPlayerIndex: number = 0;

    // 전체 사과 리스트
    private apples: applePrefab[] = [];
    
    // 현재 선택된 사과들 (합이 10일시 이걸 apples에서 삭제함)
    private selectedApples: Set<applePrefab> = new Set();
    
    // 타이머 관련
    private timerPrefab!: TimerPrefab;
    private timerSystem!: TimerSystem;
    
    // 드래그 선택 해제용
    private detachDrag?: () => void;

    // 플레이어 데이터
    private players: PlayerData[] = [];

    // 기본 플레이어 색상 (1P 파란색 기준)
    private static readonly DEFAULT_COLORS = [
        '#209cee',  // 1P 파란색
        '#e76e55',  // 2P 빨간색
        '#92cc41',  // 3P 초록색
        '#f2d024',  // 4P 노란색
    ];

    // 프레임 밝기 조절 값 (기본 플레이어 색상 대비)
    private static readonly FRAME_BRIGHTNESS_ADJUSTMENT: number = 15;

    // 현재 플레이어 색상 (0x 형식) - 1P 파란색 기본값
    private currentPlayerColor: number = 0x209cee;
    private currentFrameColor: number = adjustBrightness('#209cee', AppleGameManager.FRAME_BRIGHTNESS_ADJUSTMENT);

    constructor(scene: Phaser.Scene, timer: TimerPrefab, config: Partial<AppleGameConfig> = {}) {
        this.scene = scene;
        this.timerPrefab = timer;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** 게임 초기화 및 시작 */
    init(currentPlayerIndex: number = 0): void {
        this.createApples();
        this.setCurrentPlayerIndex(currentPlayerIndex);  // 외부에서 받은 값 사용
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
            fillColor: this.currentPlayerColor,
            lineColor: this.currentPlayerColor,
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
                apple.setFrameColor(this.currentFrameColor);
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

        // 2. 합이 10이면 사과 제거 및 점수 계산
        if (sum === 10) {
            const score = this.selectedApples.size; 

            this.selectedApples.forEach(apple => {
                apple.destroy();
            });
            // 삭제된 사과들을 리스트에서 한 번에 필터링
            this.apples = this.apples.filter(apple => apple.active);
            
            // 점수 이벤트 발생
            this.scene.events.emit('appleScored', { points: score });

        } else {
            // 프레임 숨기기 (삭제하지 않은 경우에만)
            this.selectedApples.forEach(apple => apple.setFrameVisible(false));
        }
        
        this.selectedApples.clear();
    }
    
    /** 타이머 시작 */
    private startTimer(): void {
        this.timerSystem = new TimerSystem(this.scene, this.timerPrefab, this);
        this.timerSystem.start(this.config.totalTime);
    }

    public gameEnd(): void {
        // 드래그 선택 비활성화
        this.detachDrag?.();
        // 플레이어 데이터에 playerIndex 추가
        const playersWithIndex = this.players.map((player, index) => ({
            ...player,
            playerIndex: index
        }));
        // React로 게임 종료 이벤트 전달
        this.scene.events.emit('gameEnd', { players: playersWithIndex });
        console.log('🎮 게임 종료! React로 이벤트 전달', playersWithIndex);
    }

    
    /** 현재 플레이어 인덱스 업데이트 */
    setCurrentPlayerIndex(index: number): void {
        this.currentPlayerIndex = index;
        this.updatePlayerColors();
        // 드래그 선택 색상 업데이트를 위해 재설정
        this.setupDragSelection();
        console.log(`🎮 현재 플레이어: ${index}번`);
    }

    /** 플레이어 색상 업데이트 */
    private updatePlayerColors(): void {
        const player = this.players[this.currentPlayerIndex];
        // 플레이어 데이터가 없으면 기본 색상 사용
        const colorHex = player?.color ?? AppleGameManager.DEFAULT_COLORS[this.currentPlayerIndex] ?? '#209cee';
        
        this.currentPlayerColor = hexStringToNumber(colorHex);
        this.currentFrameColor = adjustBrightness(colorHex, 15);
        console.log(`🎨 플레이어 색상: ${colorHex}, 프레임: 0x${this.currentFrameColor.toString(16)}`);
    }

    /** 현재 플레이어 인덱스 반환 */
    getCurrentPlayerIndex(): number {
        return this.currentPlayerIndex;
    }

    /** 플레이어 수 반환 */
    getPlayerCount(): number {
        return this.config.playerCount;
    }

    /** 플레이어 데이터 반환 */
    getPlayers(): PlayerData[] {
        return this.players;
    }

    /** 플레이어 데이터 업데이트 (React에서 호출) */
    updatePlayerData(playerCount: number, players: PlayerData[]): void {
        this.config.playerCount = playerCount;
        this.players = players;
        this.updatePlayerColors();
        // 드래그 선택 색상 업데이트
        this.setupDragSelection();
        console.log(`👥 플레이어 데이터 업데이트: ${playerCount}명`, players);
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