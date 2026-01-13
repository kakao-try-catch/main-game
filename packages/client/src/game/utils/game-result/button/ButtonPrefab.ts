
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
		this.setInteractive({ useHandCursor: true })
			.on('pointerover', () => this.onPointerOver())
			.on('pointerout', () => this.onPointerOut())
			.on('pointerdown', () => this.onPointerDown())
			.on('pointerup', () => this.onPointerUp());
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

	/**
	 * 클릭 이벤트 핸들러를 설정합니다.
	 * @param callback 클릭 시 실행할 콜백 함수
	 */
	setOnClick(callback: () => void): this {
		this.onClick = callback;
		return this;
	}

	private onPointerOver(): void {
		this.shape.fillColor = 0x7A9FD1; // 밝은 색으로 변경
		this.scene.game.canvas.style.cursor = 'pointer';
	}

	private onPointerOut(): void {
		this.shape.fillColor = 9530303; // 원래 색으로 복원
		this.scene.game.canvas.style.cursor = 'default';
	}

	private onPointerDown(): void {
		this.shape.fillColor = 0x6B8FC1; // 눌린 상태 색상
		this.setScale(0.95); // 살짝 축소
	}

	private onPointerUp(): void {
		this.shape.fillColor = 0x7A9FD1;
		this.setScale(1); // 원래 크기로 복원
		this.onClick?.();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
