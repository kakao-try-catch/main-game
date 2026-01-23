import { create } from 'zustand';
import type {
  PlayerData,
  GameConfig,
  GameType,
} from '../../../common/src/packets';

// 1. 상태 인터페이스 정의
interface GameState {
  count: number;
  setCount: (newCount: number) => void;
  // players from server (room snapshot)
  players: PlayerData[];
  setPlayers: (players: PlayerData[]) => void;
  // selected game type and config pushed from server
  selectedGameType?: GameType | null;
  gameConfig?: GameConfig | null;
  setGameConfig: (selected: GameType | null, cfg: GameConfig | null) => void;
  // ... 다른 상태들
}

export const useGameStore = create<GameState>((set) => ({
  count: 0, // SocketCounter가 볼 숫자
  // players default
  players: [] as PlayerData[],
  selectedGameType: null,
  gameConfig: null,

  // ... 기존 상태들

  // 액션
  setCount: (newCount: number) => set({ count: newCount }),
  setPlayers: (players: PlayerData[]) => set({ players }),
  setGameConfig: (selected: GameType | null, cfg: GameConfig | null) =>
    set({ selectedGameType: selected, gameConfig: cfg }),
  // ... 기존 액션들
}));
