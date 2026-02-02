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

const POOL_SIZE = 4; // 각 효과음당 미리 생성할 Audio 객체 수

interface SFXPoolItem {
  audio: HTMLAudioElement;
  baseVolume: number;
  startTime: number;
}

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
  // Audio Pool: 각 SFX마다 여러 개의 Audio 객체를 미리 생성
  const sfxPoolRef = useRef<Map<string, SFXPoolItem[]>>(new Map());
  const poolIndexRef = useRef<Map<string, number>>(new Map()); // 현재 사용할 풀 인덱스

  const [masterVolume, setMasterVolume] = useState(0.5); // 마스터 볼륨 (0~1)
  const [sfxEnabled, setSfxEnabled] = useState(true); // SFX 활성화 여부

  // SFX Audio Pool 초기화
  useEffect(() => {
    const currentPool = sfxPoolRef.current;
    const currentIndex = poolIndexRef.current;

    // 각 SFX에 대해 POOL_SIZE만큼 Audio 객체 미리 생성
    Object.entries(SFX_CONFIG).forEach(([name, config]) => {
      const pool: SFXPoolItem[] = [];
      const baseVolume = config.volume ?? 0.7;
      const startTime = config.startTime ?? 0;

      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(config.file);
        audio.preload = 'auto'; // 미리 로드
        audio.volume = baseVolume * masterVolume;
        pool.push({ audio, baseVolume, startTime });
      }

      currentPool.set(name, pool);
      currentIndex.set(name, 0);
    });

    return () => {
      // 정리
      currentPool.forEach((pool) => {
        pool.forEach((item) => {
          item.audio.src = '';
        });
      });
      currentPool.clear();
      currentIndex.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SFX 볼륨 업데이트
  useEffect(() => {
    sfxPoolRef.current.forEach((pool) => {
      pool.forEach((item) => {
        item.audio.volume = sfxEnabled ? item.baseVolume * masterVolume : 0;
      });
    });
  }, [sfxEnabled, masterVolume]);

  // 볼륨 조절 (SFX)
  const setVolume = useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      setMasterVolume(clampedVolume);

      // SFX 볼륨은 sfxEnabled 상태에 따라 조절
      sfxPoolRef.current.forEach((pool) => {
        pool.forEach((item) => {
          item.audio.volume = sfxEnabled ? item.baseVolume * clampedVolume : 0;
        });
      });
      sfxManager.setVolume(clampedVolume);
    },
    [sfxEnabled],
  );

  const getVolume = useCallback(() => {
    return masterVolume;
  }, [masterVolume]);

  // 범용 SFX 재생 함수 (Audio Pool 사용)
  const playSFX = useCallback(
    (soundName: SFXName, allowOverlap = true, startTime?: number) => {
      if (!sfxEnabled) return; // SFX가 비활성화되어 있으면 재생하지 않음

      const pool = sfxPoolRef.current.get(soundName);
      if (!pool || pool.length === 0) return;

      // 볼륨이 0이면 효과음 재생하지 않음
      if (pool[0].audio.volume === 0) return;

      const actualStartTime = startTime ?? pool[0].startTime;

      if (allowOverlap) {
        // 중첩 허용: 풀에서 다음 Audio 객체 사용 (라운드 로빈)
        const currentIndex = poolIndexRef.current.get(soundName) ?? 0;
        const item = pool[currentIndex];

        // 다음 인덱스로 이동 (순환)
        poolIndexRef.current.set(soundName, (currentIndex + 1) % pool.length);

        item.audio.currentTime = actualStartTime;
        item.audio.play().catch(() => {
          // 재생 실패 시 무시 (사용자 상호작용 없이 재생 시도 등)
        });
      } else {
        // 중첩 비허용: 첫 번째 Audio 객체만 사용
        const item = pool[0];
        if (!item.audio.paused) return;
        item.audio.currentTime = actualStartTime;
        item.audio.play().catch(() => {
          // 재생 실패 시 무시
        });
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
