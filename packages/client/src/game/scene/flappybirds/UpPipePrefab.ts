// You can write more code here

/* START OF COMPILED CODE */

export default class UpPipePrefab extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x?: number, y?: number, xargs?: any) {
    super(scene, x ?? 0, y ?? 0);

    // pipe_top
    const pipe_top = scene.add.image(0, 0, 'pipe_top');
    pipe_top.setOrigin(0, 0); // 상단 기준으로 변경 (위에서 아래로 그려짐)
    pipe_top.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.add(pipe_top);
    this.pipeTop = pipe_top;

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  /* START-USER-CODE */

  private pipeTop: Phaser.GameObjects.Image;

  /**
   * 위쪽 파이프의 두께(너비)를 설정합니다.
   * @param thickness 파이프의 새로운 두께 (픽셀 단위)
   */
  setThickness(thickness: number): void {
    if (this.pipeTop) {
      this.pipeTop.displayWidth = thickness;
    }
  }

  /**
   * 위쪽 파이프의 높이를 설정합니다.
   * @param height 파이프의 새로운 높이 (픽셀 단위)
   */
  setHeight(height: number): void {
    if (this.pipeTop) {
      this.pipeTop.displayHeight = height;
    }
  }

  /**
   * 원본 이미지의 가로세로 비율을 반환합니다.
   * @returns 원본 이미지의 높이/너비 비율
   */
  getAspectRatio(): number {
    if (this.pipeTop && this.pipeTop.texture) {
      const frame = this.pipeTop.texture.get();
      return frame.height / frame.width;
    }
    return 1; // 기본값
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
