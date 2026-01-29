# 사과 게임 Config 서버 동기화 - 구현 계획

## 요약

> ✅ **완료**: 서버-클라이언트 그리드 크기 통일 및 gameStore 중앙화 완료
> ✅ **리팩토링**: `applePreset` 제거, `gameStore.gameConfig` 사용으로 단일 진실 공급원 구현

---

## 현재 상태

### ✅ 구현 완료된 기능 (서버)

| 기능                      | 파일                       | 라인    |
| ------------------------- | -------------------------- | ------- |
| 사과 배열 생성            | `gameSession.ts`           | 193-204 |
| SET_FIELD 전송            | `gameSession.ts`           | 155-159 |
| SET_TIME 전송             | `gameSession.ts`           | 169-173 |
| 합 10 검증                | `gameSession.ts`           | 369-370 |
| 중복 점유 방지            | `gameSession.ts`           | 361-366 |
| 점수 계산                 | `gameSession.ts`           | 376-377 |
| 게임 종료                 | `gameSession.ts`           | 249-270 |
| Config 검증/저장          | `gameSession.ts`           | 272-356 |
| **그리드 크기 공통화**    | `appleGameUtils.ts`        | 신규    |

### ✅ 구현 완료된 기능 (클라이언트)

| 기능                      | 파일                  | 라인    |
| ------------------------- | --------------------- | ------- |
| SET_FIELD 수신            | `clientHandler.ts`    | 90-96   |
| 로비 Config 동기화        | `Lobby.tsx`           | 222-261 |
| 사과밭 렌더링             | `AppleGameManager.ts` | 170-214 |
| **gameStore 중앙화**      | `AppleGameScene.ts`   | 192-210 |

---

## ✅ 완료: 그리드 크기 서버-클라이언트 통일

### 해결 방법

`packages/common/src/appleGameUtils.ts`에 공통 유틸리티를 생성하여 서버와 클라이언트가 동일한 그리드 크기를 사용하도록 통일했습니다.

```typescript
// packages/common/src/appleGameUtils.ts
export const MAP_SIZE_TO_GRID = {
  [MapSize.SMALL]: { cols: 16, rows: 8 },
  [MapSize.MEDIUM]: { cols: 20, rows: 10 },
  [MapSize.LARGE]: { cols: 30, rows: 15 },
} as const;

export function resolveAppleGameConfig(cfg: AppleGameConfig): AppleGameRenderConfig {
  const grid = MAP_SIZE_TO_GRID[cfg.mapSize] ?? MAP_SIZE_TO_GRID[MapSize.MEDIUM];
  const maxNumber = cfg.generation === 1 ? 5 : 9;
  return {
    gridCols: grid.cols,
    gridRows: grid.rows,
    minNumber: cfg.zero ? 0 : 1,
    maxNumber,
    totalTime: cfg.time,
    maxPlayers: APPLE_GAME_CONFIG.maxPlayers,
    includeZero: cfg.zero,
  };
}
```

### 통일된 그리드 크기

| mapSize | gridCols | gridRows | 총 사과 개수 |
| ------- | -------- | -------- | ------------ |
| SMALL   | 16       | 8        | 128개        |
| MEDIUM  | 20       | 10       | 200개        |
| LARGE   | 30       | 15       | 450개        |

---

## ✅ 완료: applePreset 제거 및 gameStore 중앙화

### 변경 내용

클라이언트에서 `applePreset` prop을 제거하고 `gameStore.gameConfig`를 단일 진실 공급원으로 사용합니다.

### 수정된 파일

| 파일                           | 변경 내용                              |
| ------------------------------ | -------------------------------------- |
| `common/src/appleGameUtils.ts` | **신규** - 공통 그리드 유틸리티        |
| `server/gameSession.ts`        | `resolveAppleGameConfig()` 사용        |
| `client/AppleGameScene.ts`     | preset 대신 gameStore.gameConfig 사용  |
| `client/GameContainer.tsx`     | applePreset prop 제거                  |
| `client/App.tsx`               | applePreset useState 제거              |
| `client/Lobby.tsx`             | preset 생성 로직 간소화                |
| `client/AppleGamePreset.ts`    | manual, 1-3 제거, resolvePreset 삭제   |

