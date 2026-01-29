import { BGM_CONFIG, type BGMName } from '../config/soundConfig';

class BGMManager {
  private bgmMap = new Map<string, HTMLAudioElement>();
  private bgmBaseVolumes = new Map<string, number>();
  private masterVolume = 0.5;
  private bgmEnabled = true;
  private currentBGM: BGMName | null = null;
  private _isPlaying = false;

  constructor() {
    this.init();
  }

  private init() {
    // 모든 BGM을 미리 로드
    Object.entries(BGM_CONFIG).forEach(([name, config]) => {
      const audio = new Audio(config.file);
      audio.loop = true;
      const baseVolume = config.volume ?? 1.0;
      audio.volume = baseVolume * this.masterVolume;
      this.bgmMap.set(name, audio);
      this.bgmBaseVolumes.set(name, baseVolume);
    });
  }

  loadBGM(bgmName: BGMName) {
    // 현재 BGM 정지
    if (this.currentBGM) {
      const oldBGM = this.bgmMap.get(this.currentBGM);
      if (oldBGM) {
        oldBGM.pause();
        oldBGM.currentTime = 0;
      }
    }

    this.currentBGM = bgmName;

    // 재생 중이었다면 새 BGM 재생
    if (this._isPlaying && this.bgmEnabled) {
      const newBGM = this.bgmMap.get(bgmName);
      if (newBGM) {
        newBGM.currentTime = 0;
        newBGM.play().catch((e) => console.log('BGM 재생 실패:', e));
      }
    }
  }

  play() {
    this._isPlaying = true;
    if (!this.bgmEnabled || !this.currentBGM) return;

    const bgm = this.bgmMap.get(this.currentBGM);
    if (bgm) {
      bgm.play().catch((e) => console.log('BGM 재생 실패:', e));
    }
  }

  pause() {
    this._isPlaying = false;
    if (this.currentBGM) {
      const bgm = this.bgmMap.get(this.currentBGM);
      if (bgm) {
        bgm.pause();
      }
    }
  }

  reset() {
    if (this.currentBGM) {
      const bgm = this.bgmMap.get(this.currentBGM);
      if (bgm) {
        bgm.currentTime = 0;
      }
    }
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.bgmMap.forEach((bgm, name) => {
      const base = this.bgmBaseVolumes.get(name) ?? 1.0;
      bgm.volume = this.bgmEnabled ? base * this.masterVolume : 0;
    });
  }

  getVolume() {
    return this.masterVolume;
  }

  setEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.bgmMap.forEach((bgm) => bgm.pause());
    } else if (this._isPlaying && this.currentBGM) {
      const bgm = this.bgmMap.get(this.currentBGM);
      if (bgm) {
        bgm.play().catch((e) => console.log('BGM 재생 실패:', e));
      }
    }
  }

  isEnabled() {
    return this.bgmEnabled;
  }

  isPlaying() {
    return this._isPlaying;
  }

  getCurrentBGM() {
    return this.currentBGM;
  }
}

export const bgmManager = new BGMManager();
