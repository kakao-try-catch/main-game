# 🎮 지뢰찾기 멀티플레이어 프로토콜 및 구현 계획

> 작성일: 2026-02-02
> 프로젝트: main-game
> 대상: Minesweeper Multiplayer Implementation

---

## 📋 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [멀티플레이어 프로토콜 설계](#2-멀티플레이어-프로토콜-설계)
3. [구현 계획](#3-구현-계획)
4. [GitHub 이슈 목록](#4-github-이슈-목록)

---

## 1. 현재 상태 분석

### 1.1 기존 구현 현황

#### ✅ 이미 구현된 것

- **클라이언트 게임 씬**: `MineSweeperScene.ts` (829줄)
- **Mock 서버 코어**: `MineSweeperMockCore.ts` (727줄) - 싱글플레이 로직 완성
- **타입 정의**: `minesweeper.types.ts`, `minesweeperPresets.ts`
- **결과 화면**: `MineSweeperResult.tsx`
- **게임 타입 정의**: `GameType.MINESWEEPER` (packets.ts)
- **ReportCard 타입**: `MineSweeperReportCard` (score, flags)

#### ❌ 미구현된 것

- **서버 세션 로직**: 지뢰찾기용 GameSession 또는 별도 핸들러
- **서버-클라이언트 패킷**: 지뢰찾기 전용 게임 패킷
- **서버 패킷 핸들러**: 지뢰찾기 패킷 처리 로직
- **게임 설정 UI 연동**: 로비에서 지뢰찾기 프리셋 선택

### 1.2 기존 아키텍처 패턴 (사과 게임 기준)

```
[클라이언트]                    [서버]
    │                              │
    ├─ JOIN_ROOM ─────────────────►│
    │◄──────────────── ROOM_UPDATE─┤
    │                              │
    ├─ GAME_START_REQ ────────────►│ (방장만)
    │◄─────────────────── SET_FIELD─┤
    │◄──────────────────── SET_TIME─┤
    │◄──────────── GAME_CONFIG_UPDATE─┤
    │                              │
    ├─ DRAWING_DRAG_AREA (게임 중)►│
    │◄────────────── UPDATE_DRAG_AREA─┤
    │                              │
    ├─ CONFIRM_DRAG_AREA ─────────►│ (10 합 요청)
    │◄─────────────── DROP_CELL_INDEX─┤ (성공 시)
    │                              │
    │◄──────────────────── TIME_END─┤ (타임아웃)
```

---

## 2. 멀티플레이어 프로토콜 설계

### 2.1 신규 패킷 타입 (MineSweeperPacketType)

```typescript
export enum MineSweeperPacketType {
  // 클라이언트 → 서버
  MS_REVEAL_TILE = 'MS_REVEAL_TILE', // 타일 열기 요청
  MS_TOGGLE_FLAG = 'MS_TOGGLE_FLAG', // 깃발 토글 요청

  // 서버 → 클라이언트
  MS_GAME_INIT = 'MS_GAME_INIT', // 게임 초기화 (필드 전송)
  MS_TILE_UPDATE = 'MS_TILE_UPDATE', // 타일 상태 업데이트
  MS_SCORE_UPDATE = 'MS_SCORE_UPDATE', // 점수 업데이트
  MS_REMAINING_MINES = 'MS_REMAINING_MINES', // 남은 지뢰 수 업데이트
  MS_GAME_END = 'MS_GAME_END', // 게임 종료
}
```

### 2.2 패킷 인터페이스 상세

#### 2.2.1 클라이언트 → 서버 패킷

```typescript
// 타일 열기 요청 (좌클릭)
export interface MSRevealTilePacket {
  type: MineSweeperPacketType.MS_REVEAL_TILE;
  row: number;
  col: number;
}

// 깃발 토글 요청 (우클릭)
export interface MSToggleFlagPacket {
  type: MineSweeperPacketType.MS_TOGGLE_FLAG;
  row: number;
  col: number;
}
```

#### 2.2.2 서버 → 클라이언트 패킷

```typescript
// 게임 초기화 (게임 시작 시 전체 맵 전송)
export interface MSGameInitPacket {
  type: MineSweeperPacketType.MS_GAME_INIT;
  config: MineSweeperConfig;
  tiles: ClientTileData[][]; // 지뢰 정보 숨김
  remainingMines: number;
  timestamp: number;
}

// 타일 상태 업데이트 (열기/깃발 결과)
export interface MSTileUpdatePacket {
  type: MineSweeperPacketType.MS_TILE_UPDATE;
  tiles: {
    row: number;
    col: number;
    state: TileState;
    isMine?: boolean; // REVEALED 상태에서만 전송
    adjacentMines?: number; // REVEALED 상태에서만 전송
    revealedBy?: PlayerId;
    flaggedBy?: PlayerId;
    distance?: number; // Flood Fill 애니메이션용
  }[];
  remainingMines: number;
  isSequentialReveal?: boolean; // 순차 애니메이션 플래그
  timestamp: number;
}

// 점수 업데이트
export interface MSScoreUpdatePacket {
  type: MineSweeperPacketType.MS_SCORE_UPDATE;
  playerId: PlayerId;
  scoreChange: number;
  newScore: number;
  position: { row: number; col: number } | null;
  reason: 'safe_tile' | 'flood_fill' | 'mine_hit' | 'final_settlement';
  timestamp: number;
}

// 남은 지뢰 수 업데이트
export interface MSRemainingMinesPacket {
  type: MineSweeperPacketType.MS_REMAINING_MINES;
  remainingMines: number;
  timestamp: number;
}

// 게임 종료
export interface MSGameEndPacket {
  type: MineSweeperPacketType.MS_GAME_END;
  reason: 'win' | 'timeout' | 'all_mines_hit';
  results: {
    rank: number;
    playerId: PlayerId;
    score: number;
    tilesRevealed: number;
    minesHit: number;
    correctFlags: number;
    totalFlags: number;
  }[];
  timestamp: number;
}
```

### 2.3 게임 설정 확장

```typescript
// 기존 GameConfig 타입을 Union으로 확장
export interface MineSweeperGameConfig {
  mapSize: MapSizePreset; // 'small' | 'medium' | 'large' | 'manual'
  manualCols?: number;
  manualRows?: number;
  difficulty: DifficultyPreset; // 'easy' | 'normal' | 'hard'
  manualMineRatio?: number;
  timeLimit: TimeLimit; // 120 | 180 | 240 | 'manual'
  manualTime?: number;
}

export type GameConfig = AppleGameConfig | MineSweeperGameConfig;
```

### 2.4 통신 흐름도

```
[클라이언트]                               [서버]
    │                                         │
    ├─ JOIN_ROOM ────────────────────────────►│
    │◄═══════════════════════════ ROOM_UPDATE═┤
    │                                         │
    │  (로비에서 게임/설정 선택)                   │
    ├─ GAME_CONFIG_UPDATE_REQ ───────────────►│
    │◄════════════════════ GAME_CONFIG_UPDATE═┤
    │                                         │
    │  (방장이 게임 시작)                        │
    ├─ GAME_START_REQ ───────────────────────►│
    │◄═════════════════════════ MS_GAME_INIT═┤ (필드 + 초기 상태)
    │◄══════════════════════════════ SET_TIME═┤ (제한 시간)
    │                                         │
    │  ===== 게임 진행 중 =====                  │
    │                                         │
    ├─ MS_REVEAL_TILE (좌클릭) ──────────────►│
    │◄════════════════════════ MS_TILE_UPDATE═┤ (Flood Fill 결과)
    │◄═══════════════════════ MS_SCORE_UPDATE═┤ (점수 변경)
    │                                         │
    ├─ MS_TOGGLE_FLAG (우클릭) ──────────────►│
    │◄════════════════════════ MS_TILE_UPDATE═┤ (깃발 상태)
    │◄═══════════════════ MS_REMAINING_MINES═┤ (남은 지뢰 수)
    │                                         │
    │  ===== 게임 종료 =====                    │
    │                                         │
    │◄══════════════════════════ MS_GAME_END═┤ (승리/시간초과)
```

### 2.5 치팅 방지 전략

1. **지뢰 정보 보호**
   - 서버에서만 `ServerTileData`(지뢰 정보 포함) 관리
   - 클라이언트에는 `ClientTileData`만 전송 (REVEALED 전까지 지뢰 정보 숨김)

2. **Race Condition 방지**
   - 서버에서 타일 상태를 원자적으로 처리
   - 이미 열린 타일/깃발 요청 무시

3. **요청 검증**
   - 좌표 범위 검증
   - 플레이어 ID 검증
   - 게임 상태(playing/ended) 검증

---

## 3. 구현 계획

### 3.1 단계별 구현 순서

#### Phase 1: 공통 타입 및 패킷 정의 (Day 1)

1. `packages/common/src/packets.ts`에 지뢰찾기 패킷 타입 추가
2. `packages/common/src/minesweeperPackets.ts` 신규 생성 (인터페이스 정의)
3. 기존 `minesweeper.types.ts`와 통합/정리

#### Phase 2: 서버 구현 (Day 2-3)

1. `packages/server/src/minesweeper/MineSweeperSession.ts` 생성
   - `MineSweeperMockCore.ts` 로직 이전
   - 세션 관리 로직 추가
2. `packages/server/src/minesweeper/minesweeperHandler.ts` 생성
   - 패킷 핸들링 로직
3. `packages/server/src/index.ts` 수정
   - 지뢰찾기 패킷 라우팅 추가

#### Phase 3: 클라이언트 연동 (Day 4-5)

1. `MineSweeperScene.ts` 수정
   - Mock 소켓 대신 실제 소켓 사용
   - 서버 패킷 기반 상태 업데이트
2. `clientHandler.ts` 수정
   - 지뢰찾기 패킷 핸들링 추가

#### Phase 4: 로비 UI 연동 (Day 6)

1. `Lobby.tsx` 수정
   - 지뢰찾기 게임 선택 UI
   - 프리셋 설정 UI (맵 크기, 난이도, 시간)
2. 게임 설정 동기화 검증

#### Phase 5: 테스트 및 디버깅 (Day 7)

1. 멀티플레이어 동기화 테스트
2. Race condition 테스트
3. 재접속 시나리오 테스트

### 3.2 파일 변경 목록

| 파일                                                    | 변경 유형 | 설명                       |
| ------------------------------------------------------- | --------- | -------------------------- |
| `common/src/packets.ts`                                 | 수정      | MineSweeperPacketType 추가 |
| `common/src/minesweeperPackets.ts`                      | 신규      | 지뢰찾기 패킷 인터페이스   |
| `server/src/minesweeper/`                               | 신규 폴더 | 서버 지뢰찾기 모듈         |
| `server/src/minesweeper/MineSweeperSession.ts`          | 신규      | 세션 관리                  |
| `server/src/minesweeper/minesweeperHandler.ts`          | 신규      | 패킷 핸들러                |
| `server/src/index.ts`                                   | 수정      | 라우팅 추가                |
| `client/src/network/clientHandler.ts`                   | 수정      | 패킷 핸들링 추가           |
| `client/src/game/scene/minesweeper/MineSweeperScene.ts` | 수정      | 실제 소켓 연동             |
| `client/src/components/Lobby.tsx`                       | 수정      | 지뢰찾기 설정 UI           |

---

## 4. GitHub 이슈 목록

### 개요

총 **7개의 서브 이슈**로 구성되며, 각 이슈는 독립적으로 작업 가능하면서도 순차적 의존성을 고려합니다.

---

### 📌 Issue #1: [Common] 지뢰찾기 멀티플레이어 패킷 타입 정의

**Labels**: `enhancement`, `common`, `protocol`
**Priority**: High
**Estimated Time**: 2-3 hours

#### 📝 설명

지뢰찾기 멀티플레이어에 필요한 패킷 타입과 인터페이스를 정의합니다.

#### ✅ 할 일

- [ ] `packages/common/src/packets.ts`에 `MineSweeperPacketType` enum 추가
- [ ] `packages/common/src/minesweeperPackets.ts` 신규 파일 생성
  - [ ] 클라이언트→서버 패킷: `MSRevealTilePacket`, `MSToggleFlagPacket`
  - [ ] 서버→클라이언트 패킷: `MSGameInitPacket`, `MSTileUpdatePacket`, `MSScoreUpdatePacket`, `MSRemainingMinesPacket`, `MSGameEndPacket`
- [ ] `MineSweeperGameConfig` 타입 정의
- [ ] 기존 `minesweeper.types.ts`의 타입과 통합 정리

#### 📎 참고 파일

- `packages/common/src/packets.ts`
- `packages/client/src/game/types/minesweeper.types.ts`

#### 📋 Acceptance Criteria

- 모든 패킷 타입이 TypeScript로 정의됨
- 클라이언트/서버 모두에서 import 가능
- 기존 코드와 충돌 없음

---

### 📌 Issue #2: [Server] MineSweeperSession 구현

**Labels**: `enhancement`, `server`, `core`
**Priority**: High
**Estimated Time**: 4-6 hours
**Dependencies**: Issue #1

#### 📝 설명

서버에서 지뢰찾기 게임의 상태를 관리하는 세션 클래스를 구현합니다. 기존 `MineSweeperMockCore.ts`의 로직을 서버용으로 이전합니다.

#### ✅ 할 일

- [ ] `packages/server/src/minesweeper/` 폴더 생성
- [ ] `MineSweeperSession.ts` 구현
  - [ ] 게임 설정 관리 (gridCols, gridRows, mineCount, totalTime)
  - [ ] 타일 상태 관리 (ServerTileData 2D 배열)
  - [ ] 지뢰 배치 로직 (`placeMines`)
  - [ ] 인접 지뢰 계산 (`calculateAdjacentMines`)
  - [ ] 타일 열기 처리 (`revealTile` + Flood Fill)
  - [ ] 깃발 토글 처리 (`toggleFlag`)
  - [ ] 점수 계산 로직
  - [ ] 승리 조건 확인 (`checkWinCondition`)
  - [ ] 최종 정산 로직 (`calculateFinalScores`)
- [ ] 세션 시작/종료/재시작 메서드
- [ ] 브로드캐스트 콜백 연동

#### 📎 참고 파일

- `packages/client/src/game/physics/MineSweeperMockCore.ts` (이전 대상)
- `packages/server/src/applegame/gameSession.ts` (패턴 참고)

#### 📋 Acceptance Criteria

- 모든 게임 로직이 서버에서 동작
- 클라이언트에 지뢰 정보 노출 불가
- Race condition 방지 구현

---

### 📌 Issue #3: [Server] 지뢰찾기 패킷 핸들러 구현

**Labels**: `enhancement`, `server`, `network`
**Priority**: High
**Estimated Time**: 3-4 hours
**Dependencies**: Issue #1, Issue #2

#### 📝 설명

클라이언트로부터 받은 지뢰찾기 패킷을 처리하고, 적절한 응답을 브로드캐스트하는 핸들러를 구현합니다.

#### ✅ 할 일

- [ ] `packages/server/src/minesweeper/minesweeperHandler.ts` 구현
  - [ ] `handleMineSweeperPacket(io, socket, packet)` 메인 핸들러
  - [ ] `MS_REVEAL_TILE` 패킷 처리
  - [ ] `MS_TOGGLE_FLAG` 패킷 처리
- [ ] `packages/server/src/index.ts` 수정
  - [ ] 지뢰찾기 패킷 라우팅 분기 추가
- [ ] `packages/server/src/applegame/serverHandler.ts` 수정
  - [ ] `GAME_START_REQ` 처리 시 `selectedGameType` 분기 추가
  - [ ] 지뢰찾기 게임 시작 시 `MS_GAME_INIT` 전송
- [ ] 세션 맵에 지뢰찾기 세션 저장/조회 로직

#### 📎 참고 파일

- `packages/server/src/applegame/serverHandler.ts`
- `packages/server/src/index.ts`

#### 📋 Acceptance Criteria

- 모든 지뢰찾기 패킷이 서버에서 처리됨
- 패킷 처리 결과가 룸 내 모든 클라이언트에 브로드캐스트됨
- 에러 상황에서도 서버가 크래시하지 않음

---

### 📌 Issue #4: [Client] MineSweeperScene 서버 연동

**Labels**: `enhancement`, `client`, `game`
**Priority**: High
**Estimated Time**: 4-5 hours
**Dependencies**: Issue #1, Issue #3

#### 📝 설명

기존 Mock 기반의 MineSweeperScene을 실제 서버 통신 기반으로 수정합니다.

#### ✅ 할 일

- [ ] `MineSweeperScene.ts` 수정
  - [ ] Mock 모드 분기 유지 (개발/테스트용)
  - [ ] 실제 소켓 이벤트 리스너 추가
    - [ ] `MS_GAME_INIT` 수신 처리
    - [ ] `MS_TILE_UPDATE` 수신 처리
    - [ ] `MS_SCORE_UPDATE` 수신 처리
    - [ ] `MS_REMAINING_MINES` 수신 처리
    - [ ] `MS_GAME_END` 수신 처리
  - [ ] 서버로 패킷 전송 메서드
    - [ ] `sendRevealTile(row, col)`
    - [ ] `sendToggleFlag(row, col)`
- [ ] 타일 애니메이션 로직 유지 (distance 기반 순차 열기)
- [ ] 점수 UI 업데이트 연동

#### 📎 참고 파일

- `packages/client/src/game/scene/minesweeper/MineSweeperScene.ts`
- `packages/client/src/game/physics/MineSweeperMockCore.ts`

#### 📋 Acceptance Criteria

- Mock 모드와 서버 모드 모두 동작
- 모든 플레이어의 타일 열기/깃발이 실시간 반영됨
- Flood Fill 애니메이션이 정상 동작

---

### 📌 Issue #5: [Client] 클라이언트 패킷 핸들러 확장

**Labels**: `enhancement`, `client`, `network`
**Priority**: Medium
**Estimated Time**: 2-3 hours
**Dependencies**: Issue #1

#### 📝 설명

지뢰찾기 패킷을 처리하도록 클라이언트 핸들러를 확장합니다.

#### ✅ 할 일

- [ ] `packages/client/src/network/clientHandler.ts` 수정
  - [ ] MineSweeperPacketType import
  - [ ] 각 패킷 타입별 case 추가
  - [ ] 게임 씬으로 이벤트 전달 로직
- [ ] 필요 시 Zustand store 연동
  - [ ] 지뢰찾기 게임 상태 저장
  - [ ] 점수판 업데이트

#### 📎 참고 파일

- `packages/client/src/network/clientHandler.ts`
- `packages/client/src/store/gameStore.ts`

#### 📋 Acceptance Criteria

- 모든 지뢰찾기 패킷이 클라이언트에서 처리됨
- 콘솔에 적절한 로그 출력

---

### 📌 Issue #6: [Client] 로비 UI에 지뢰찾기 설정 추가

**Labels**: `enhancement`, `client`, `ui`
**Priority**: Medium
**Estimated Time**: 3-4 hours
**Dependencies**: Issue #1

#### 📝 설명

로비에서 지뢰찾기 게임을 선택하고 설정할 수 있는 UI를 구현합니다.

#### ✅ 할 일

- [ ] `Lobby.tsx` 수정
  - [ ] 게임 선택 드롭다운에 '지뢰찾기' 옵션 추가
  - [ ] 지뢰찾기 선택 시 설정 패널 표시
    - [ ] 맵 크기 프리셋 (Small/Medium/Large/Manual)
    - [ ] 난이도 프리셋 (Easy/Normal/Hard)
    - [ ] 제한 시간 선택 (2분/3분/4분/Manual)
  - [ ] 설정 변경 시 `GAME_CONFIG_UPDATE_REQ` 전송
- [ ] 다른 플레이어에게 설정 변경 반영
- [ ] 지뢰찾기 게임 시작 버튼 연동

#### 📎 참고 파일

- `packages/client/src/components/Lobby.tsx`
- `packages/client/src/game/types/minesweeperPresets.ts`

#### 📋 Acceptance Criteria

- 지뢰찾기 게임을 로비에서 선택 가능
- 설정 변경이 모든 플레이어에게 동기화됨
- 게임 시작 시 설정된 값으로 게임 시작

---

### 📌 Issue #7: [Test] 멀티플레이어 통합 테스트

**Labels**: `testing`, `qa`
**Priority**: Medium
**Estimated Time**: 4-5 hours
**Dependencies**: All above issues

#### 📝 설명

지뢰찾기 멀티플레이어 기능의 통합 테스트를 수행합니다.

#### ✅ 테스트 시나리오

- [ ] **기본 동작 테스트**
  - [ ] 2인 플레이: 타일 열기 동기화
  - [ ] 2인 플레이: 깃발 토글 동기화
  - [ ] 2인 플레이: 점수 업데이트 동기화

- [ ] **Race Condition 테스트**
  - [ ] 동시에 같은 타일 열기 시도
  - [ ] 동시에 같은 위치 깃발 설치 시도

- [ ] **게임 흐름 테스트**
  - [ ] 게임 시작 → 진행 → 승리 (모든 안전 타일 열기)
  - [ ] 게임 시작 → 진행 → 시간 초과
  - [ ] 게임 재시작 (리플레이)

- [ ] **엣지 케이스 테스트**
  - [ ] 게임 중 플레이어 접속 종료
  - [ ] 게임 중 플레이어 재접속
  - [ ] 4인 최대 인원 테스트

- [ ] **설정 테스트**
  - [ ] 각 맵 크기 프리셋 테스트
  - [ ] 각 난이도 프리셋 테스트
  - [ ] 각 시간 제한 테스트

#### 📋 Acceptance Criteria

- 모든 테스트 시나리오 통과
- 버그 발견 시 이슈 생성 및 수정

---

## 📅 예상 일정

| 이슈     | 예상 소요 시간  | 담당자 |
| -------- | --------------- | ------ |
| Issue #1 | 2-3 hours       | -      |
| Issue #2 | 4-6 hours       | -      |
| Issue #3 | 3-4 hours       | -      |
| Issue #4 | 4-5 hours       | -      |
| Issue #5 | 2-3 hours       | -      |
| Issue #6 | 3-4 hours       | -      |
| Issue #7 | 4-5 hours       | -      |
| **총계** | **22-30 hours** |        |

---

## 🔗 참고 자료

- [기존 사과 게임 패킷 구조](packages/common/src/packets.ts)
- [사과 게임 서버 세션](packages/server/src/applegame/gameSession.ts)
- [지뢰찾기 Mock 구현](packages/client/src/game/physics/MineSweeperMockCore.ts)
- [지뢰찾기 타입 정의](packages/client/src/game/types/minesweeper.types.ts)
