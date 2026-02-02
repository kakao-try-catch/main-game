import Phaser from 'phaser';

export default class FlappySoundManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playJump(): void {
    this.scene.events.emit('flappyJump');
  }

  playScore(): void {
    this.scene.events.emit('flappyScore');
  }

  playCrash(): void {
    this.scene.events.emit('flappyStrike');
  }

  // 밧줄 관련 사운드는 에셋이 없으므로 구현하지 않음
  // playRopeTension(tension: number): void { ... }
  // playSyncJump(playerCount: number): void { ... }
}
