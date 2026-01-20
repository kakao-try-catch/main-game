import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import appleDropSound from '../assets/sounds/SFX/appleDrop.mp3';
import gameStartSound from '../assets/sounds/SFX/gameStart.mp3';
import gameEndSound from '../assets/sounds/SFX/gameResult.mp3';
import buttonClickSound from '../assets/sounds/SFX/buttonClick.mp3';
import buttonHoverSound from '../assets/sounds/SFX/buttonHover.mp3';

// SFX 설정 타입
interface SFXConfig {
  file: string;
  volume?: number;
  startTime?: number; // 재생 시작 시점 (초 단위)
}

// SFX 목록
const SFX_CONFIG: Record<string, SFXConfig> = {
  appleDrop: { file: appleDropSound, volume: 0.7, startTime: 0 },
  gameStart: { file: gameStartSound, volume: 0.8, startTime: 0 },
  gameEnd: { file: gameEndSound, volume: 0.8, startTime: 0 },
  buttonClick: { file: buttonClickSound, volume: 1.0, startTime: 0.2 },
  buttonHover: { file: buttonHoverSound, volume: 1.0, startTime: 0 },
};

type SFXName =
  | 'appleDrop'
  | 'gameStart'
  | 'buttonClick'
  | 'gameEnd'
  | 'buttonHover';

interface SFXContextType {
  setVolume: (volume: number) => void;
  getVolume: () => number;
  volume: number; // 현재 볼륨 state
  playSFX: (
    soundName: SFXName,
    allowOverlap?: boolean,
    startTime?: number,
  ) => void;
  sfxEnabled: boolean; // SFX 활성화 여부
  setSfxEnabled: (enabled: boolean) => void; // SFX 활성화/비활성화 토글
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
    // SFX 초기화 - 모든 SFX를 미리 로드
    Object.entries(SFX_CONFIG).forEach(([name, config]) => {
      const sfxAudio = new Audio(config.file);
      const baseVolume = config.volume ?? 0.7;
      const startTime = config.startTime ?? 0;
      sfxAudio.volume = baseVolume * masterVolume;
      sfxMapRef.current.set(name, sfxAudio);
      sfxBaseVolumesRef.current.set(name, baseVolume); // 기본 볼륨 저장
      sfxStartTimesRef.current.set(name, startTime); // 시작 시점 저장
    });

    return () => {
      // 정리
      sfxMapRef.current.forEach((sfx) => {
        sfx.src = '';
      });
      sfxMapRef.current.clear();
    };
  }, [masterVolume]);

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
      sfxMapRef.current.forEach((sfx, name) => {
        const baseVolume = sfxBaseVolumesRef.current.get(name) ?? 0.7;
        sfx.volume = sfxEnabled ? baseVolume * clampedVolume : 0;
      });
    },
    [sfxEnabled],
  );

  const getVolume = useCallback(() => {
    return masterVolume;
  }, [masterVolume]);

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
