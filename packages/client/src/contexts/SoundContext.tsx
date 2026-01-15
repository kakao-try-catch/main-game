import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import bgmFile from '../assets/sounds/testapplebgm.mp3';

interface SoundContextType {
  setVolume: (volume: number) => void;
  getVolume: () => number;
  play: () => void;
  pause: () => void;
  isPlaying: boolean;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // 브라우저 권한 획득 여부
  const [isPlaying, setIsPlaying] = useState(false);

  // 오디오 객체 생성 (초기화)
  useEffect(() => {
    const audio = new Audio(bgmFile);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // 실제 오디오 재생/정지 로직 (상태 변화 감지)
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && isInitialized) {
      audioRef.current.play().catch((e) => console.log("재생 실패:", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isInitialized]); 

  // 사용자 상호작용 감지 (권한 따기)
  const handleUserInteraction = useCallback(() => {
    if (audioRef.current && !isInitialized) {
      audioRef.current.play().catch((error) => {
          console.error('BGM 초기화 play() 실패:', error);
        } );
      audioRef.current.pause();
      setIsInitialized(true); 
    }
  } ,  [ ] ) ;

  useEffect(() => {
    window.addEventListener('click', handleUserInteraction, { once: true });
    return () => window.removeEventListener('click', handleUserInteraction);
  }, [handleUserInteraction]);

  // 볼륨 조절
  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
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

  const value: SoundContextType = {
    setVolume,
    getVolume,
    play,
    pause,
    isPlaying,
  };

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSoundContext = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useBGMContext must be used within a BGMProvider');
  }
  return context;
};