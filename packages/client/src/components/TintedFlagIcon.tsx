import React from 'react';
import flagPng from '../assets/images/flag_other.png';

interface TintedFlagIconProps {
  color: string;
  size?: number | string;
  children?: React.ReactNode;
}

export default function TintedFlagIcon({
  color,
  size = 24,
  children,
}: TintedFlagIconProps) {
  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  };

  const flagWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'inline-block',
  };

  const flagImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  const flagOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: color,
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
    WebkitMaskImage: `url(${flagPng})`,
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
    WebkitMaskPosition: 'center',
    maskImage: `url(${flagPng})`,
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
    maskPosition: 'center',
  };

  return (
    <span style={containerStyle}>
      <span style={flagWrapperStyle}>
        <img src={flagPng} alt="flag" style={flagImageStyle} />
        <span style={flagOverlayStyle} />
      </span>
      {children}
    </span>
  );
}
