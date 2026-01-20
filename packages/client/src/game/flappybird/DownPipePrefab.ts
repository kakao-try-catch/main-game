
// You can write more code here

/* START OF COMPILED CODE */

export default class DownPipePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 0, y ?? 0);

		// pipe_bottom (아래에서 위로 올라오는 파이프 본체)
		const pipe_bottom = scene.add.rectangle(0, 169, 128, 178);
		pipe_bottom.setOrigin(0.5, 1);  // 아래쪽 기준
		pipe_bottom.isFilled = true;
		pipe_bottom.fillColor = 3380533;
		this.add(pipe_bottom);
		this.pipeBottom = pipe_bottom;


		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	private pipeBottom: Phaser.GameObjects.Rectangle;

	/**
	 * 아래쪽 파이프의 두께(너비)를 설정합니다.
	 * @param thickness 파이프의 새로운 두께 (픽셀 단위)
	 */
	setThickness(thickness: number): void {
		if (this.pipeBottom) {
			this.pipeBottom.width = thickness;
		}
	}
	/**
	 * 아래쪽 파이프의 높이를 설정합니다.
	 * @param height 파이프의 새로운 높이 (픽셀 단위)
	 */
	setHeight(height: number): void {
		if (this.pipeBottom) {
			this.pipeBottom.height = height;
		}
	}

	// Write your code here.

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
