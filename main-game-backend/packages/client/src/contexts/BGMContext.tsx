import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from 'react';
import type { BGMName } from '../config/soundConfig';
import { bgmManager } from '../audio/bgm-manager';

interface BGMContextType {
  setVolume: (volume: number) => void;
  getVolume: () => number;
  volume: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
  loadBGM: (bgmName: BGMName) => void;
  currentBGM: BGMName | null;
  isPlaying: boolean;
  bgmEnabled: boolean;
  setBgmEnabled: (enabled: boolean) => void;
}

const BGMContext = createContext<BGMContextType | undefined>(undefined);

export const BGMProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentBGM, setCurrentBGM] = useState<BGMName | null>('lobby');
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [bgmEnabled, setBgmEnabledState] = useState(true);

  // 초기 BGM 로드
  useEffect(() => {
    if (currentBGM) {
      bgmManager.loadBGM(currentBGM);
    }
  }, []);

  // 사용자 상호작용 감지 (권한 따기)
  const handleUserInteraction = useCallback(() => {
    if (!isInitialized) {
      const tempAudio = new Audio();
      tempAudio.play().catch(() => {});
      tempAudio.pause();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    window.addEventListener('click', handleUserInteraction, { once: true });
    return () => window.removeEventListener('click', handleUserInteraction);
  }, [handleUserInteraction]);

  // isPlaying, bgmEnabled, isInitialized 변경 시 bgmManager와 동기화
  useEffect(() => {
    if (isPlaying && isInitialized && bgmEnabled) {
      bgmManager.play();
    } else {
      bgmManager.pause();
    }
  }, [isPlaying, isInitialized, bgmEnabled]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setMasterVolume(clampedVolume);
    bgmManager.setVolume(clampedVolume);
  }, []);

  const getVolume = useCallback(() => {
    return masterVolume;
  }, [masterVolume]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    bgmManager.reset();
  }, []);

  const loadBGM = useCallback((bgmName: BGMName) => {
    setCurrentBGM(bgmName);
    bgmManager.loadBGM(bgmName);
  }, []);

  const setBgmEnabled = useCallback((enabled: boolean) => {
    setBgmEnabledState(enabled);
    bgmManager.setEnabled(enabled);
  }, []);

  const value: BGMContextType = {
    setVolume,
    getVolume,
    volume: masterVolume,
    play,
    pause,
    reset,
    loadBGM,
    currentBGM,
    isPlaying,
    bgmEnabled,
    setBgmEnabled,
  };

  return <BGMContext.Provider value={value}>{children}</BGMContext.Provider>;
};

export const useBGMContext = () => {
  const context = useContext(BGMContext);
  if (!context) {
    throw new Error('useBGMContext must be used within a BGMProvider');
  }
  return context;
};
