import React from 'react';
import type { PlayerResultData } from '../../types/common';
import { GameType } from '../../../../../common/src/config';
import type { PlayerId } from '../../types/flappybird.types';
import AppleResult, { type AppleResultProps } from './AppleResult';
import FlappyBirdResult, {
  type FlappyBirdResultProps,
} from './FlappyBirdResult';
import MineSweeperResult, {
  type MineSweeperResultProps,
} from './MineSweeperResult';

type ResultPropsByGame = {
  [GameType.APPLE_GAME]: AppleResultProps;
  [GameType.FLAPPY_BIRD]: FlappyBirdResultProps;
  [GameType.MINESWEEPER]: MineSweeperResultProps;
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
  [GameType.APPLE_GAME]: AppleResult,
  [GameType.FLAPPY_BIRD]: FlappyBirdResult,
  [GameType.MINESWEEPER]: MineSweeperResult,
} as const;

class GameResultManagerModel {
  constructor(private props: GameResultManagerProps) {}

  private createRankedPayload():
    | GameResultRenderableProps<GameType.APPLE_GAME>
    | GameResultRenderableProps<GameType.MINESWEEPER>
    | null {
    const {
      currentGameType,
      gameEnded,
      finalPlayers,
      onReplay,
      onLobby,
      ratio,
    } = this.props;
    if (!gameEnded) return null;
    if (
      currentGameType !== GameType.APPLE_GAME &&
      currentGameType !== GameType.MINESWEEPER
    ) {
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

  private createFlappyPayload(): GameResultRenderableProps<GameType.FLAPPY_BIRD> | null {
    const { flappyGameEnded, flappyFinalData, onReplay, onLobby, ratio } =
      this.props;
    if (!flappyGameEnded || !flappyFinalData) return null;
    const payload: FlappyResultPayload = { ...flappyFinalData };
    return {
      gameType: GameType.FLAPPY_BIRD,
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
  const Component = RESULT_COMPONENTS[
    renderProps.gameType
  ] as React.ComponentType<ResultPropsByGame[typeof renderProps.gameType]>;
  return (
    <Component
      {...(renderProps as ResultPropsByGame[keyof ResultPropsByGame])}
    />
  );
};

export default GameResult;
