import React, { useEffect } from 'react';
import { useBGMContext } from '../contexts/BGMContext';

interface SoundSettingProps {
  gameReady: boolean;
}

const SoundSetting: React.FC<SoundSettingProps> = ({ gameReady }) => {
  const { play, pause } = useBGMContext();


  useEffect(() => {
    if (gameReady) {
      play();
    } else {
      pause();
    }
  }, [gameReady, play, pause]);

  return null;
};
  
export default SoundSetting;