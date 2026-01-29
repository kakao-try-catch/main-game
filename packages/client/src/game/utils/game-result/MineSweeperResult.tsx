import React from 'react';
import BaseRankedResult, {
  type BaseRankedResultProps,
} from './BaseRankedResult';
import type { PlayerResultData } from '../../types/common';
import type { MineSweeperResultPlayer } from '../../types/minesweeper.types';
import flagPng from '../../../assets/images/flag_other.png';

export interface MineSweeperResultProps extends Omit<
  BaseRankedResultProps,
  'title' | 'renderPlayerSubline'
> {
  stats?: {
    remainingMines?: number;
    minesHit?: number;
    elapsedMs?: number;
    cleared?: boolean;
  };
}

const getPlayerSubline = (player: PlayerResultData): React.ReactNode => {
  const statsPlayer = player as MineSweeperResultPlayer;
  const totalFlags = statsPlayer.totalFlags ?? 0;
  if (totalFlags <= 0) return null;
  const correctFlags = statsPlayer.correctFlags ?? 0;
  const flagStyle: React.CSSProperties = {
    width: '1em',
    height: '1em',
    display: 'inline-block',
    backgroundColor: player.color,
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
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span role="img" aria-label="flag" style={flagStyle} />
      <span>{`${correctFlags} / ${totalFlags}`}</span>
    </span>
  );
};

const MineSweeperResult: React.FC<MineSweeperResultProps> = (props) => {
  const { stats, ...baseProps } = props;
  void stats;

  return (
    <BaseRankedResult
      {...baseProps}
      title="MINESWEEPER TOGETHER"
      renderPlayerSubline={getPlayerSubline}
    />
  );
};

export default MineSweeperResult;
