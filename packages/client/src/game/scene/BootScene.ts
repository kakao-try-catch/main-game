import Phaser from 'phaser';
// Vite: import asset pack file as URL so Phaser can fetch it at runtime

import assetPackUrl from '../../assets/asset-pack.json?url';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  private loadingText?: Phaser.GameObjects.Text;
    private loadingBg?: Phaser.GameObjects.Rectangle;

  preload() {
    // 배경색 사각형 추가 (게임 배경색과 동일: #F6F5F6)
    this.loadingBg = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0xf6f5f6
    ).setOrigin(0.5, 0.5);

    // 중앙에 '로딩중...' 텍스트 표시
    this.loadingText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'LOADING...', {
      fontFamily: 'NeoDunggeunmo, Arial',
      fontSize: '48px',
      color: '#000000',
      align: 'center',
      stroke: '#b7997e',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // Load Phaser Editor 2D asset pack if present
    if (assetPackUrl) {
      this.load.pack('asset-pack', assetPackUrl);
    }
  }

  create() {
    // 로딩 텍스트 및 배경 제거
    if (this.loadingText) this.loadingText.destroy();
    if (this.loadingBg) this.loadingBg.destroy();
    // Proceed to main scene once assets (if any) are ready
    this.scene.start('AppleGameScene');
  }
}
