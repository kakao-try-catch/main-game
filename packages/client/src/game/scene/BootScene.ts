import Phaser from 'phaser';
// Vite: import asset pack file as URL so Phaser can fetch it at runtime
//// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//// @ts-expect-error Vite will provide a string URL at build time
import assetPackUrl from '../../assets/asset-pack.json?url';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load Phaser Editor 2D asset pack if present
    if (assetPackUrl) {
      this.load.pack('asset-pack', assetPackUrl);
    }
  }

  create() {
    // Proceed to main scene once assets (if any) are ready
    this.scene.start('AppleGameScene');
  }
}
