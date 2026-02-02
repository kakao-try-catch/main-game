import Phaser from 'phaser';

export default class FlappyEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 점프 시 파티클 효과 (깃털 대신 작은 사각형/원 사용)
   */
  createJumpParticles(bird: Phaser.GameObjects.Sprite): void {
    const canvas = this.scene.game.canvas as HTMLCanvasElement;
    const ratio = canvas.width / 1440 || 1;

    // 단순한 파티클 이미지가 없으므로 기존 스프라이트를 활용한 파티클 생성
    const particles = this.scene.add.particles(0, 0, bird.texture.key, {
      x: bird.x,
      y: bird.y + bird.displayHeight / 4,
      speed: { min: 50 * ratio, max: 100 * ratio },
      angle: { min: 45, max: 135 },
      scale: { start: 0.2 * ratio, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 500,
      gravityY: 400 * ratio,
      quantity: 3,
      emitting: false,
    });

    particles.explode(5);

    // 일정 시간 후 제거
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  /**
   * 점수 획득 팝업 이펙트 (+1)
   */
  createScorePopup(x: number, y: number): void {
    const canvas = this.scene.game.canvas as HTMLCanvasElement;
    const ratio = canvas.width / 1440 || 1;
    const text = this.scene.add.text(x, y, '+1', {
      fontSize: `${32 * ratio}px`,
      color: '#ffffff',
      fontFamily: 'NeoDunggeunmo',
      stroke: '#000000',
      strokeThickness: 4 * ratio,
    });
    text.setOrigin(0.5);
    text.setDepth(1000);

    this.scene.tweens.add({
      targets: text,
      y: y - 100 * ratio,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  /**
   * 충돌 이펙트 (폭발 느낌)
   */
  createCrashEffect(bird: Phaser.GameObjects.Sprite): void {
    const canvas = this.scene.game.canvas as HTMLCanvasElement;
    const ratio = canvas.width / 1440 || 1;

    // 화면 흔들림
    this.scene.cameras.main.shake(200, 0.02);

    // 폭발 파티클
    const particles = this.scene.add.particles(0, 0, bird.texture.key, {
      x: bird.x,
      y: bird.y,
      speed: { min: 100 * ratio, max: 200 * ratio },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4 * ratio, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 300 * ratio,
      quantity: 10,
      emitting: false,
    });

    particles.explode(15);

    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  /**
   * 밧줄 장력 이펙트
   */
  showRopeSnapEffect(): void {
    this.scene.cameras.main.shake(100, 0.005);
  }
}
