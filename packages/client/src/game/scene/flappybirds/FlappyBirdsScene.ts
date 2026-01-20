
// You can write more code here
import Phaser from 'phaser';
import PipePrefab from '../../flappybird/PipePrefab';

/* START OF COMPILED CODE */

export default class FlappyBirdsScene extends Phaser.Scene {

	// 파이프 설정 상수
	private readonly PIPE_GAP = 200;         // 위아래 파이프 사이 간격
	private readonly MIN_PIPE_HEIGHT = 100;  // 최소 파이프 높이


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

		// 파이프 세트 생성 예시
		PipePrefab.createPipeSet(this, 800, this.PIPE_GAP, this.MIN_PIPE_HEIGHT);
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
