
// You can write more code here

/* START OF COMPILED CODE */

export default class upPipePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number, xargs?: any) {
		super(scene, x ?? 0, y ?? 0);

		// pipe_bottom_1
		const pipe_bottom_1 = scene.add.rectangle(0, -8, 128, 178);
		pipe_bottom_1.setOrigin(0.5, 0);
		pipe_bottom_1.isFilled = true;
		pipe_bottom_1.fillColor = 3380533;
		this.add(pipe_bottom_1);

		// pipe_top_1
		const pipe_top_1 = scene.add.rectangle(0, 170, 150, 20);
		pipe_top_1.setOrigin(0.5, 1);
		pipe_top_1.isFilled = true;
		pipe_top_1.fillColor = 3380533;
		this.add(pipe_top_1);

		// b2body_1
		const b2body_1 = b2CreateBody((this.scene as any).worldId, { 
			...b2DefaultBodyDef(), 
			position: pxmVec2(this.x, -this.y), 
			fixedRotation: true
		});

		// add b2body_1 to this
		AddSpriteToWorld((this.scene as any).worldId, this, { bodyId: b2body_1 });

		// col_pipe_big
		const col_pipe_big = b2CreatePolygonShape(b2body_1, { 
			...b2DefaultShapeDef()
		}, b2MakeBox(pxm(64), pxm(100)));

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
