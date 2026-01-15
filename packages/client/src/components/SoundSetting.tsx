import React, { useEffect, useState } from 'react';
import { useSoundContext } from '../contexts/SoundContext';
import onIcon from '../assets/icons/volumeOn.svg';
import offIcon from '../assets/icons/volumeOff.svg';
import './SoundSetting.css';

interface SoundSettingProps {
  gameReady: boolean;
}

const SoundSetting: React.FC<SoundSettingProps> = ({ gameReady }) => {
  const { play, pause, isPlaying, setVolume, getVolume } = useSoundContext();
  
  const [isHovered, setIsHovered] = useState(false);
  const [localVolume, setLocalVolume] = useState(0.5);

  useEffect(() => {
    setLocalVolume(getVolume());
  }, [getVolume]);

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
    setVolume(newVol);
    
    if (newVol > 0 && !isPlaying) play();
    if (newVol === 0 && isPlaying) pause();
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
        <div onClick={togglePlay}>
          {isPlaying === true ? (
            <img src={onIcon} style={styles.soundIcon} alt="On"/>
          ) : ( 
            <img src={offIcon} style={styles.soundIcon} alt="Off"/>)}
        </div>

        {isHovered && (
          <div className="nes-container is-rounded" style={{ padding: "4px 8px" }}>
            <input className="pixel-slider" type="range" min="0" max="1" step="0.05" value={localVolume} onChange={handleVolumeChange} />
          </div>
        )}

      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    cursor: 'pointer',
    padding: '10px', 
  },
  soundIcon:{
    width: '40px', 
    height: '40px', 
    transition: 'all 0.3s ease',
  },
  pixelSlider: {
    width: '100%',
    height: 12,
    cursor: 'pointer',
    background: '#d3d3d3',
    border: '3px solid #000',
    borderRadius: 0
  },

};

export default SoundSetting;