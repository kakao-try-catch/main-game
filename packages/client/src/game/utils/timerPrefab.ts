
// You can write more code here

/* START OF COMPILED CODE */

export default class timerPrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number) {
		super(scene, x ?? 0, y ?? 0);

		// timerBar
		const timerBar = scene.add.rectangle(0, 777, 22, 752);
		timerBar.setOrigin(0.5, 1);
		timerBar.isFilled = true;
		timerBar.fillColor = 4170789;
		this.add(timerBar);

		// timeTxt
		const timeTxt = scene.add.text(0, 0, "", {});
		timeTxt.scaleX = 0.9;
		timeTxt.scaleY = 1.3;
		timeTxt.setOrigin(0.5, 0.5);
		timeTxt.text = "TIME";
		timeTxt.setStyle({ "color": "#000000ff", "fontSize": "32px", "fontStyle": "bold", "stroke": "#000000ff" });
		this.add(timeTxt);

		/* START-USER-CTR-CODE */
		// timerBar 참조 저장
		this.timerBar = timerBar;
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	private timerBar!: Phaser.GameObjects.Rectangle;

	/**
	 * 타이머 바의 높이를 비율에 맞게 조정합니다.
	 * @param ratio 0~1 사이의 비율 (1 = 가득 참, 0 = 비어 있음)
	 */
	setBarRatio(ratio: number): void {
		// 비율을 0~1 사이로 클램프
		const clampedRatio = Math.max(0, Math.min(1, ratio));
		// scaleY를 사용하여 위에서 아래로 줄어들게 함 (origin이 하단이므로)
		this.timerBar.scaleY = clampedRatio;
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
