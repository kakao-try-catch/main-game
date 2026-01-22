
// You can write more code here

/* START OF COMPILED CODE */

export default class UpPipePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number, xargs?: any) {
		super(scene, x ?? 0, y ?? 0);

		// pipe_bottom_1
		const pipe_bottom_1 = scene.add.rectangle(0, 0, 80, 178);
		pipe_bottom_1.setOrigin(0.5, 0);  // 상단 기준으로 변경 (위에서 아래로 그려짐)
		pipe_bottom_1.isFilled = true;
		pipe_bottom_1.fillColor = 3380533;
		this.add(pipe_bottom_1);
		this.pipeBottom = pipe_bottom_1;



		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	private pipeBottom: Phaser.GameObjects.Rectangle;

	/**
	 * 위쪽 파이프의 두께(너비)를 설정합니다.
	 * @param thickness 파이프의 새로운 두께 (픽셀 단위)
	 */
	setThickness(thickness: number): void {
		if (this.pipeBottom) {
			this.pipeBottom.width = thickness;
		}
	}

	/**
	 * 위쪽 파이프의 높이를 설정합니다.
	 * @param height 파이프의 새로운 높이 (픽셀 단위)
	 */
	setHeight(height: number): void {
		if (this.pipeBottom) {
			this.pipeBottom.height = height;
		}
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
