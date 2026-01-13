
// You can write more code here

/* START OF COMPILED CODE */

export default class GameResultPrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 684, y ?? 283);

		// background
		const background = scene.add.rectangle(36, 165, 1440, 896);
		background.isFilled = true;
		background.fillColor = 0;
		background.fillAlpha = 0.4;
		this.add(background);

		// __
		const __ = scene.add.image(36, 165, "결과");
		this.add(__);

		// BackModal
		const backModal = scene.add.rectangle(35, 146, 1041, 690);
		backModal.visible = false;
		backModal.isFilled = true;
		backModal.fillColor = 13187385;
		backModal.isStroked = true;
		backModal.lineWidth = 10;
		this.add(backModal);

		// TitleText
		const titleText = scene.add.text(35, -90, "", {});
		titleText.setOrigin(0.5, 1);
		titleText.text = "APPLE GAME TOGETHER";
		titleText.setStyle({ "align": "center", "color": "#000000ff", "fontFamily": "Ariel", "fontSize": "60px", "fontStyle": "bold", "resolution": 5 });
		this.add(titleText);

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
