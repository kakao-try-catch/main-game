
// You can write more code here
import DownPipePrefab from './DownPipePrefab';
import UpPipePrefab from './UpPipePrefab';

/* START OF COMPILED CODE */

export default class PipePrefab extends Phaser.GameObjects.Container {

	constructor(scene: Phaser.Scene, x?: number, y?: number, xargs?: any) {
		super(scene, x ?? 0, y ?? 0);

		// xargs에서 설정값 추출 (기본값 설정)
		const config = xargs || {};
		const pipeGap = config.pipeGap ?? 200;
		const minPipeHeight = config.minPipeHeight ?? 100;
		const pipeThickness = config.pipeThickness ?? 128;
		const screenHeight = config.screenHeight ?? scene.cameras.main.height;

		// 랜덤한 간격 위치 결정 (새가 통과할 공간의 중심)
		const gapY = Phaser.Math.Between(
			minPipeHeight + pipeGap / 2,
			screenHeight - minPipeHeight - pipeGap / 2
		);

		// 위쪽 파이프 높이 계산
		const topPipeHeight = gapY - pipeGap / 2;

		// 아래쪽 파이프 높이 계산
		const bottomPipeHeight = screenHeight - (gapY + pipeGap / 2);

		// up pipe_container (위쪽 파이프)
		const up_pipe_container = new UpPipePrefab(scene, 0, 0);
		up_pipe_container.setHeight(topPipeHeight);
		up_pipe_container.setThickness(pipeThickness);
		this.add(up_pipe_container);

		// down pipe_container (아래쪽 파이프)
		const down_pipe_container = new DownPipePrefab(scene, 0, gapY + pipeGap / 2);
		down_pipe_container.setHeight(bottomPipeHeight);
		down_pipe_container.setThickness(pipeThickness);
		this.add(down_pipe_container);

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/* START-USER-CODE */

	/**
	 * 파이프 세트를 생성하는 정적 팩토리 메서드
	 * @param scene - Phaser 씬
	 * @param x - 파이프의 x 좌표
	 * @param pipeGap - 위아래 파이프 사이 간격
	 * @param minPipeHeight - 최소 파이프 높이
	 * @returns 생성된 PipePrefab 인스턴스
	 */
	static createPipeSet(
		scene: Phaser.Scene,
		x: number,
		pipeGap: number,
		minPipeHeight: number,
		pipeThickness: number
	): PipePrefab {
		const config = {
			pipeGap,
			minPipeHeight,
			pipeThickness,
			screenHeight: scene.cameras.main.height
		};
		const pipeSet = new PipePrefab(scene, x, 0, config);
		scene.add.existing(pipeSet);
		return pipeSet;
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
