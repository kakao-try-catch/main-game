import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { BGM_CONFIG, type BGMName } from '../config/soundConfig';

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
  const bgmMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const bgmBaseVolumesRef = useRef<Map<string, number>>(new Map());

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentBGM, setCurrentBGM] = useState<BGMName | null>('lobby'); // 기본값: 로비 BGM
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [bgmEnabled, setBgmEnabled] = useState(true);

  // 초기 BGM 로드
  useEffect(() => {
    const currentMap = bgmMapRef.current;
    const currentBaseVolumes = bgmBaseVolumesRef.current;

    if (currentBGM && !currentMap.has(currentBGM)) {
      const config = BGM_CONFIG[currentBGM];
      const bgmAudio = new Audio(config.file);
      bgmAudio.loop = true;
      const baseVolume = config.volume ?? 1.0;
      bgmAudio.volume = baseVolume * masterVolume;
      currentMap.set(currentBGM, bgmAudio);
      currentBaseVolumes.set(currentBGM, baseVolume);
      console.log(`초기 BGM "${currentBGM}" 로드 완료`);
    }

    return () => {
      // 정리
      currentMap.forEach((bgm) => {
        bgm.pause();
        bgm.src = '';
      });
      currentMap.clear();
      currentBaseVolumes.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBGM]);

  // BGM 볼륨 계산
  const calculateBGMVolume = useCallback(
    (baseName: string) => {
      const baseVolume = bgmBaseVolumesRef.current.get(baseName) ?? 1.0;
      return baseVolume * masterVolume;
    },
    [masterVolume],
  );

  // BGM 재생/정지 로직 (bgmEnabled에 따라 제어)
  useEffect(() => {
    if (!currentBGM) return;
    const bgm = bgmMapRef.current.get(currentBGM);
    if (!bgm) return;

    // BGM 볼륨 업데이트
    bgm.volume = calculateBGMVolume(currentBGM);

    // bgmEnabled 상태에 따라 BGM만 재생/일시정지
    if (isPlaying && isInitialized && bgmEnabled) {
      bgm.play().catch((e) => console.log('재생 실패:', e));
    } else {
      bgm.pause();
    }
  }, [isPlaying, isInitialized, currentBGM, bgmEnabled, calculateBGMVolume]);

  // BGM 로드 함수
  const loadBGMIfNeeded = useCallback(
    (bgmName: BGMName) => {
      if (!bgmMapRef.current.has(bgmName)) {
        const config = BGM_CONFIG[bgmName];
        const bgmAudio = new Audio(config.file);
        bgmAudio.loop = true;
        const baseVolume = config.volume ?? 1.0;
        bgmAudio.volume = baseVolume * masterVolume;
        bgmMapRef.current.set(bgmName, bgmAudio);
        bgmBaseVolumesRef.current.set(bgmName, baseVolume);
        console.log(`BGM "${bgmName}" 로드 완료`);
      }
      return bgmMapRef.current.get(bgmName)!;
    },
    [masterVolume],
  );

  // 사용자 상호작용 감지 (권한 따기)
  const handleUserInteraction = useCallback(() => {
    if (!isInitialized) {
      // 초기화를 위해 임시로 오디오 재생/정지
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

  // 볼륨 조절 (BGM)
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setMasterVolume(clampedVolume);

    // 모든 BGM 볼륨 조절
    bgmMapRef.current.forEach((bgm, name) => {
      const baseVolume = bgmBaseVolumesRef.current.get(name) ?? 1.0;
      bgm.volume = baseVolume * clampedVolume;
    });
  }, []);

  const getVolume = useCallback(() => {
    if (currentBGM) {
      const bgm = bgmMapRef.current.get(currentBGM);
      return bgm?.volume ?? 0.5;
    }
    return 0.5;
  }, [currentBGM]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    if (currentBGM) {
      const bgm = bgmMapRef.current.get(currentBGM);
      if (bgm) {
        bgm.currentTime = 0;
      }
    }
  }, [currentBGM]);

  // BGM 로드 및 전환 함수
  const loadBGM = useCallback(
    (bgmName: BGMName) => {
      const wasPlaying = isPlaying;

      // 현재 BGM 정지
      if (currentBGM) {
        const oldBGM = bgmMapRef.current.get(currentBGM);
        if (oldBGM) {
          oldBGM.pause();
          oldBGM.currentTime = 0;
        }
      }

      // 새 BGM 로드 (필요시)
      const newBGM = loadBGMIfNeeded(bgmName);

      // 새 BGM 설정
      setCurrentBGM(bgmName);

      // 재생 중이었다면 새 BGM 재생
      if (wasPlaying && isInitialized) {
        newBGM.currentTime = 0;
        newBGM.play().catch((e) => console.log('BGM 재생 실패:', e));
      }
    },
    [currentBGM, isPlaying, isInitialized, loadBGMIfNeeded],
  );

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
