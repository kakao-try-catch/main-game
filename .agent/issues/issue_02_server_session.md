# [Server] MineSweeperSession 구현

## 📋 기본 정보

- **Labels**: `enhancement`, `server`, `core`
- **Priority**: High
- **Estimated Time**: 4-6 hours
- **Dependencies**: Issue #1

---

## 📝 설명

서버에서 지뢰찾기 게임의 상태를 관리하는 세션 클래스를 구현합니다.
기존 `MineSweeperMockCore.ts`의 로직을 서버용으로 이전합니다.

### 핵심 목표

- **게임 상태 권한을 서버로 이전**: 치팅 방지
- **지뢰 정보 보호**: 클라이언트에 REVEALED 전까지 지뢰 정보 숨김
- **실시간 동기화**: 모든 플레이어에게 상태 변경 브로드캐스트

---

## ✅ 할 일

### 1. 폴더 구조 생성

```
packages/server/src/minesweeper/
├── MineSweeperSession.ts
└── minesweeperHandler.ts (Issue #3에서 구현)
```

### 2. `MineSweeperSession.ts` 구현

#### 2.1 기본 구조

```typescript
export class MineSweeperSession {
  public roomId: string;
  public status: 'waiting' | 'playing' | 'ended';

  private config: MineSweeperConfig;
  private tiles: ServerTileData[][];
  private players: Map<string, PlayerState>;
  private remainingMines: number;
  private timerInterval: NodeJS.Timeout | null;

  constructor(
    roomId: string,
    private broadcastCallback: (packet: any) => void,
  ) {}
}
```

#### 2.2 구현할 메서드

- [ ] **초기화 메서드**
  - `startGame()`: 게임 시작, 필드 생성, 브로드캐스트
  - `initializeTiles()`: 빈 타일 그리드 생성
  - `placeMines()`: 랜덤 지뢰 배치
  - `calculateAdjacentMines()`: 인접 지뢰 수 계산

- [ ] **게임 로직 메서드**
  - `handleRevealTile(playerId, row, col)`: 타일 열기 처리
  - `revealTileWithFloodFill(row, col, playerId)`: Flood Fill 구현
  - `handleToggleFlag(playerId, row, col)`: 깃발 토글 처리

- [ ] **점수 및 상태 관리**
  - `updatePlayerScore(playerId, scoreChange)`: 점수 업데이트
  - `checkWinCondition()`: 승리 조건 확인
  - `calculateFinalScores()`: 최종 정산 (깃발 기반)

- [ ] **세션 관리**
  - `stopGame()`: 게임 종료
  - `addPlayer(id, name)`: 플레이어 추가
  - `removePlayer(id)`: 플레이어 제거
  - `getPlayers()`: 플레이어 목록 반환

- [ ] **유틸리티**
  - `toClientTile(tile)`: ServerTileData → ClientTileData 변환
  - `getClientTiles()`: 클라이언트 전송용 타일 배열 생성

### 3. 기존 MockCore 로직 이전

`MineSweeperMockCore.ts`에서 이전할 로직:

- Flood Fill 알고리즘 (BFS 기반)
- 점수 계산 로직 (타일당 점수, 지뢰 페널티, 최대 점수 제한)
- 깃발 토글 및 남은 지뢰 수 관리
- 승리 조건 확인 및 최종 정산

### 4. 검증 로직 추가

```typescript
// 이미 열린 타일 → 무시
if (tile.state === TileState.REVEALED) return;

// 다른 플레이어의 깃발 → 제거 불가
if (tile.flaggedBy !== playerId) return;

// 게임 진행 중 아님 → 무시
if (this.status !== 'playing') return;
```

---

## 📎 참고 파일

- `packages/client/src/game/physics/MineSweeperMockCore.ts` - 이전 대상 (727줄)
- `packages/server/src/applegame/gameSession.ts` - 패턴 참고

---

## 📋 Acceptance Criteria

- [ ] `MineSweeperSession` 클래스가 생성되고 인스턴스화 가능
- [ ] 모든 게임 로직이 서버에서 동작 (클라이언트 로직 제거 가능)
- [ ] 클라이언트에 지뢰 정보가 노출되지 않음
- [ ] Race condition 방지 구현 (같은 타일 동시 열기)
- [ ] 기존 MockCore와 동일한 게임 플레이 결과

---

## 🧪 테스트 포인트

1. 게임 시작 시 타일 그리드가 올바르게 생성되는가?
2. 지뢰가 랜덤하게 배치되는가?
3. Flood Fill이 올바르게 동작하는가?
4. 점수가 정확하게 계산되는가?
5. 같은 타일을 두 플레이어가 동시에 열면 먼저 온 요청만 처리되는가?

---

## 🔗 관련 이슈

- **선행**: Issue #1 (패킷 타입 정의)
- **후속**: Issue #3 (패킷 핸들러)
