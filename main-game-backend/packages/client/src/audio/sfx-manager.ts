import { SFX_CONFIG, type SFXName } from '../config/soundConfig';

class SFXManager {
  private sfxMap = new Map<string, HTMLAudioElement>();
  private sfxBaseVolumes = new Map<string, number>();
  private sfxStartTimes = new Map<string, number>();
  private masterVolume = 0.5;
  private sfxEnabled = true;

  constructor() {
    this.init();
  }

  private init() {
    Object.entries(SFX_CONFIG).forEach(([name, config]) => {
      const audio = new Audio(config.file);
      const baseVolume = config.volume ?? 0.7;
      audio.volume = baseVolume * this.masterVolume;
      this.sfxMap.set(name, audio);
      this.sfxBaseVolumes.set(name, baseVolume);
      this.sfxStartTimes.set(name, config.startTime ?? 0);
    });
  }

  play(soundName: SFXName, allowOverlap = true, startTime?: number) {
    if (!this.sfxEnabled) return;
    const sfx = this.sfxMap.get(soundName);
    if (!sfx || sfx.volume === 0) return;
    if (!allowOverlap && !sfx.paused) return;
    sfx.currentTime = startTime ?? this.sfxStartTimes.get(soundName) ?? 0;
    sfx.play().catch((e) => console.log(`SFX "${soundName}" 재생 실패:`, e));
  }

  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sfxMap.forEach((sfx, name) => {
      const base = this.sfxBaseVolumes.get(name) ?? 0.7;
      sfx.volume = this.sfxEnabled ? base * this.masterVolume : 0;
    });
  }

  getVolume() {
    return this.masterVolume;
  }
  setEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }
  isEnabled() {
    return this.sfxEnabled;
  }
}

export const sfxManager = new SFXManager();
