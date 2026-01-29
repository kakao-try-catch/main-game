import React from 'react';
import BaseRankedResult, { type BaseRankedResultProps } from './BaseRankedResult';

export interface MineSweeperResultProps
  extends Omit<BaseRankedResultProps, 'title'> {
  stats?: {
    remainingMines?: number;
    minesHit?: number;
    elapsedMs?: number;
    cleared?: boolean;
  };
}

const MineSweeperResult: React.FC<MineSweeperResultProps> = (props) => {
  const { stats, ...rest } = props;
  void stats;
  return <BaseRankedResult {...rest} title="MINESWEEPER TOGETHER" />;
};

export default MineSweeperResult;
