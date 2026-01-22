// You can write more code here
import DownPipePrefab from './DownPipePrefab';
import UpPipePrefab from './UpPipePrefab';

/* START OF COMPILED CODE */

export default class PipePrefab extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x?: number, y?: number, xargs?: any) {
    super(scene, x ?? 0, y ?? 0);

    // up pipe_container (위쪽 파이프)
    this.upPipe = new UpPipePrefab(scene, 0, 0);
    this.add(this.upPipe);

    // down pipe_container (아래쪽 파이프)
    this.downPipe = new DownPipePrefab(scene, 0, 0);
    this.add(this.downPipe);

    if (xargs) {
      this.initPipe(xargs);
    }

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  /* START-USER-CODE */

  private upPipe: UpPipePrefab;
  private downPipe: DownPipePrefab;

  /**
   * 파이프의 높이와 간격을 초기화하거나 재설정합니다.
   * 객체 풀링 시 재사용을 위해 사용됩니다.
   */
  public initPipe(config: {
    pipeGap: number;
    minPipeHeight: number;
    pipeThickness: number;
    screenHeight: number;
  }): void {
    const { pipeGap, minPipeHeight, pipeThickness, screenHeight } = config;

    // 랜덤한 간격 위치 결정 (새가 통과할 공간의 중심)
    const gapY = Phaser.Math.Between(
      minPipeHeight + pipeGap / 2,
      screenHeight - minPipeHeight - pipeGap / 2,
    );

    // 갭의 상단과 하단 위치 계산
    const gapTop = gapY - pipeGap / 2;
    const gapBottom = gapY + pipeGap / 2;

    // 위쪽 파이프 높이 계산
    const topPipeHeight = gapTop;

    // 아래쪽 파이프 높이 계산
    const bottomPipeHeight = screenHeight - gapBottom;

    // 위쪽 파이프 설정
    this.upPipe.y = 0;
    this.upPipe.setHeight(topPipeHeight);
    this.upPipe.setThickness(pipeThickness);

    // 아래쪽 파이프 설정
    this.downPipe.y = gapBottom;
    this.downPipe.setHeight(bottomPipeHeight);
    this.downPipe.setThickness(pipeThickness);
  }

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
    pipeThickness: number,
  ): PipePrefab {
    const config = {
      pipeGap,
      minPipeHeight,
      pipeThickness,
      screenHeight: scene.cameras.main.height,
    };
    const pipeSet = new PipePrefab(scene, x, 0, config);
    scene.add.existing(pipeSet);
    return pipeSet;
  }

  /**
   * 서버 데이터를 기반으로 파이프 간격을 설정합니다.
   * @param gapY - 간격 중심 Y 좌표
   * @param gap - 위아래 파이프 사이 간격
   * @param width - 파이프 너비
   * @param screenHeight - 화면 높이
   */
  public setFromServerData(
    gapY: number,
    gap: number,
    width: number,
    screenHeight: number,
  ): void {
    // 갭의 상단과 하단 위치 계산
    const gapTop = gapY - gap / 2;
    const gapBottom = gapY + gap / 2;

    // 위쪽 파이프 높이 계산
    const topPipeHeight = gapTop;

    // 아래쪽 파이프 높이 계산
    const bottomPipeHeight = screenHeight - gapBottom;

    // 위쪽 파이프 설정
    this.upPipe.y = 0;
    this.upPipe.setHeight(topPipeHeight);
    this.upPipe.setThickness(width);

    // 아래쪽 파이프 설정
    this.downPipe.y = gapBottom;
    this.downPipe.setHeight(bottomPipeHeight);
    this.downPipe.setThickness(width);
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
