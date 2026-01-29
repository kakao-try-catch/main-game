// You can write more code here

/* START OF COMPILED CODE */

export default class TimerPrefab extends Phaser.GameObjects.Container {
  /**
   * @param scene Phaser 씬
   * @param x X좌표
   * @param y Y좌표
   * @param barHeight 타이머 바의 높이 (사과 그리드와 동일하게 맞춤)
   */
  constructor(scene: Phaser.Scene, x?: number, y?: number, barHeight?: number) {
    const ratio = window.__GAME_RATIO || 1;
    const clampedRatio = Math.min(Math.max(ratio, 0.5), 1.5);
    super(scene, x ?? 0, y ?? 0);

    // 타이머 바 높이: 사과 그리드와 동일하게 맞춤
    const timerBarHeight = barHeight ?? 762; // 기본값 762 (필요에 따라 조정)

    // timerBar
    const timerBar = scene.add.rectangle(
      0,
      0,
      22 * clampedRatio,
      timerBarHeight,
    );
    timerBar.setOrigin(0.5, 1);
    timerBar.isFilled = true;
    timerBar.fillColor = 0x3fa425;
    this.add(timerBar);

    // timeTxt: 타이머 바 위쪽에 고정
    const timeTxt = scene.add.text(
      0,
      -timerBarHeight - (40 * clampedRatio) / 1.5,
      '',
      {},
    );
    timeTxt.scaleX = 1.5 * clampedRatio;
    timeTxt.scaleY = 1.8 * clampedRatio;
    timeTxt.setResolution(5);
    timeTxt.setOrigin(0.5, 0.5);
    timeTxt.text = 'TIME';
    // fontSize를 비율에 따라 조정하되, 너무 크거나 작지 않게 제한
    const baseFontSize = 25;
    const minFontSize = 16;
    const maxFontSize = 32;
    const scaledFontSize = Math.max(
      minFontSize,
      Math.min(maxFontSize, baseFontSize * clampedRatio),
    );
    timeTxt.setStyle({
      color: '#000000ff',
      fontSize: `${scaledFontSize}px`,
      fontStyle: 'bold',
      stroke: '#000000ff',
      fontFamily: "'NeoDunggeunmo', 'sans-serif'",
    });
    this.add(timeTxt);

    // timerBar 참조 저장
    this.timerBar = timerBar;
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
