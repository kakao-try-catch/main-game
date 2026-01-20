
// You can write more code here

/* START OF COMPILED CODE */

export default class PipePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number, xargs?: any) {
		super(scene, x ?? 0, y ?? 0);

		// down pipe_container
		const down_pipe_container = new DownPipePrefab(scene, 0, 720);
		this.add(down_pipe_container);

		// up pipe_container
		const up_pipe_container = new UpPipePrefab(scene, 0, 0);
		this.add(up_pipe_container);

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
