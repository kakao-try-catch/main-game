import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import bgmFile from '../assets/sounds/testapplebgm.mp3';
import appleDropSound from '../assets/sounds/SFX/appleDrop.mp3';
import gameStartSound from '../assets/sounds/SFX/gameStart.mp3';
import gameEndSound from '../assets/sounds/SFX/gameResult.mp3';
import buttonClickSound from '../assets/sounds/SFX/buttonClick.mp3';

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

};

type SFXName = 'appleDrop' | 'gameStart' | 'buttonClick' | 'gameEnd';

interface SoundContextType {
  setVolume: (volume: number) => void;
  getVolume: () => number;
  volume: number; // 현재 볼륨 state
  play: () => void;
  pause: () => void;
  isPlaying: boolean;
  playSFX: (soundName: SFXName, allowOverlap?: boolean) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sfxMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const sfxBaseVolumesRef = useRef<Map<string, number>>(new Map()); // 각 SFX의 기본 볼륨 저장
  const sfxStartTimesRef = useRef<Map<string, number>>(new Map()); // 각 SFX의 시작 시점 저장

  const [isInitialized, setIsInitialized] = useState(false); // 브라우저 권한 획득 여부
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5); // 마스터 볼륨 (0~1)

  // BGM 및 SFX 오디오 객체 생성 (초기화)
  useEffect(() => {
    // BGM 초기화
    const audio = new Audio(bgmFile);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    // SFX 초기화 - 모든 SFX를 미리 로드
    Object.entries(SFX_CONFIG).forEach(([name, config]) => {
      const sfxAudio = new Audio(config.file);
      const baseVolume = config.volume ?? 0.7;
      const startTime = config.startTime ?? 0;
      sfxAudio.volume = baseVolume * 0.5; // 초기 마스터 볼륨(0.5) 적용
      sfxMapRef.current.set(name, sfxAudio);
      sfxBaseVolumesRef.current.set(name, baseVolume); // 기본 볼륨 저장
      sfxStartTimesRef.current.set(name, startTime); // 시작 시점 저장
    });

    return () => {
      // 정리
      audio.pause();
      audio.src = '';
      sfxMapRef.current.forEach(sfx => {
        sfx.src = '';
      });
      sfxMapRef.current.clear();
    };
  }, []);

  // 실제 오디오 재생/정지 로직 (상태 변화 감지)
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && isInitialized) {
      audioRef.current.play().catch((e) => console.log("재생 실패:", e));
    } else if (!isPlaying && isInitialized) {
      audioRef.current.pause();
      setVolume(0);
    }
  }, [isPlaying, isInitialized]);

  // 사용자 상호작용 감지 (권한 따기)
  const handleUserInteraction = useCallback(() => {
    if (audioRef.current && !isInitialized) {
      audioRef.current.play().catch((error) => {
        console.error('BGM 초기화 play() 실패:', error);
      });
      audioRef.current.pause();
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('click', handleUserInteraction, { once: true });
    return () => window.removeEventListener('click', handleUserInteraction);
  }, [handleUserInteraction]);

  // 볼륨 조절 (BGM + SFX 모두)
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setMasterVolume(clampedVolume);

    // BGM 볼륨 조절
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    // 모든 SFX 볼륨을 기본 볼륨 비율에 맞춰 조절
    sfxMapRef.current.forEach((sfx, name) => {
      const baseVolume = sfxBaseVolumesRef.current.get(name) ?? 0.7;
      sfx.volume = baseVolume * clampedVolume;
    });
  }, []);

  const getVolume = useCallback(() => {
    return audioRef.current?.volume ?? 0.5;
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // 범용 SFX 재생 함수
  const playSFX = useCallback((soundName: SFXName, allowOverlap = true, startTime?: number) => {
    const sfx = sfxMapRef.current.get(soundName);
    if (sfx) {
      if (!allowOverlap && !sfx.paused) return; // 이미 재생 중이면 무시
      // startTime이 지정되지 않으면 설정된 기본값 사용
      const defaultStartTime = sfxStartTimesRef.current.get(soundName) ?? 0;
      sfx.currentTime = startTime ?? defaultStartTime;
      sfx.play().catch((e) => console.log(`SFX "${soundName}" 재생 실패:`, e));
    }
  }, []);

  const value: SoundContextType = {
    setVolume,
    getVolume,
    volume: masterVolume,
    play,
    pause,
    isPlaying,
    playSFX,
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSoundContext = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
};