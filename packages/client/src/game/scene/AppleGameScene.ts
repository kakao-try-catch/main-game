import Phaser from 'phaser';
import timerPrefab from '../utils/timerPrefab';
import AppleGameManager from '../apple/appleGameManager';

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
		background.fillColor = 15006687;


		this.timer = new timerPrefab(this, 1336, 32);
		this.add.existing(this.timer);

		this.events.emit("scene-awake");
	}

	private timer!: timerPrefab;
	private gameManager!: AppleGameManager;

	/* START-USER-CODE */

	create() {
		this.editorCreate();
		
		// AppleGameManager가 사과 생성, 드래그 선택, 타이머를 모두 관리
		this.gameManager = new AppleGameManager(this, this.timer);
		this.gameManager.init();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here

// Named export to support `import { AppleGameScene } ...`
export { AppleGameScene };
