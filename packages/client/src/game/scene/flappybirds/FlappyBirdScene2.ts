
// You can write more code here

/* START OF COMPILED CODE */

import type { BirdPosition, UpdatePositionsEvent, GameOverEvent, PlayerId } from '../../types/flappybird.types';

export default class FlappyBirdScene2 extends Phaser.Scene {
	// 밧줄
	private ropes: Phaser.GameObjects.Graphics[] = [];

	constructor() {
		super("FlappyBirdScene2");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// rectangle_1 (배경)
		const rectangle_1 = this.add.rectangle(0, 0, 1440, 896);
		rectangle_1.setOrigin(0, 0);
		rectangle_1.isFilled = true;
		rectangle_1.fillColor = 4630671;

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	// Write your code here

	create() {
		this.editorCreate();


		// 3개의 밧줄 그래픽 생성
		this.createRopes();

		console.log('[FlappyBirdScene2] 씬 생성 완료');
	}
	/**
	 * 3개의 밧줄 그래픽 생성
	 */
	private createRopes() {
		for (let i = 0; i < 3; i++) {
			const rope = this.add.graphics();
			rope.setDepth(-1); // 새 뒤에 렌더링
			this.ropes.push(rope);
		}

		console.log('[FlappyBirdScene2] 3개의 밧줄 생성 완료');
	}
	/**
	 * 밧줄 업데이트
	 */
	private updateRopes(ropes: any[]) {
		for (let i = 0; i < Math.min(ropes.length, this.ropes.length); i++) {
			const rope = this.ropes[i];
			const points = ropes[i].points;

			rope.clear();
			rope.lineStyle(3, 0x8b4513, 1); // 갈색 밧줄

			if (points && points.length > 1) {
				rope.beginPath();
				rope.moveTo(points[0].x, points[0].y);

				for (let j = 1; j < points.length; j++) {
					rope.lineTo(points[j].x, points[j].y);
				}

				rope.strokePath();
			}
		}
	}

	update(_time: number, _delta: number) {
		// 선형 보간으로 부드러운 이동
		for (let i = 0; i < this.birdSprites.length; i++) {
			const sprite = this.birdSprites[i];
			const target = this.targetPositions[i];

			if (target) {
				// 위치 보간
				sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.3);
				sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.3);

				// 회전 (속도 기반)
				const angle = Phaser.Math.Clamp(target.velocityY * 3, -30, 90);
				sprite.rotation = Phaser.Math.DegToRad(angle);
			}
		}
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
