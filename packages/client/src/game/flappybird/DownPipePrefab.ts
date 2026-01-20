
// You can write more code here

/* START OF COMPILED CODE */

export default class DownPipePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 0, y ?? 0);

		// pipe_bottom
		const pipe_bottom = scene.add.rectangle(0, 169, 128, 178);
		pipe_bottom.setOrigin(0.5, 1);
		pipe_bottom.isFilled = true;
		pipe_bottom.fillColor = 3380533;
		this.add(pipe_bottom);

		// pipe_top
		const pipe_top = scene.add.rectangle(0, -9, 150, 20);
		pipe_top.setOrigin(0.5, 0);
		pipe_top.isFilled = true;
		pipe_top.fillColor = 3380533;
		this.add(pipe_top);

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	// Write your code here.

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
