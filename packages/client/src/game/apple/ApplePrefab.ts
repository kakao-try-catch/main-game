import Phaser from 'phaser';

// You can write more code here

/* START OF COMPILED CODE */

export default class ApplePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 0, y ?? -7);

		// appleFrame
		const appleFrame = scene.add.ellipse(0, 7, 68, 68);
		appleFrame.scaleX = 1.2;
		appleFrame.scaleY = 1.2;
		appleFrame.visible = false;
		appleFrame.isFilled = true;
		appleFrame.fillColor = 14601984;
		appleFrame.strokeAlpha = 0.5;
		this.add(appleFrame);

		// appleShape
		const appleShape = scene.add.ellipse(0, 7, 68, 68);
		appleShape.scaleX = 0.9;
		appleShape.scaleY = 0.9;
		appleShape.visible = false;
		appleShape.isFilled = true;
		appleShape.fillColor = 14628150;
		this.add(appleShape);

		// apple
		const apple = scene.add.image(0, 5, "apple");
		this.add(apple);

		// appleText
		const appleText = scene.add.text(0, 15, "", {});
		appleText.setOrigin(0.5, 0.5);
		appleText.text = "0";
		appleText.setStyle({ "align": "center", "fontSize": "50px", "fontStyle": "bold" });
		this.add(appleText);

		/* START-USER-CTR-CODE */
		this.appleFrame = appleFrame;
		//this.appleShape = appleShape;
		this.appleText = appleText;
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	private appleFrame!: Phaser.GameObjects.Ellipse;
	//private appleShape!: Phaser.GameObjects.Ellipse;
	private appleText!: Phaser.GameObjects.Text;
	private appleNumber: number = 0;

	/** 사과 프레임의 visible을 설정합니다. */
	setFrameVisible(visible: boolean): void {
		this.appleFrame.visible = visible;
	}

	/** 사과 프레임의 색상을 설정합니다. */
	setFrameColor(color: number): void {
		this.appleFrame.fillColor = color;
	}

	/** 사과의 숫자를 설정하고 텍스트에 반영합니다. */
	setNumber(num: number): void {
		this.appleNumber = num;
		this.appleText.text = String(num);
	}

	/** 사과의 숫자를 반환합니다. */
	getNumber(): number {
		return this.appleNumber;
	}

	/** 주어진 사각형 범위 안에 이 사과가 있는지 확인합니다. */
	isInRect(rect: Phaser.Geom.Rectangle): boolean {
		// 사과의 월드 좌표 계산
		const worldX = this.x;
		const worldY = this.y + 7;  // appleShape의 로컬 y 오프셋

		return Phaser.Geom.Rectangle.Contains(rect, worldX, worldY);
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
