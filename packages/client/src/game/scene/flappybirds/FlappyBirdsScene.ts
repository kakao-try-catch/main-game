
// You can write more code here

/* START OF COMPILED CODE */

export default class FlappyBirdsScene extends Phaser.Scene {

	constructor() {
		super("FlappyBirdsScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// background
		const background = this.add.rectangle(0, 0, 1440, 896);
		background.setOrigin(0, 0);
		background.isFilled = true;
		background.fillColor = 6995160;

		// bird
		const bird = this.add.ellipse(599, 467, 75, 75);
		bird.isFilled = true;
		bird.fillColor = 15787624;

		// Pipe
		const pipe = new PipePrefab(this, 1212, 7);
		this.add.existing(pipe);

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	// Write your code here

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
