# [Common] 지뢰찾기 멀티플레이어 패킷 타입 정의

## 📋 기본 정보

- **Labels**: `enhancement`, `common`, `protocol`
- **Priority**: High
- **Estimated Time**: 2-3 hours
- **Dependencies**: 없음

---

## 📝 설명

지뢰찾기 멀티플레이어에 필요한 패킷 타입과 인터페이스를 정의합니다. 이 이슈는 서버와 클라이언트 간의 통신 규약을 정의하는 기초 작업입니다.

### 배경

현재 지뢰찾기는 `MineSweeperMockCore.ts`에서 로컬로 모든 게임 로직을 처리하고 있습니다.
멀티플레이어 지원을 위해 서버-클라이언트 간 표준화된 패킷 타입이 필요합니다.

---

## ✅ 할 일

### 1. `packages/common/src/packets.ts` 수정

```typescript
// MineSweeperPacketType enum 추가
export enum MineSweeperPacketType {
  // 클라이언트 → 서버
  MS_REVEAL_TILE = 'MS_REVEAL_TILE',
  MS_TOGGLE_FLAG = 'MS_TOGGLE_FLAG',

  // 서버 → 클라이언트
  MS_GAME_INIT = 'MS_GAME_INIT',
  MS_TILE_UPDATE = 'MS_TILE_UPDATE',
  MS_SCORE_UPDATE = 'MS_SCORE_UPDATE',
  MS_REMAINING_MINES = 'MS_REMAINING_MINES',
  MS_GAME_END = 'MS_GAME_END',
}
```

### 2. `packages/common/src/minesweeperPackets.ts` 신규 생성

- [ ] **클라이언트 → 서버 패킷**
  - `MSRevealTilePacket`: 타일 열기 요청
  - `MSToggleFlagPacket`: 깃발 토글 요청

- [ ] **서버 → 클라이언트 패킷**
  - `MSGameInitPacket`: 게임 초기화 (필드, 설정 전송)
  - `MSTileUpdatePacket`: 타일 상태 변경 브로드캐스트
  - `MSScoreUpdatePacket`: 점수 변경 알림
  - `MSRemainingMinesPacket`: 남은 지뢰 수 업데이트
  - `MSGameEndPacket`: 게임 종료 결과

### 3. `MineSweeperGameConfig` 타입 정의

```typescript
export interface MineSweeperGameConfig {
  mapSize: MapSizePreset;
  manualCols?: number;
  manualRows?: number;
  difficulty: DifficultyPreset;
  manualMineRatio?: number;
  timeLimit: TimeLimit;
  manualTime?: number;
}
```

### 4. 기존 타입 통합

- `packages/client/src/game/types/minesweeper.types.ts`의 공통 타입을 `common` 패키지로 이동
- 중복 타입 제거 및 정리

---

## 📎 참고 파일

- `packages/common/src/packets.ts` - 기존 패킷 타입 정의
- `packages/client/src/game/types/minesweeper.types.ts` - 현재 지뢰찾기 타입

---

## 📋 Acceptance Criteria

- [ ] `MineSweeperPacketType` enum이 `packets.ts`에 추가됨
- [ ] 모든 패킷 인터페이스가 TypeScript로 정의됨
- [ ] 클라이언트와 서버 모두에서 import 가능
- [ ] 기존 코드와 충돌 없음 (빌드 성공)
- [ ] 타입 정의에 주석으로 용도 설명 포함

---

## 🔗 관련 이슈

- 이 이슈를 기반으로 #2, #3, #4, #5가 진행됩니다.
