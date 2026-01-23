// You can write more code here

/* START OF COMPILED CODE */

export default class DownPipePrefab extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x?: number, y?: number) {
    super(scene, x ?? 0, y ?? 0);

    // pipe_bottom (아래에서 위로 올라오는 파이프 본체)
    const pipe_bottom = scene.add.image(0, 0, 'pipe_bottom');
    pipe_bottom.setOrigin(0, 0); // 위쪽 기준으로 변경
    pipe_bottom.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.add(pipe_bottom);
    this.pipeBottom = pipe_bottom;

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  /* START-USER-CODE */

  private pipeBottom: Phaser.GameObjects.Image;

  /**
   * 아래쪽 파이프의 두께(너비)를 설정합니다.
   * @param thickness 파이프의 새로운 두께 (픽셀 단위)
   */
  setThickness(thickness: number): void {
    if (this.pipeBottom) {
      this.pipeBottom.displayWidth = thickness;
    }
  }
  /**
   * 아래쪽 파이프의 높이를 설정합니다.
   * @param height 파이프의 새로운 높이 (픽셀 단위)
   */
  setHeight(height: number): void {
    if (this.pipeBottom) {
      this.pipeBottom.displayHeight = height;
    }
  }

  /**
   * 원본 이미지의 가로세로 비율을 반환합니다.
   * @returns 원본 이미지의 높이/너비 비율
   */
  getAspectRatio(): number {
    if (this.pipeBottom && this.pipeBottom.texture) {
      const frame = this.pipeBottom.texture.get();
      return frame.height / frame.width;
    }
    return 1; // 기본값
  }

  // Write your code here.

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
