import { create } from "zustand";

// 1. 상태 인터페이스 정의
interface GameState {
  count: number;
  setCount: (newCount: number) => void;
  // ... 다른 상태들
}

export const useGameStore = create<GameState>((set) => ({
  count: 0, // SocketCounter가 볼 숫자
  // ... 기존 상태들

  // 액션
  setCount: (newCount: number) => set({ count: newCount }),
  // ... 기존 액션들
}));
