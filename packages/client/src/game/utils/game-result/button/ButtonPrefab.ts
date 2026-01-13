
// You can write more code here

/* START OF COMPILED CODE */

export default class ButtonPrefab extends Phaser.GameObjects.Container {

	private shape!: Phaser.GameObjects.Rectangle;
	private text!: Phaser.GameObjects.Text;
	private onClick?: () => void;

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 0, y ?? 0);

		// shape
		this.shape = scene.add.rectangle(0, 1, 386, 136);
		this.shape.isFilled = true;
		this.shape.fillColor = 9530303;
		this.add(this.shape);

		// text
		this.text = scene.add.text(0, 0, "", {});
		this.text.setOrigin(0.5, 0.5);

		this.text.setStyle({ "align": "center", "fontFamily": "Ariel", "fontSize": "80px", "fontStyle": "bold", "resolution": 5 });
		this.add(this.text);

		/* START-USER-CTR-CODE */
		// Write your code here.
		this.setSize(386, 136);
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	/**
	 * 버튼 텍스트를 설정합니다.
	 * @param label 버튼에 표시할 텍스트
	 */
	setText(label: string): this {
		this.text.setText(label);
		return this;
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
