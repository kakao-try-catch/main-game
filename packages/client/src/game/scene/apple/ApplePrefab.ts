/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';

// You can write more code here

/* START OF COMPILED CODE */

export default class ApplePrefab extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x?: number, y?: number, scale: number = 1) {
    super(scene, x ?? 0, y ?? -7);
    // 기준 해상도에서의 오프셋/크기 * scale
    const appleFrame = scene.add.image(-0.5, 5 * scale, 'selectedApple');
    appleFrame.visible = false;
    appleFrame.setScale(scale);
    this.add(appleFrame);
    // apple
    const apple = scene.add.image(0, 5 * scale, 'apple');
    apple.setScale(scale);
    this.add(apple);
    // appleText
    const appleText = scene.add.text(0, 15 * scale, '', {});
    appleText.setOrigin(0.5, 0.5);
    appleText.text = '0';
    appleText.setStyle({
      align: 'center',
      fontSize: `${50 * scale}px`,
      fontFamily: 'NeoDunggeunmo',
      fontStyle: 'bold',
    });
    this.add(appleText);
    /* START-USER-CTR-CODE */
    this.appleFrame = appleFrame;
    this.appleText = appleText;
    /* END-USER-CTR-CODE */
  }

  /* START-USER-CODE */

  private appleFrame!: Phaser.GameObjects.Image;
  //private appleShape!: Phaser.GameObjects.Ellipse;
  private appleText!: Phaser.GameObjects.Text;
  private appleNumber: number = 0;

  /** 사과 프레임의 visible을 설정합니다. */
  setFrameVisible(visible: boolean): void {
    this.appleFrame.visible = visible;
  }

  /** 사과 프레임의 색상을 설정합니다. */
  setFrameColor(color: number): void {
    this.appleFrame.setTint(color);
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
    const ratio = (window as any).__GAME_RATIO || 1;
    const worldX = this.x;
    const worldY = this.y + 7 * ratio;
    return Phaser.Geom.Rectangle.Contains(rect, worldX, worldY);
  }
  /** 사과가 떨어지는 애니메이션을 재생한 후 1초 뒤에 destroy합니다. */
  playFallAndDestroy(): void {
    // 프레임 숨기기
    this.setFrameVisible(false);

    // 랜덤 방향 (왼쪽 또는 오른쪽)
    const horizontalDistance = Phaser.Math.Between(-150, 150);

    // 포물선을 그리면서 떨어지는 애니메이션
    // X축: 일정한 속도로 이동 (포물선의 수평 이동)
    this.scene.tweens.add({
      targets: this,
      x: this.x + horizontalDistance,
      duration: 1000,
      ease: 'Linear',
    });

    // Y축: 포물선 궤적 (위로 올라갔다가 떨어짐)
    // 1단계: 위로 올라감 (감속)
    this.scene.tweens.add({
      targets: this,
      y: this.y - 50, // 위로 50px 올라감
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // 2단계: 아래로 떨어짐 (가속)
        this.scene.tweens.add({
          targets: this,
          y: this.y + 300, // 아래로 떨어짐
          duration: 600,
          ease: 'Quad.easeIn',
        });
      },
    });

    // 회전 + 페이드 아웃
    this.scene.tweens.add({
      targets: this,
      angle: Phaser.Math.Between(-360, 360),
      alpha: 0,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        this.destroy();
      },
    });
  }
  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
