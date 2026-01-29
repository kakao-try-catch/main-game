import React from 'react';
import BaseRankedResult, { type BaseRankedResultProps } from './BaseRankedResult';

export type AppleResultProps = Omit<BaseRankedResultProps, 'title'>;

const AppleResult: React.FC<AppleResultProps> = (props) => (
  <BaseRankedResult {...props} title="APPLE GAME TOGETHER" />
);

export default AppleResult;
