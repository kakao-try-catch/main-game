
// You can write more code here

/* START OF COMPILED CODE */

export default class TimerPrefab extends Phaser.GameObjects.Container {

	   constructor(scene: Phaser.Scene, x?: number, y?: number) {
		   const ratio = window.__APPLE_GAME_RATIO || 1;
		   const clampedRatio = Math.min(Math.max(ratio, 0.5), 1.5); // 최소 0.5, 최대 1.0으로 클램핑
		   super(scene, x ?? 0, y ?? 0);

		   // timerBar
		   const timerBar = scene.add.rectangle(0, 777 * clampedRatio, 22 * clampedRatio, 752 * clampedRatio);
		   timerBar.setOrigin(0.5, 1);
		   timerBar.isFilled = true;
		   timerBar.fillColor = 0x3fa425; // 시작 시 초록색
		   timerBar.setScale(clampedRatio);
		   this.add(timerBar);

		   // timeTxt
		   const timeTxt = scene.add.text(0, 0, "", {});
		   timeTxt.scaleX = 0.9 * clampedRatio;
		   timeTxt.scaleY = 1.3 * clampedRatio;
		   timeTxt.setResolution(5); // 폰트 좀더 선명하게
		   timeTxt.setOrigin(0.5, 0.5);
		   timeTxt.text = "TIME";
		   timeTxt.setStyle({ "color": "#000000ff", "fontSize": `${32 * clampedRatio}px`, "fontStyle": "bold", "stroke": "#000000ff" });
		   this.add(timeTxt);

		   /* START-USER-CTR-CODE */
		   // timerBar 참조 저장
		   this.timerBar = timerBar;
		   /* END-USER-CTR-CODE */
	   }

	/* START-USER-CODE */

	private timerBar!: Phaser.GameObjects.Rectangle;

	/** 타이머 바 오브젝트 반환 (Tween 직접 적용) */
	getBar(): Phaser.GameObjects.Rectangle {
		return this.timerBar;
	}

	/** 타이머 바 스케일 직접 설정 */
	setBarScale(scale: number): void {
		this.timerBar.scaleY = Math.max(0, Math.min(1, scale));
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
