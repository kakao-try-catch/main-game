import Phaser from 'phaser';

export class AppleGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AppleGameScene' });
  }

  preload() {
    // 게임 에셋 로드
    // this.load.image('key', 'path/to/image.png');
  }

  create() {
    // 게임 오브젝트 생성
    const text = this.add.text(400, 300, '테스트', {
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
     console.log(_time, _delta);
  }
}
