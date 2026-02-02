# [Server] 지뢰찾기 패킷 핸들러 구현

## 📋 기본 정보

- **Labels**: `enhancement`, `server`, `network`
- **Priority**: High
- **Estimated Time**: 3-4 hours
- **Dependencies**: Issue #1, Issue #2

---

## 📝 설명

클라이언트로부터 받은 지뢰찾기 패킷을 처리하고, 적절한 응답을 브로드캐스트하는 핸들러를 구현합니다.

---

## ✅ 할 일

### 1. `minesweeperHandler.ts` 구현

```typescript
// packages/server/src/minesweeper/minesweeperHandler.ts

import { Server, Socket } from 'socket.io';
import { MineSweeperPacketType } from '../../../common/src/packets';
import { MineSweeperSession } from './MineSweeperSession';

// 세션 맵
const mineSweeperSessions = new Map<string, MineSweeperSession>();

export function handleMineSweeperPacket(
  io: Server,
  socket: Socket,
  packet: any,
  roomId: string,
) {
  const session = mineSweeperSessions.get(roomId);
  if (!session) return;

  switch (packet.type) {
    case MineSweeperPacketType.MS_REVEAL_TILE:
      session.handleRevealTile(socket.id, packet.row, packet.col);
      break;

    case MineSweeperPacketType.MS_TOGGLE_FLAG:
      session.handleToggleFlag(socket.id, packet.row, packet.col);
      break;
  }
}
```

### 2. `packages/server/src/index.ts` 수정

```typescript
socket.onAny((eventName, data) => {
  const packet = { type: eventName, ...data };

  // 지뢰찾기 패킷 라우팅
  if (eventName.startsWith('MS_')) {
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      handleMineSweeperPacket(io, socket, packet, roomId);
    }
    return;
  }

  // 기존 로직
  handleClientPacket(io, socket, packet);
});
```

### 3. `serverHandler.ts` 수정 - 게임 시작 분기

```typescript
case SystemPacketType.GAME_START_REQ: {
  const player = session.players.get(socket.id);
  if (player && player.order === 0) {
    if (session.selectedGameType === GameType.MINESWEEPER) {
      // 지뢰찾기 세션 시작
      startMineSweeperGame(io, roomId, session);
    } else {
      session.startGame();
    }
  }
  break;
}
```

### 4. 지뢰찾기 게임 시작 함수

```typescript
function startMineSweeperGame(
  io: Server,
  roomId: string,
  baseSession: GameSession,
) {
  // MineSweeperSession 생성
  const msSession = new MineSweeperSession(roomId, (packet) => {
    const { type, ...payload } = packet;
    io.to(roomId).emit(type, payload);
  });

  // 플레이어 복사
  for (const [id, player] of baseSession.players) {
    msSession.addPlayer(id, player.name);
  }

  // 게임 설정 적용 (로비에서 선택한 설정)
  const config = baseSession.gameConfigs.get(GameType.MINESWEEPER);
  if (config) {
    msSession.setConfig(config);
  }

  // 세션 저장 및 시작
  mineSweeperSessions.set(roomId, msSession);
  msSession.startGame();
}
```

### 5. 연결 해제 처리

```typescript
export function handleDisconnect(socketId: string) {
  const roomId = playerRooms.get(socketId);
  if (roomId) {
    // 지뢰찾기 세션 정리
    const msSession = mineSweeperSessions.get(roomId);
    if (msSession) {
      msSession.removePlayer(socketId);
      if (msSession.getPlayerCount() === 0) {
        mineSweeperSessions.delete(roomId);
      }
    }

    // 기존 로직...
  }
}
```

---

## 📎 참고 파일

- `packages/server/src/applegame/serverHandler.ts`
- `packages/server/src/index.ts`

---

## 📋 Acceptance Criteria

- [ ] `MS_REVEAL_TILE` 패킷이 서버에서 처리됨
- [ ] `MS_TOGGLE_FLAG` 패킷이 서버에서 처리됨
- [ ] 처리 결과가 룸 내 모든 클라이언트에 브로드캐스트됨
- [ ] 게임 타입에 따라 올바른 세션이 생성됨
- [ ] 에러 상황에서도 서버가 크래시하지 않음

---

## 🧪 테스트 포인트

1. 지뢰찾기 게임 시작 요청 시 `MS_GAME_INIT`이 전송되는가?
2. 타일 열기 요청 시 모든 플레이어에게 `MS_TILE_UPDATE`가 전송되는가?
3. 잘못된 패킷이 오면 에러 처리가 되는가?
4. 플레이어 연결 해제 시 세션이 올바르게 정리되는가?

---

## 🔗 관련 이슈

- **선행**: Issue #1, Issue #2
- **후속**: Issue #4 (클라이언트 연동)
