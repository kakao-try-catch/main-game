import Phaser from 'phaser';
// Vite: import asset pack file as URL so Phaser can fetch it at runtime

import assetPackUrl from '../../../assets/asset-pack.json?url';

export class BootScene extends Phaser.Scene {
  private nextSceneName: string;

  constructor(nextSceneName: string = 'AppleGameScene') {
    super('BootScene');
    this.nextSceneName = nextSceneName;
  }

  private loadingText?: Phaser.GameObjects.Text;
  private loadingBg?: Phaser.GameObjects.Rectangle;

  preload() {
    // 배경색 사각형 추가 (게임 배경색과 동일: #F6F5F6)
    this.loadingBg = this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0xf6f5f6,
      )
      .setOrigin(0.5, 0.5)
      .setDepth(10000); // 최상단

    // 중앙에 '로딩중...' 텍스트 표시
    this.loadingText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'LOADING...',
        {
          fontFamily: 'NeoDunggeunmo, Arial',
          fontSize: '48px',
          color: '#000000',
          align: 'center',
          stroke: '#b7997e',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(10001); // 텍스트는 배경보다 위

    // Load Phaser Editor 2D asset pack if present
    if (assetPackUrl) {
      this.load.pack('asset-pack', assetPackUrl);
    }
  }

  create() {
    // 다음 씬을 백그라운드에서 시작 (보이지 않음)
    this.scene.launch(this.nextSceneName);

    // 다음 씬을 비활성화 상태로 유지
    this.scene.sleep(this.nextSceneName);

    // 다음 씬이 준비되면 전환
    const nextScene = this.scene.get(this.nextSceneName);
    if (nextScene) {
      nextScene.events.once('scene-ready', () => {
        this.transitionToNextScene();
      });
    }
  }

  private transitionToNextScene(): void {
    // 씬이 이미 파괴되었는지 확인
    if (!this.scene || !this.scene.isActive('BootScene')) {
      return;
    }

    // 로딩 UI 정리
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = undefined;
    }
    if (this.loadingBg) {
      this.loadingBg.destroy();
      this.loadingBg = undefined;
    }

    // 다음 씬 깨우기 및 BootScene 중지
    // 비활성 창에서도 안정적으로 동작하도록 즉시 전환 (페이드 없음)
    this.scene.wake(this.nextSceneName);
    this.scene.stop('BootScene');
  }
}
