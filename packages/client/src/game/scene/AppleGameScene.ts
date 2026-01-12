import Phaser from 'phaser';
import applePrefab from '../applePrefab';
import { attachDragSelection } from '../utils/dragSelection';

// You can write more code here

/* START OF COMPILED CODE */

export default class AppleGameScene extends Phaser.Scene {

	constructor() {
		super("AppleGameScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	//이제 AppleGameScene.scene은 절대 연 다음에 저장하면 안됩니다. 그거 열어서 저장하면 이 코드 날아감 (원래 페이저 에디터가 그럼)

	editorCreate(): void {
		// background
		const background = this.add.rectangle(0, 0, 1380, 862);
		background.setOrigin(0, 0);
		background.isFilled = true;
		background.fillColor = 15006687;

		// timerBar
		const timerBar = this.add.rectangle(1324, 75, 22, 752);
		timerBar.setOrigin(0, 0);
		timerBar.isFilled = true;
		timerBar.fillColor = 4170789;

		// timeTxt
		const timeTxt = this.add.text(1298, 24, "", {});
		timeTxt.scaleX = 0.9;
		timeTxt.scaleY = 1.3;
		timeTxt.text = "TIME";
		timeTxt.setStyle({ "color": "#000000ff", "fontSize": "32px", "fontStyle": "bold", "stroke": "#000000ff" });

		const base = { x: 91, y: 91 };
		// applePrefab instances
		for ( let n=0; n<17; n++) {
			for(let m=0; m<10; m++) {
				const apple = new applePrefab(this, base.x + n * 73, base.y + m * 74);
				this.add.existing(apple);
			}
		}
		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	// 드래그 선택 해제용 함수 (씬 전환 시 자동 정리됨)
	private detachDrag?: () => void;

	create() {
		this.editorCreate();
		this.setupDragSelection();
	}

	/** 드래그 선택 박스 초기화 */
	private setupDragSelection() {
		// 기존 연결 해제 (핫 리로드 대응)
		this.detachDrag?.();

		this.detachDrag = attachDragSelection(this, {
			fillColor: 0xfff200,
			lineColor: 0xfff200,

		});
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here

// Named export to support `import { AppleGameScene } ...`
export { AppleGameScene };
