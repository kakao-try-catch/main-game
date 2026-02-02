import React, { useEffect, useState } from 'react';
import { useBGMContext } from '../contexts/BGMContext';
import { useSFXContext } from '../contexts/SFXContext';
import onIcon from '../assets/icons/volumeOn.svg';
import offIcon from '../assets/icons/volumeOff.svg';
import './SoundSetting.css';

interface SoundSettingProps {
  gameReady?: boolean;
}

const SoundSetting: React.FC<SoundSettingProps> = ({ gameReady = false }) => {
  const {
    play,
    pause,
    setVolume: setBGMVolume,
    volume: bgmVolume,
  } = useBGMContext();
  const {
    setVolume: setSFXVolume,
    volume: sfxVolume,
    playSFX,
  } = useSFXContext();

  // localStorage에서 저장된 볼륨 불러오기
  const getStoredVolume = (key: string, defaultValue: number) => {
    const stored = localStorage.getItem(key);
    return stored !== null ? parseFloat(stored) : defaultValue;
  };

  const [localBGMVolume, setLocalBGMVolume] = useState(() =>
    getStoredVolume('bgmVolume', 0.5),
  );
  const [localSFXVolume, setLocalSFXVolume] = useState(() =>
    getStoredVolume('sfxVolume', 0.5),
  );
  const [previousBGMVolume, setPreviousBGMVolume] = useState(() =>
    getStoredVolume('previousBGMVolume', 0.5),
  );
  const [previousSFXVolume, setPreviousSFXVolume] = useState(() =>
    getStoredVolume('previousSFXVolume', 0.5),
  );

  // 초기 볼륨 설정 (컴포넌트 마운트 시)
  useEffect(() => {
    setBGMVolume(localBGMVolume);
    setSFXVolume(localSFXVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // volume state 변경 시 슬라이더 동기화
  useEffect(() => {
    setLocalBGMVolume(bgmVolume);
  }, [bgmVolume]);

  useEffect(() => {
    setLocalSFXVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    if (gameReady && localBGMVolume > 0) {
      play();
    } else {
      pause();
    }
  }, [gameReady, play, pause, localBGMVolume]);

  const handleBGMVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setLocalBGMVolume(newVol);
    setBGMVolume(newVol);
    localStorage.setItem('bgmVolume', newVol.toString());
    // 0이 아닌 볼륨으로 변경할 때 이전 볼륨으로 저장
    if (newVol > 0) {
      setPreviousBGMVolume(newVol);
      localStorage.setItem('previousBGMVolume', newVol.toString());
    }
  };

  const handleSFXVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setLocalSFXVolume(newVol);
    setSFXVolume(newVol);
    localStorage.setItem('sfxVolume', newVol.toString());
    // 0이 아닌 볼륨으로 변경할 때 이전 볼륨으로 저장
    if (newVol > 0) {
      setPreviousSFXVolume(newVol);
      localStorage.setItem('previousSFXVolume', newVol.toString());
    }
  };

  const toggleBGM = () => {
    playSFX('buttonClick');
    if (localBGMVolume > 0) {
      // 음소거: 현재 볼륨을 저장하고 0으로 설정
      setPreviousBGMVolume(localBGMVolume);
      localStorage.setItem('previousBGMVolume', localBGMVolume.toString());
      setLocalBGMVolume(0);
      setBGMVolume(0);
      localStorage.setItem('bgmVolume', '0');
    } else {
      // 음소거 해제: 이전 볼륨으로 복원
      setLocalBGMVolume(previousBGMVolume);
      setBGMVolume(previousBGMVolume);
      localStorage.setItem('bgmVolume', previousBGMVolume.toString());
    }
  };

  const toggleSFX = () => {
    if (localSFXVolume > 0) {
      // 음소거: 현재 볼륨을 저장하고 0으로 설정
      setPreviousSFXVolume(localSFXVolume);
      localStorage.setItem('previousSFXVolume', localSFXVolume.toString());
      setLocalSFXVolume(0);
      setSFXVolume(0);
      localStorage.setItem('sfxVolume', '0');
    } else {
      // 음소거 해제: 이전 볼륨으로 복원
      setLocalSFXVolume(previousSFXVolume);
      setSFXVolume(previousSFXVolume);
      localStorage.setItem('sfxVolume', previousSFXVolume.toString());
    }
    playSFX('buttonClick');
  };

  return (
    <div className="sound-setting-container">
      {/* BGM 컨트롤 */}
      <div className="sound-control-row">
        <div className="sound-icon-wrapper" onClick={toggleBGM}>
          <img
            src={localBGMVolume > 0 ? onIcon : offIcon}
            className="sound-icon"
            alt={localBGMVolume > 0 ? 'BGM On' : 'BGM Off'}
          />
        </div>
        <div className="sound-label">BGM</div>
        <div className="slider-wrapper">
          <input
            className="pixel-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={localBGMVolume}
            onChange={handleBGMVolumeChange}
          />
        </div>
      </div>

      {/* SFX 컨트롤 */}
      <div className="sound-control-row">
        <div className="sound-icon-wrapper" onClick={toggleSFX}>
          <img
            src={localSFXVolume > 0 ? onIcon : offIcon}
            className="sound-icon"
            alt={localSFXVolume > 0 ? 'SFX On' : 'SFX Off'}
          />
        </div>
        <div className="sound-label">SFX</div>
        <div className="slider-wrapper">
          <input
            className="pixel-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={localSFXVolume}
            onChange={handleSFXVolumeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SoundSetting;
