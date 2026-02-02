import type React from 'react';

const highlightStyle: React.CSSProperties = {
  color: 'var(--description-highlight-color, #FFD93D)',
};

export const GAME_DESCRIPTIONS: Record<string, React.ReactNode> = {
  apple: (
    <>
      <span style={highlightStyle}>드래그</span>로 인접한 숫자 타일을 연결해서
      합이 10이 되도록 만들어 점수를 획득하세요!
    </>
  ),
  flappy: (
    <>
      <span style={highlightStyle}>스페이스바</span>로 새를 점프시켜 파이프
      장애물을 피하세요! 모든 팀원이 연결되어 함께 움직입니다.
    </>
  ),
  minesweeper: (
    <>
      <span style={highlightStyle}>좌클릭</span>으로 타일을 열어 숫자 힌트를
      확인하고, <span style={highlightStyle}>우클릭</span>으로 지뢰 위치에 깃발을
      꽂아 점수를 획득하세요!
    </>
  ),
};
