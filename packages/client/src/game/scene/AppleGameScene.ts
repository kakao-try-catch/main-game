import Phaser from 'phaser';
import TimerPrefab from '../utils/TimerPrefab';
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
		// background
		const background = this.add.rectangle(0, 0, 1380, 862);
		background.setOrigin(0, 0);
		background.isFilled = true;
		background.fillColor = 0xF6F5F6;


		this.timer = new TimerPrefab(this, 1336, 32);
		this.add.existing(this.timer);

		this.events.emit("scene-awake");
	}

	private timer!: TimerPrefab;
	private gameManager!: AppleGameManager;
	private initialPlayerIndex: number = 0;
	private isGameInitialized: boolean = false;

	/* START-USER-CODE */

	create() {
		this.editorCreate();
		
		// AppleGameManager가 사과 생성, 드래그 선택, 타이머를 모두 관리
		this.gameManager = new AppleGameManager(this, this.timer);

		// React에서 플레이어 데이터 업데이트 수신 (먼저 등록)
		this.events.on('updatePlayers', (data: { playerCount: number; players: { id: string; name: string; score: number; color: string }[]; currentPlayerIndex: number }) => {
			console.log('📩 updatePlayers 이벤트 수신:', data);
			
			// 게임이 아직 초기화되지 않았으면 초기값 저장 후 초기화
			if (!this.isGameInitialized) {
				this.initialPlayerIndex = data.currentPlayerIndex;
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
