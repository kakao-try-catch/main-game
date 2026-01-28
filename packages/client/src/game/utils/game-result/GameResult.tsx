import React from 'react';
import type { PlayerResultData, GameType } from '../../types/common';
import type { PlayerId } from '../../types/flappybird.types';
import AppleResult, { type AppleResultProps } from './AppleResult';
import FlappyBirdResult, {
  type FlappyBirdResultProps,
} from './FlappyBirdResult';
import MineSweeperResult, {
  type MineSweeperResultProps,
} from './MineSweeperResult';

type ResultPropsByGame = {
  apple: AppleResultProps;
  minesweeper: MineSweeperResultProps;
  flappy: FlappyBirdResultProps;
};

type GameResultRenderableProps<
  T extends keyof ResultPropsByGame = keyof ResultPropsByGame,
> = { gameType: T } & ResultPropsByGame[T];

type RankedResultPayload = {
  players: PlayerResultData[];
};

type FlappyResultPayload = {
  finalScore: number;
  reason: 'pipe_collision' | 'ground_collision';
  collidedPlayerId?: PlayerId;
  players: PlayerResultData[];
};

export interface GameResultManagerProps {
  currentGameType?: GameType;
  gameEnded: boolean;
  finalPlayers: PlayerResultData[];
  flappyGameEnded: boolean;
  flappyFinalData: FlappyResultPayload | null;
  onReplay: () => void;
  onLobby: () => void;
  ratio?: number;
}

const RESULT_COMPONENTS = {
  apple: AppleResult,
  minesweeper: MineSweeperResult,
  flappy: FlappyBirdResult,
} as const;

class GameResultManagerModel {
  constructor(private props: GameResultManagerProps) {}

  private createRankedPayload():
    | GameResultRenderableProps<'apple'>
    | GameResultRenderableProps<'minesweeper'>
    | null {
    const { currentGameType, gameEnded, finalPlayers, onReplay, onLobby, ratio } =
      this.props;
    if (!gameEnded) return null;
    if (currentGameType !== 'apple' && currentGameType !== 'minesweeper') {
      return null;
    }
    const payload: RankedResultPayload = { players: finalPlayers };
    return {
      gameType: currentGameType,
      ...payload,
      onReplay,
      onLobby,
      ratio,
    };
  }

  private createFlappyPayload(): GameResultRenderableProps<'flappy'> | null {
    const {
      flappyGameEnded,
      flappyFinalData,
      onReplay,
      onLobby,
      ratio,
    } = this.props;
    if (!flappyGameEnded || !flappyFinalData) return null;
    const payload: FlappyResultPayload = { ...flappyFinalData };
    return {
      gameType: 'flappy',
      ...payload,
      onReplay,
      onLobby,
      ratio,
    };
  }

  public buildRenderableProps(): GameResultRenderableProps | null {
    return this.createFlappyPayload() ?? this.createRankedPayload();
  }
}

const GameResult: React.FC<GameResultManagerProps> = (props) => {
  const model = new GameResultManagerModel(props);
  const renderProps = model.buildRenderableProps();
  if (!renderProps) return null;
  const Component =
    RESULT_COMPONENTS[renderProps.gameType] as React.ComponentType<
      ResultPropsByGame[typeof renderProps.gameType]
    >;
  return (
    <Component
      {...(renderProps as ResultPropsByGame[keyof ResultPropsByGame])}
    />
  );
};

export default GameResult;
