import Phaser from 'phaser';

// You can write more code here

/* START OF COMPILED CODE */

export default class ApplePrefab extends Phaser.GameObjects.Container {

   constructor(scene: Phaser.Scene, x?: number, y?: number, scale: number = 1) {
      super(scene, x ?? 0, y ?? -7);
      // 기준 해상도에서의 오프셋/크기 * scale
      const appleFrame = scene.add.image(-0.5, 5 * scale, "selectedApple");
      appleFrame.visible = false;
      appleFrame.setScale(scale);
      this.add(appleFrame);
      // apple
      const apple = scene.add.image(0, 5 * scale, "apple");
      apple.setScale(scale);
      this.add(apple);
      // appleText
      const appleText = scene.add.text(0, 15 * scale, "", {});
      appleText.setOrigin(0.5, 0.5);
      appleText.text = "0";
      appleText.setStyle({ "align": "center", "fontSize": `${50 * scale}px`, "fontFamily": "NeoDunggeunmo", "fontStyle": "bold" });
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
		this.appleFrame.setTint ( color ) ;
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
      const ratio = (window as any).__APPLE_GAME_RATIO || 1;
      const worldX = this.x;
      const worldY = this.y + 7 * ratio;
      return Phaser.Geom.Rectangle.Contains(rect, worldX, worldY);
   }

   /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
