# [Client] MineSweeperScene 서버 연동

## 📋 기본 정보

- **Labels**: `enhancement`, `client`, `game`
- **Priority**: High
- **Estimated Time**: 4-5 hours
- **Dependencies**: Issue #1, Issue #3

---

## 📝 설명

기존 Mock 기반의 MineSweeperScene을 실제 서버 통신 기반으로 수정합니다.
개발/테스트를 위해 Mock 모드도 유지합니다.

---

## ✅ 할 일

### 1. Mock/Server 모드 분기 구조

```typescript
class MineSweeperScene {
  private socket: Socket | MockSocket;
  private isMockMode: boolean;

  create() {
    this.isMockMode = isMockMode();

    if (this.isMockMode) {
      this.setupMockServer();
    } else {
      this.socket = getSocket();
      this.setupServerListeners();
    }
  }
}
```

### 2. 서버 이벤트 리스너 추가

```typescript
private setupServerListeners(): void {
  // 게임 초기화
  this.socket.on(MineSweeperPacketType.MS_GAME_INIT, (data) => {
    this.handleGameInit(data);
  });

  // 타일 업데이트
  this.socket.on(MineSweeperPacketType.MS_TILE_UPDATE, (data) => {
    this.handleTileUpdate(data);
  });

  // 점수 업데이트
  this.socket.on(MineSweeperPacketType.MS_SCORE_UPDATE, (data) => {
    this.handleScoreUpdate(data);
  });

  // 남은 지뢰 수 업데이트
  this.socket.on(MineSweeperPacketType.MS_REMAINING_MINES, (data) => {
    this.handleRemainingMinesUpdate(data);
  });

  // 게임 종료
  this.socket.on(MineSweeperPacketType.MS_GAME_END, (data) => {
    this.handleGameEnd(data);
  });
}
```

### 3. 이벤트 핸들러 구현

#### 3.1 게임 초기화 핸들러

```typescript
private handleGameInit(data: MSGameInitPacket): void {
  // 게임 설정 저장
  this.gameConfig = data.config;

  // 타일 그리드 생성
  this.tileManager.createGrid(data.config.gridCols, data.config.gridRows);

  // 초기 타일 상태 적용
  for (const row of data.tiles) {
    for (const tile of row) {
      this.tileManager.updateTile(tile.row, tile.col, tile);
    }
  }

  // 남은 지뢰 수 표시
  this.updateRemainingMinesUI(data.remainingMines);

  // 타이머 시작
  this.startTimer();
}
```

#### 3.2 타일 업데이트 핸들러

```typescript
private handleTileUpdate(data: MSTileUpdatePacket): void {
  if (data.isSequentialReveal) {
    // Flood Fill 순차 애니메이션
    this.playSequentialRevealAnimation(data.tiles);
  } else {
    // 즉시 업데이트
    for (const tile of data.tiles) {
      this.tileManager.updateTile(tile.row, tile.col, tile);
    }
  }

  // 남은 지뢰 수 업데이트
  this.updateRemainingMinesUI(data.remainingMines);
}
```

#### 3.3 순차 열기 애니메이션

```typescript
private playSequentialRevealAnimation(tiles: TileWithDistance[]): void {
  // 거리별로 그룹화
  const tilesByDistance = new Map<number, TileWithDistance[]>();
  for (const tile of tiles) {
    const distance = tile.distance ?? 0;
    if (!tilesByDistance.has(distance)) {
      tilesByDistance.set(distance, []);
    }
    tilesByDistance.get(distance)!.push(tile);
  }

  // 거리 순서대로 딜레이를 두고 열기
  const distances = Array.from(tilesByDistance.keys()).sort((a, b) => a - b);
  const DELAY_PER_DISTANCE = 30; // ms

  for (const distance of distances) {
    const tilesAtDistance = tilesByDistance.get(distance)!;

    this.time.delayedCall(distance * DELAY_PER_DISTANCE, () => {
      for (const tile of tilesAtDistance) {
        this.tileManager.revealTileWithAnimation(tile.row, tile.col, tile);
      }
    });
  }
}
```

### 4. 서버로 패킷 전송 메서드

```typescript
private sendRevealTile(row: number, col: number): void {
  if (this.isMockMode) {
    this.mockServerCore?.handleTileReveal(this.currentPlayerId, row, col);
  } else {
    this.socket.emit(MineSweeperPacketType.MS_REVEAL_TILE, { row, col });
  }
}

private sendToggleFlag(row: number, col: number): void {
  if (this.isMockMode) {
    this.mockServerCore?.handleFlagToggle(this.currentPlayerId, row, col);
  } else {
    this.socket.emit(MineSweeperPacketType.MS_TOGGLE_FLAG, { row, col });
  }
}
```

### 5. 기존 Mock 이벤트 핸들러 통합

현재 `setupSocketListeners()`의 Mock 이벤트 핸들러를 서버 이벤트와 통합:

- `game_init` → 서버: `MS_GAME_INIT`
- `tile_update` → 서버: `MS_TILE_UPDATE`
- `score_update` → 서버: `MS_SCORE_UPDATE`
- `game_end` → 서버: `MS_GAME_END`

### 6. 플레이어 ID 처리

```typescript
// 서버 모드에서는 소켓 ID가 플레이어 ID
private getMyPlayerId(): PlayerId {
  if (this.isMockMode) {
    return this.currentPlayerId;
  } else {
    return this.socket.id;
  }
}
```

---

## 📎 참고 파일

- `packages/client/src/game/scene/minesweeper/MineSweeperScene.ts` (829줄)
- `packages/client/src/game/physics/MineSweeperMockCore.ts`

---

## 📋 Acceptance Criteria

- [ ] Mock 모드와 서버 모드 모두 정상 동작
- [ ] 모든 플레이어의 타일 열기가 실시간 반영됨
- [ ] 모든 플레이어의 깃발 토글이 실시간 반영됨
- [ ] Flood Fill 애니메이션이 정상 동작 (파동 효과)
- [ ] 점수 UI가 실시간 업데이트됨
- [ ] 게임 종료 시 결과 화면이 올바르게 표시됨

---

## 🧪 테스트 포인트

1. 2명 플레이어가 동시 접속 시 서로의 행동이 보이는가?
2. 한 플레이어가 Flood Fill을 트리거하면 다른 플레이어도 애니메이션이 보이는가?
3. 지뢰를 밟았을 때 해당 플레이어의 점수가 감소하는가?
4. 다른 플레이어의 깃발이 올바른 색상으로 표시되는가?

---

## 🔗 관련 이슈

- **선행**: Issue #1, Issue #3
- **병렬**: Issue #5 (클라이언트 핸들러)
