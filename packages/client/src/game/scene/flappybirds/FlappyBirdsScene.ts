
// You can write more code here
import Phaser from 'phaser';
import PipeManager from '../../flappybird/PipeManager';

/* START OF COMPILED CODE */

export default class FlappyBirdsScene extends Phaser.Scene {

	private pipeManager!: PipeManager;

	constructor() {
		super("FlappyBirdsScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {
		// GameContainer의 크기에 맞춰 배경 생성 (1379 x 859)
		const width = this.cameras.main.width;
		const height = this.cameras.main.height;

		// background
		const background = this.add.rectangle(0, 0, width, height);
		background.setOrigin(0, 0);
		background.isFilled = true;
		background.fillColor = 6995160;

		// bird
		const bird = this.add.ellipse(599, 467, 75, 75);
		bird.isFilled = true;
		bird.fillColor = 15787624;

	}

	/* START-USER-CODE */

	// Write your code here

	create() {
		this.editorCreate();

		// 파이프 매니저 생성
		this.pipeManager = new PipeManager(this);
	}

	update(_time: number, delta: number): void {
		// 파이프 매니저 업데이트 (파이프를 왼쪽으로 이동)
		if (this.pipeManager) {
			this.pipeManager.update(delta);
		}
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
