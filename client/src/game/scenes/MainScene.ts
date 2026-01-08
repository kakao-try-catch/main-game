import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // 게임 에셋 로드
    // this.load.image('key', 'path/to/image.png');
  }

  create() {
    // 게임 오브젝트 생성
    const text = this.add.text(400, 300, 'Phaser + React + TypeScript', {
      fontSize: '32px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    // 클릭 이벤트 예제
    this.input.on('pointerdown', () => {
      console.log('Game canvas clicked!');
    });
  }

  update(_time: number, _delta: number) {
    // 게임 로직 업데이트
  }
}
