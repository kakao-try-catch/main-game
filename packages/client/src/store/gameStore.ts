import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  FlappyBirdData,
  FlappyPipeData,
  PlayerData,
} from '../../../common/src/common-type';
import { type GameType, type GameConfig } from '../../../common/src/config';

// 드래그 영역 데이터 타입
export interface DragAreaData {
  playerIndex: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// 사과 제거 이벤트 타입
export interface DropCellEvent {
  winnerIndex: number;
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
  // 현재 방 ID
  roomId: string | null;
  setRoomId: (roomId: string) => void;
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

  // 서버 게임 시작 시간 (타이머 동기화용)
  serverStartTime: number | null;
  setServerStartTime: (time: number) => void;

  // 게임 시작 여부
  isGameStarted: boolean;
  setGameStarted: (started: boolean) => void;

  // 게임 준비 완료 여부 (Phaser 게임 인스턴스 생성 완료)
  gameReady: boolean;
  setGameReady: (ready: boolean) => void;

  // 사과 제거 이벤트 큐 (DROP_CELL_INDEX) - 로딩 중 도착한 이벤트도 누적
  dropCellEventQueue: DropCellEvent[];
  addDropCellEvent: (event: DropCellEvent) => void;
  clearDropCellEventQueue: () => void;

  // 타 플레이어 드래그 영역 (UPDATE_DRAG_AREA)
  otherPlayerDrags: Map<number, DragAreaData>;
  updateOtherPlayerDrag: (data: DragAreaData) => void;
  removeOtherPlayerDrag: (playerIndex: number) => void;

  // 게임 결과 (TIME_END)
  gameResults: PlayerData[] | null;
  setGameResults: (results: PlayerData[]) => void;

  // 게임 세션 ID (리플레이/재시작 시 증가하여 컴포넌트 재마운트 트리거)
  gameSessionId: number;
  incrementGameSession: () => void;

  // 게임 상태 초기화
  resetGameState: () => void;

  // 접속 에러 메시지 (게임 진행 중 접속 시도 등)
  connectionError: { message: string } | null;
  setConnectionError: (err: { message: string } | null) => void;

  // FlappyBird 상태
  flappyBirds: FlappyBirdData[];
  flappyPipes: FlappyPipeData[];
  flappyServerTick: number;
  flappyCameraX: number;
  flappyScore: number;
  isFlappyGameOver: boolean;
  flappyGameOverData: {
    reason: 'pipe_collision' | 'ground_collision';
    collidedPlayerIndex: number;
    finalScore: number;
  } | null;

  // FlappyBird 액션
  setFlappyWorldState: (
    birds: FlappyBirdData[],
    pipes: FlappyPipeData[],
    tick: number,
    cameraX: number,
  ) => void;
  setFlappyScore: (score: number) => void;
  setFlappyGameOver: (data: {
    reason: 'pipe_collision' | 'ground_collision';
    collidedPlayerIndex: number;
    finalScore: number;
    birds: FlappyBirdData[];
  }) => void;
  resetFlappyState: () => void;
}

export const useGameStore = create<GameState>()(
  // gemini chat: zustand의 subscrebeWithSelector 미들웨어를 사용하는 이유 (vs 기본 create 방식)
  // https://gemini.google.com/share/20ef8fcd6595
  subscribeWithSelector((set) => ({
    count: 0,
    myselfIndex: -1,
    roomId: null,
    players: [] as PlayerData[],
    selectedGameType: null,
    gameConfig: null,

    screen: 'landing',

    // 멀티플레이 상태 초기값
    appleField: null,
    gameTime: null,
    serverStartTime: null,
    isGameStarted: false,
    gameReady: false,
    dropCellEventQueue: [],
    otherPlayerDrags: new Map<number, DragAreaData>(),
    gameResults: null,
    gameSessionId: 0,
    connectionError: null,

    // 기존 액션
    setCount: (newCount: number) => set({ count: newCount }),
    setMyselfIndex: (index: number) => set({ myselfIndex: index }),
    setRoomId: (roomId: string) => set({ roomId }),
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
    setServerStartTime: (time: number) => set({ serverStartTime: time }),
    setGameStarted: (started: boolean) => set({ isGameStarted: started }),
    setGameReady: (ready: boolean) => set({ gameReady: ready }),
    addDropCellEvent: (event: DropCellEvent) =>
      set((state) => ({
        dropCellEventQueue: [...state.dropCellEventQueue, event],
      })),
    clearDropCellEventQueue: () => set({ dropCellEventQueue: [] }),
    updateOtherPlayerDrag: (data: DragAreaData) =>
      set((state) => {
        const newMap = new Map(state.otherPlayerDrags);
        newMap.set(data.playerIndex, data);
        return { otherPlayerDrags: newMap };
      }),
    removeOtherPlayerDrag: (playerIndex: number) =>
      set((state) => {
        const newMap = new Map(state.otherPlayerDrags);
        newMap.delete(playerIndex);
        return { otherPlayerDrags: newMap };
      }),
    setGameResults: (results: PlayerData[]) => set({ gameResults: results }),
    incrementGameSession: () =>
      set((state) => ({ gameSessionId: state.gameSessionId + 1 })),
    resetGameState: () =>
      set({
        appleField: null,
        gameTime: null,
        serverStartTime: null,
        isGameStarted: false,
        dropCellEventQueue: [],
        otherPlayerDrags: new Map<number, DragAreaData>(),
        gameResults: null,
      }),
    setConnectionError: (err) => set({ connectionError: err }),

    // FlappyBird 초기값
    flappyBirds: [],
    flappyPipes: [],
    flappyServerTick: 0,
    flappyCameraX: 0,
    flappyScore: 0,
    isFlappyGameOver: false,
    flappyGameOverData: null,

    // FlappyBird 액션
    setFlappyWorldState: (birds, pipes, tick, cameraX) =>
      set({
        flappyBirds: birds,
        flappyPipes: pipes,
        flappyServerTick: tick,
        flappyCameraX: cameraX,
      }),
    setFlappyScore: (score) => set({ flappyScore: score }),
    setFlappyGameOver: (data) =>
      set({
        isFlappyGameOver: true,
        flappyGameOverData: data,
        flappyScore: data.finalScore,
        flappyBirds: data.birds, // 게임 오버 시점의 새 위치 적용 (로딩 중인 플레이어용)
      }),
    resetFlappyState: () =>
      set({
        flappyBirds: [],
        flappyPipes: [],
        flappyServerTick: 0,
        flappyCameraX: 0,
        flappyScore: 0,
        isFlappyGameOver: false,
        flappyGameOverData: null,
      }),
  })),
);

// 현재 플레이어(자신)의 PlayerData를 정적으로 가져오는 헬퍼 함수
export const getMyPlayerData = (): PlayerData | null => {
  const { players, myselfIndex } = useGameStore.getState();
  if (myselfIndex < 0 || myselfIndex >= players.length) {
    return null;
  }
  return players[myselfIndex];
};

export const isPlayerHost = (): boolean => {
  const { myselfIndex } = useGameStore.getState();
  return myselfIndex === 0;
};
