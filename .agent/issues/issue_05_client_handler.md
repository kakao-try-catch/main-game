# [Client] 클라이언트 패킷 핸들러 확장

## 📋 기본 정보

- **Labels**: `enhancement`, `client`, `network`
- **Priority**: Medium
- **Estimated Time**: 2-3 hours
- **Dependencies**: Issue #1

---

## 📝 설명

지뢰찾기 패킷을 처리하도록 클라이언트 핸들러를 확장합니다.
`clientHandler.ts`에 지뢰찾기 전용 패킷 핸들링 로직을 추가합니다.

---

## ✅ 할 일

### 1. Import 추가

```typescript
// packages/client/src/network/clientHandler.ts

import {
  SystemPacketType,
  GamePacketType,
  MineSweeperPacketType, // 추가
  type ServerPacket,
} from '../../../common/src/packets.ts';
```

### 2. 패킷 핸들러 확장

```typescript
export const handleServerPacket = (packet: ServerPacket) => {
  switch (packet.type) {
    // --- 기존 System Logic ---
    case SystemPacketType.UPDATE_NUMBER:
    // ...

    // --- 기존 Game Logic (Apple Game) ---
    case GamePacketType.SET_FIELD:
    // ...

    // --- 신규 Minesweeper Logic ---
    case MineSweeperPacketType.MS_GAME_INIT:
      console.log('MS_GAME_INIT received:', packet);
      handleMSGameInit(packet);
      break;

    case MineSweeperPacketType.MS_TILE_UPDATE:
      console.log('MS_TILE_UPDATE received:', packet);
      handleMSTileUpdate(packet);
      break;

    case MineSweeperPacketType.MS_SCORE_UPDATE:
      console.log('MS_SCORE_UPDATE received:', packet);
      handleMSScoreUpdate(packet);
      break;

    case MineSweeperPacketType.MS_REMAINING_MINES:
      console.log('MS_REMAINING_MINES received:', packet);
      handleMSRemainingMines(packet);
      break;

    case MineSweeperPacketType.MS_GAME_END:
      console.log('MS_GAME_END received:', packet);
      handleMSGameEnd(packet);
      break;

    default:
      console.warn('Unprocessed packet type:', packet);
  }
};
```

### 3. 지뢰찾기 핸들러 함수 구현

```typescript
function handleMSGameInit(packet: MSGameInitPacket): void {
  // 게임 씬으로 이벤트 전달
  const event = new CustomEvent('ms:game_init', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSTileUpdate(packet: MSTileUpdatePacket): void {
  const event = new CustomEvent('ms:tile_update', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSScoreUpdate(packet: MSScoreUpdatePacket): void {
  const event = new CustomEvent('ms:score_update', { detail: packet });
  window.dispatchEvent(event);

  // Zustand store 업데이트 (필요 시)
  // useGameStore.getState().updateMineSweeperScore(packet.playerId, packet.newScore);
}

function handleMSRemainingMines(packet: MSRemainingMinesPacket): void {
  const event = new CustomEvent('ms:remaining_mines', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSGameEnd(packet: MSGameEndPacket): void {
  const event = new CustomEvent('ms:game_end', { detail: packet });
  window.dispatchEvent(event);
}
```

### 4. Zustand Store 연동 (선택적)

store에 지뢰찾기 관련 상태가 필요하다면:

```typescript
// packages/client/src/store/gameStore.ts

interface MineSweeperState {
  remainingMines: number;
  playerScores: Map<string, number>;
  isGameActive: boolean;
}

// Actions
setRemainingMines: (count: number) => void;
updateMSPlayerScore: (playerId: string, score: number) => void;
setMSGameActive: (active: boolean) => void;
```

---

## 📎 참고 파일

- `packages/client/src/network/clientHandler.ts`
- `packages/client/src/store/gameStore.ts`

---

## 📋 Acceptance Criteria

- [ ] 모든 지뢰찾기 패킷 타입이 switch 문에 추가됨
- [ ] 각 패킷 수신 시 콘솔에 로그 출력
- [ ] CustomEvent로 게임 씬에 이벤트 전달
- [ ] 빌드 에러 없음

---

## 🧪 테스트 포인트

1. 서버에서 `MS_GAME_INIT` 수신 시 콘솔 로그가 출력되는가?
2. `MS_TILE_UPDATE` 수신 시 게임 씬이 이벤트를 받는가?
3. 알 수 없는 패킷 타입에 대해 warning이 출력되는가?

---

## 🔗 관련 이슈

- **선행**: Issue #1
- **병렬**: Issue #4 (클라이언트 씬)
