import React, { useEffect, useState } from 'react';
import { useBGMContext } from '../contexts/BGMContext';
import { useSFXContext } from '../contexts/SFXContext';
import onIcon from '../assets/icons/volumeOn.svg';
import offIcon from '../assets/icons/volumeOff.svg';
import './SoundSetting.css';

interface SoundSettingProps {
  gameReady: boolean;
}

const SoundSetting: React.FC<SoundSettingProps> = ({ gameReady }) => {
  const {
    play,
    pause,
    isPlaying,
    setVolume: setBGMVolume,
    volume,
    bgmEnabled,
    setBgmEnabled,
  } = useBGMContext();
  const { setVolume: setSFXVolume } = useSFXContext();
  const [isHovered, setIsHovered] = useState(false);
  const [localVolume, setLocalVolume] = useState(0.5);

  // volume state 변경 시 슬라이더 동기화
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (gameReady && localVolume > 0) {
      play();
    } else {
      pause();
    }
  }, [gameReady, play, pause, localVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setLocalVolume(newVol);
    setBGMVolume(newVol);
    setSFXVolume(newVol);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <>
      <div
        style={styles.container}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered && (
          <div
            className="nes-container is-rounded"
            style={{ padding: '4px 8px' }}
          >
            <input
              className="pixel-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localVolume}
              onChange={handleVolumeChange}
            />
          </div>
        )}
        <div onClick={togglePlay}>
          {isPlaying === true ? (
            <img src={onIcon} style={styles.soundIcon} alt="On" />
          ) : (
            <img src={offIcon} style={styles.soundIcon} alt="Off" />
          )}
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            className="nes-checkbox"
            checked={!bgmEnabled}
            onChange={(e) => setBgmEnabled(!e.target.checked)}
          />
          <span style={styles.checkboxText}>Mute BGM</span>
        </label>
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '10px',
  },
  soundIcon: {
    width: '40px',
    height: '40px',
    transition: 'all 0.3s ease',
  },
  pixelSlider: {
    width: '100%',
    height: 12,
    background: '#d3d3d3',
    border: '3px solid #000',
    borderRadius: 0,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '12px',
  },
  checkboxText: {
    fontSize: '14px',
    fontWeight: 'bold',
    userSelect: 'none' as const,
    color: '#000',
  },
};

export default SoundSetting;
