import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { SFX_CONFIG, type SFXName } from '../config/soundConfig';
import { sfxManager } from '../audio/sfx-manager';

interface SFXContextType {
  setVolume: (volume: number) => void;
  getVolume: () => number;
  volume: number;
  playSFX: (
    soundName: SFXName,
    allowOverlap?: boolean,
    startTime?: number,
  ) => void;
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => void;
}

const SFXContext = createContext<SFXContextType | undefined>(undefined);

export const SFXProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const sfxMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const sfxBaseVolumesRef = useRef<Map<string, number>>(new Map()); // 각 SFX의 기본 볼륨 저장
  const sfxStartTimesRef = useRef<Map<string, number>>(new Map()); // 각 SFX의 시작 시점 저장

  const [masterVolume, setMasterVolume] = useState(0.5); // 마스터 볼륨 (0~1)
  const [sfxEnabled, setSfxEnabled] = useState(true); // SFX 활성화 여부

  // SFX 오디오 객체 생성 (초기화)
  useEffect(() => {
    const currentMap = sfxMapRef.current;
    const currentBaseVolumes = sfxBaseVolumesRef.current;
    const currentStartTimes = sfxStartTimesRef.current;

    // SFX 초기화 - 모든 SFX를 미리 로드
    Object.entries(SFX_CONFIG).forEach(([name, config]) => {
      const sfxAudio = new Audio(config.file);
      const baseVolume = config.volume ?? 0.7;
      const startTime = config.startTime ?? 0;
      sfxAudio.volume = baseVolume * masterVolume;
      currentMap.set(name, sfxAudio);
      currentBaseVolumes.set(name, baseVolume); // 기본 볼륨 저장
      currentStartTimes.set(name, startTime); // 시작 시점 저장
    });

    return () => {
      // 정리
      currentMap.forEach((sfx) => {
        sfx.src = '';
      });
      currentMap.clear();
      currentBaseVolumes.clear();
      currentStartTimes.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SFX 볼륨 업데이트
  useEffect(() => {
    sfxMapRef.current.forEach((sfx, name) => {
      const baseVolume = sfxBaseVolumesRef.current.get(name) ?? 0.7;
      sfx.volume = sfxEnabled ? baseVolume * masterVolume : 0;
    });
  }, [sfxEnabled, masterVolume]);

  // 볼륨 조절 (SFX)
  const setVolume = useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      setMasterVolume(clampedVolume);

      // SFX 볼륨은 sfxEnabled 상태에 따라 조절
      // todo 이거 뭐임?
      sfxMapRef.current.forEach((sfx, name) => {
        const baseVolume = sfxBaseVolumesRef.current.get(name) ?? 0.7;
        sfx.volume = sfxEnabled ? baseVolume * clampedVolume : 0;
      });
      sfxManager.setVolume(clampedVolume);
    },
    [sfxEnabled],
  );

  const getVolume = useCallback(() => {
    return masterVolume;
  }, [masterVolume]);

  // sfxEnabled 변경 시 sfxManager와 동기화
  useEffect(() => {
    sfxManager.setEnabled(sfxEnabled);
  }, [sfxEnabled]);

  // 범용 SFX 재생 함수
  const playSFX = useCallback(
    (soundName: SFXName, allowOverlap = true, startTime?: number) => {
      if (!sfxEnabled) return; // SFX가 비활성화되어 있으면 재생하지 않음

      const sfx = sfxMapRef.current.get(soundName);
      if (sfx) {
        // 볼륨이 0이면 효과음 재생하지 않음
        if (sfx.volume === 0) return;
        if (!allowOverlap && !sfx.paused) return;

        const defaultStartTime = sfxStartTimesRef.current.get(soundName) ?? 0;
        sfx.currentTime = startTime ?? defaultStartTime;
        sfx
          .play()
          .catch((e) => console.log(`SFX "${soundName}" 재생 실패:`, e));
      }
    },
    [sfxEnabled],
  );

  const value: SFXContextType = {
    setVolume,
    getVolume,
    volume: masterVolume,
    playSFX,
    sfxEnabled,
    setSfxEnabled,
  };

  return <SFXContext.Provider value={value}>{children}</SFXContext.Provider>;
};

export const useSFXContext = () => {
  const context = useContext(SFXContext);
  if (!context) {
    throw new Error('useSFXContext must be used within a SFXProvider');
  }
  return context;
};
