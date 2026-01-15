import Phaser from 'phaser';
import AppleGameManager from '../apple/AppleGameManager';

// You can write more code here

/* START OF COMPILED CODE */

export default class AppleGameScene extends Phaser.Scene {

	constructor() {
		super("AppleGameScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	//이제 AppleGameScene.scene은 절대 연 다음에 저장하면 안됩니다. 그거 열어서 저장하면 이 코드 날아감 (원래 페이저 에디터가 그럼)

	editorCreate(): void {
		const ratio = window.__APPLE_GAME_RATIO || 1;
		// 게임 전체 컨테이너 생성 (0,0)
		this.gameContainer = this.add.container(0, 0);
		this.gameContainer.setSize(1380 * ratio, 862 * ratio);

		// 배경
		const background = this.add.rectangle(0, 0, 1380 * ratio, 862 * ratio);
		background.setOrigin(0, 0);
		background.isFilled = true;
		background.fillColor = 0xF6F5F6;
		this.gameContainer.add(background);

		// margin, 사과 그리드, 타이머 바 위치 계산 (실제 캔버스 width 기준)
		const canvasWidth = this.sys.game.canvas.width;
		const margin = 20 * ratio;
		const gridCols = 17;
		const appleSize = 50 * ratio;
		// 사과 그리드 최대 width: 캔버스 width - 타이머 바 width - 2 * margin
		const maxAppleGridWidth = canvasWidth - 22 * ratio - 2 * margin;
		// spacingX 계산: (maxAppleGridWidth - appleSize) / (gridCols - 1)
		const spacingX = (maxAppleGridWidth - appleSize) / (gridCols - 1);
		const baseX = margin;
		// AppleGameManager에 baseX, spacingX, gridCols를 명시적으로 넘기기 위해 저장
		this._appleGridConfig = { baseX, spacingX, gridCols };

		this.events.emit("scene-awake");
	}

	// private timer!: TimerPrefab;
	private gameManager!: AppleGameManager;
	private gameContainer!: Phaser.GameObjects.Container;
	private _appleGridConfig!: { baseX: number; spacingX: number; gridCols: number };
	private isGameInitialized: boolean = false;

	/* START-USER-CODE */

	create() {
		this.editorCreate();
		// AppleGameManager가 사과 생성, 드래그 선택, 타이머를 모두 관리
		// gameContainer를 넘겨서 사과도 이 컨테이너에 추가하도록 함
		this.gameManager = new AppleGameManager(this, undefined, this.gameContainer, {
			baseX: this._appleGridConfig.baseX,
			spacingX: this._appleGridConfig.spacingX,
			gridCols: this._appleGridConfig.gridCols
		});

		// React에서 플레이어 데이터 업데이트 수신 (먼저 등록)
		this.events.on('updatePlayers', (data: { playerCount: number; players: { id: string; name: string; score: number; color: string }[]; currentPlayerIndex: number }) => {
			console.log('📩 updatePlayers 이벤트 수신:', data);
			// 게임이 아직 초기화되지 않았으면 초기값 저장 후 초기화
			if (!this.isGameInitialized) {
				this.gameManager.updatePlayerData(data.playerCount, data.players);
				this.gameManager.init(data.currentPlayerIndex);
				this.isGameInitialized = true;
			} else {
				// 이미 초기화된 경우 업데이트만
				this.gameManager.updatePlayerData(data.playerCount, data.players);
				this.gameManager.setCurrentPlayerIndex(data.currentPlayerIndex);
			}
		});
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here

// Named export to support `import { AppleGameScene } ...`
export { AppleGameScene };