### 최종 아키텍처

```
gameStore.ts (단일 진실 공급원)
├── gameConfig         <- 서버에서 받은 AppleGameConfig
├── appleField         <- 서버에서 받은 사과 배열
├── gameTime           <- 게임 제한 시간
├── players            <- 플레이어 목록
└── myselfIndex        <- 현재 플레이어 인덱스

common/appleGameUtils.ts (공통 유틸)
├── MAP_SIZE_TO_GRID           <- 그리드 크기 매핑
└── resolveAppleGameConfig()   <- 설정 변환 함수
```

---

## 🟡 권장 수정: UPDATE_SCORE 전송

### 문제

점수 변경 시 `DROP_CELL_INDEX`만 전송하고 `UPDATE_SCORE`는 미전송

### 수정 위치

**서버**: `gameSession.ts` 라인 394 다음에 추가

```typescript
this.broadcastCallback(dropCellIndexPacket);
this.broadcastScoreboard(); // 추가
```

---

## 📝 프로토콜 문서 수정 사항

### DROP_CELL_INDEX 패킷

**수정됨**: `spec/apple-game-protocol.md`

- ❌ 제거: `addedScore` 필드 (실제 코드에 없음)
- ✅ 유지: `totalScore` 필드만 사용
- 📝 참고: 획득 점수는 `indices.length`로 계산

---

## 패킷 흐름 (참고)

```
[로비]
방장 설정 변경 → GAME_CONFIG_UPDATE_REQ → 서버 저장 → GAME_CONFIG_UPDATE 브로드캐스트
                                                    ↓
                                         클라이언트 gameStore.gameConfig 업데이트

[게임 시작]
GAME_START_REQ → startGame()
  → generateField() → SET_FIELD → 클라이언트 gameStore.appleField 업데이트
  → SET_TIME → 클라이언트 gameStore.gameTime 업데이트
  → READY_SCENE

[게임 진행]
CONFIRM_DRAG_AREA → handleDragConfirm()
  → 합 10 검증 → DROP_CELL_INDEX + UPDATE_SCORE

[게임 종료]
타이머 만료 → finishGame() → TIME_END
```

---

## 체크리스트

### ✅ 완료된 항목

- [x] 그리드 크기 서버-클라이언트 통일 (`common/appleGameUtils.ts` 생성)
- [x] 서버 `gameSession.ts`에서 공통 유틸 사용
- [x] 클라이언트 `AppleGameScene.ts`에서 공통 유틸 사용
- [x] `applePreset` prop 제거 → `gameStore.gameConfig` 사용
- [x] `AppleGamePreset.ts`에서 미지원 기능 제거 (manual, 1-3)

### 권장 수정

- [ ] UPDATE_SCORE 전송 추가 (선택)

### 테스트

- [ ] SMALL/MEDIUM/LARGE 각각 테스트
- [ ] 서버 사과 개수와 클라이언트 그리드 일치 확인
- [ ] 멀티플레이어 환경에서 모든 클라이언트 동일 그리드 표시 확인
- [ ] 시간 설정 (120/180/240초) 올바르게 적용 확인

---

## 관련 문서

- [docs/backend-guide.md](../docs/backend-guide.md) - 상세 백엔드 가이드
- [docs/gamestore-centralization-plan.md](../docs/gamestore-centralization-plan.md) - gameStore 중앙화 계획
- [spec/apple-game-protocol.md](../spec/apple-game-protocol.md) - 패킷 스펙
- [spec/room-protocol.md](../spec/room-protocol.md) - 방 프로토콜 스펙
