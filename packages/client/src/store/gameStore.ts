import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PlayerData } from '../../../common/src/packets';
import { type GameType, type GameConfig } from '../../../common/src/config';

// 드래그 영역 데이터 타입
export interface DragAreaData {
  playerId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// 사과 제거 이벤트 타입
export interface DropCellEvent {
  winnerId: string;
  indices: number[];
  totalScore: number;
}

// 게임 결과 타입
export interface GameResult {
  rank: number;
  playerId: string;
  score: number;
}

// 1. 상태 인터페이스 정의
interface GameState {
  count: number;
  setCount: (newCount: number) => void;
  myselfIndex: number;
  // 현재 플레이어 인덱스 설정
  setMyselfIndex: (index: number) => void;
  // players from server (room snapshot)
  players: PlayerData[];
  setPlayers: (
    playersOrUpdater: PlayerData[] | ((prev: PlayerData[]) => PlayerData[]),
  ) => void;
  // selected game type and config pushed from server
  selectedGameType?: GameType | null;
  gameConfig?: GameConfig | null;
  setGameConfig: (selected: GameType | null, cfg: GameConfig | null) => void;

  screen: 'landing' | 'lobby' | 'game';
  setScreen: (screen: 'landing' | 'lobby' | 'game') => void;

  // === 멀티플레이 상태 ===
  // 사과 게임 필드 (서버에서 받은 사과 배열)
  appleField: number[] | null;
  setAppleField: (apples: number[]) => void;

  // 게임 제한 시간
  gameTime: number | null;
  setGameTime: (time: number) => void;

  // 게임 시작 여부
  isGameStarted: boolean;
  setGameStarted: (started: boolean) => void;

  // 사과 제거 이벤트 (DROP_CELL_INDEX)
  dropCellEvent: DropCellEvent | null;
  setDropCellEvent: (event: DropCellEvent | null) => void;

  // 타 플레이어 드래그 영역 (UPDATE_DRAG_AREA)
  otherPlayerDrags: Map<string, DragAreaData>;
  updateOtherPlayerDrag: (data: DragAreaData) => void;
  removeOtherPlayerDrag: (playerId: string) => void;

  // 게임 결과 (TIME_END)
  gameResults: GameResult[] | null;
  setGameResults: (results: GameResult[]) => void;

  // 게임 상태 초기화
  resetGameState: () => void;
}

export const useGameStore = create<GameState>()(
  // gemini chat: zustand의 subscrebeWithSelector 미들웨어를 사용하는 이유 (vs 기본 create 방식)
  // https://gemini.google.com/share/20ef8fcd6595
  subscribeWithSelector((set) => ({
    count: 0,
    myselfIndex: -1,
    players: [] as PlayerData[],
    selectedGameType: null,
    gameConfig: null,

    screen: 'landing',

    // 멀티플레이 상태 초기값
    appleField: null,
    gameTime: null,
    isGameStarted: false,
    dropCellEvent: null,
    otherPlayerDrags: new Map<string, DragAreaData>(),
    gameResults: null,

    // 기존 액션
    setCount: (newCount: number) => set({ count: newCount }),
    setMyselfIndex: (index: number) => set({ myselfIndex: index }),
    setPlayers: (playersOrUpdater) => {
      if (typeof playersOrUpdater === 'function') {
        set((state) => ({ players: playersOrUpdater(state.players) }));
      } else {
        set({ players: playersOrUpdater });
      }
    },
    setGameConfig: (selected: GameType | null, cfg: GameConfig | null) =>
      set({ selectedGameType: selected, gameConfig: cfg }),

    setScreen: (screen: 'landing' | 'lobby' | 'game') => set({ screen }),

    // 멀티플레이 액션
    setAppleField: (apples: number[]) => set({ appleField: apples }),
    setGameTime: (time: number) => set({ gameTime: time }),
    setGameStarted: (started: boolean) => set({ isGameStarted: started }),
    setDropCellEvent: (event: DropCellEvent | null) =>
      set({ dropCellEvent: event }),
    updateOtherPlayerDrag: (data: DragAreaData) =>
      set((state) => {
        const newMap = new Map(state.otherPlayerDrags);
        newMap.set(data.playerId, data);
        return { otherPlayerDrags: newMap };
      }),
    removeOtherPlayerDrag: (playerId: string) =>
      set((state) => {
        const newMap = new Map(state.otherPlayerDrags);
        newMap.delete(playerId);
        return { otherPlayerDrags: newMap };
      }),
    setGameResults: (results: GameResult[]) => set({ gameResults: results }),
    resetGameState: () =>
      set({
        appleField: null,
        gameTime: null,
        isGameStarted: false,
        dropCellEvent: null,
        otherPlayerDrags: new Map<string, DragAreaData>(),
        gameResults: null,
      }),
  })),
);
