# 사과 게임 GameStore 중앙화 리팩토링 계획

## 요약

사과 게임의 서버 관련 변수들을 `gameStore.ts`로 통합하여 단일 진실 공급원(Single Source of Truth)으로 만듭니다.

---

## 사용자 결정 사항

- **그리드 크기 기준**: 클라이언트 기준 (서버 코드 수정)
- **미지원 기능 처리**: UI에서 완전 제거 ('1-3', 'manual')

---

## 현재 상태 분석

### gameStore.ts에 이미 있는 변수

| 변수               | 라인 | 설명                    |
| ------------------ | ---- | ----------------------- |
| `appleField`       | 51   | 서버에서 받은 사과 배열 |
| `gameTime`         | 55   | 게임 제한 시간          |
| `isGameStarted`    | 59   | 게임 시작 여부          |
| `dropCellEvent`    | 63   | 사과 제거 이벤트        |
| `otherPlayerDrags` | 67   | 타 플레이어 드래그 영역 |
| `gameResults`      | 72   | 게임 결과               |
| `players`          | 37   | 플레이어 목록           |
| `myselfIndex`      | 33   | 현재 플레이어 인덱스    |
| `gameConfig`       | 43   | 서버 게임 설정          |

### 중복/분산된 변수

| 변수                 | 위치                | 라인  | gameStore에 있음?                 |
| -------------------- | ------------------- | ----- | --------------------------------- |
| `applePreset`        | App.tsx             | 64-66 | 미사용 (제거 대상)                |
| `_currentPreset`     | AppleGameScene.ts   | 59    | 미사용 (제거 대상)                |
| `players`            | AppleGameManager.ts | 84    | 중복 (gameStore 사용으로 변경)    |
| `currentPlayerIndex` | AppleGameManager.ts | 59    | 중복 (`myselfIndex` 사용)         |

---

## 핵심 문제: 서버/클라이언트 그리드 크기 불일치

### 현재 상태

| MapSize | 서버 (gameSession.ts) | 클라이언트 (AppleGamePreset.ts) |
| ------- | --------------------- | ------------------------------- |
| SMALL   | 11 x 6                | 16 x 8                          |
| MEDIUM  | 17 x 10               | 20 x 10                         |
| LARGE   | 25 x 14               | 30 x 15                         |

### 결정: 클라이언트 기준으로 통일

| MapSize | 통일된 값  |
| ------- | ---------- |
| SMALL   | 16 x 8     |
| MEDIUM  | 20 x 10    |
| LARGE   | 30 x 15    |

---

## 실행 계획

### Phase 1: 공통 유틸리티 생성

**신규 파일:** `packages/common/src/appleGameUtils.ts`

```typescript
import { MapSize, AppleGameConfig, AppleGameRenderConfig, APPLE_GAME_CONFIG } from './config';

// 통일된 그리드 크기 매핑 (클라이언트 기준)
export const MAP_SIZE_TO_GRID = {
  [MapSize.SMALL]: { cols: 16, rows: 8 },
  [MapSize.MEDIUM]: { cols: 20, rows: 10 },
  [MapSize.LARGE]: { cols: 30, rows: 15 },
} as const;

// AppleGameConfig -> AppleGameRenderConfig 변환
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

### Phase 2: 서버 코드 수정

**파일:** `packages/server/src/applegame/gameSession.ts`

1. `getAppliedAppleConfig()` (L206-236)에서 하드코딩된 그리드 크기를 common 유틸 사용으로 변경
2. `resolveAppleGameConfig()` import 및 사용

### Phase 3: 클라이언트 마이그레이션

**수정 파일들:**

1. **AppleGameScene.ts**
   - L197-217: `resolvePreset(preset)` -> `resolveAppleGameConfig(gameStore.gameConfig)`
   - L59: `_currentPreset` 필드 제거
   - `updatePlayers` 이벤트에서 preset 파라미터 제거

2. **GameContainer.tsx**
   - L42, 54, 63: `applePreset` prop 제거
   - L201-205: `updatePlayers` emit에서 preset 제거

3. **App.tsx**
   - L64-66: `applePreset` useState 제거
   - L314: GameContainer에서 applePreset prop 제거

4. **Lobby.tsx**
   - L177-204: preset 생성 로직 간소화 (서버 요청만 보내면 됨)

### Phase 4: 미지원 기능 UI 제거

**파일:** `packages/client/src/game/types/AppleGamePreset.ts`

1. `AppleGridSize`에서 `'manual'` 제거
2. `NumberRange`에서 `'1-3'` 제거
3. `manualCols`, `manualRows`, `manualTime` 필드 제거
4. `resolvePreset()` 함수 -> common 패키지로 이동 후 삭제

### Phase 5: 테스트

1. 로비에서 각 맵 크기(S/M/L) 선택 후 게임 시작
2. 서버가 생성한 사과 개수와 클라이언트 그리드가 일치하는지 확인
3. 멀티플레이어 환경에서 모든 클라이언트 동일한 그리드 표시 확인
4. 시간 설정(120/180/240초)이 올바르게 적용되는지 확인

---

## 파일별 수정 요약

| 파일                                  | 변경 유형 | 변경 내용                              |
| ------------------------------------- | --------- | -------------------------------------- |
| `common/src/appleGameUtils.ts`        | **신규**  | 공통 유틸 함수                         |
| `server/src/applegame/gameSession.ts` | 수정      | 그리드 크기 클라이언트 기준으로 변경   |
| `client/src/App.tsx`                  | 수정      | `applePreset` 관련 코드 제거           |
| `client/src/game/GameContainer.tsx`   | 수정      | `applePreset` prop 제거                |
| `client/.../AppleGameScene.ts`        | 수정      | gameStore 사용으로 변경                |
| `client/.../AppleGamePreset.ts`       | 수정      | manual, 1-3 제거, resolvePreset 이동   |
| `client/src/components/Lobby.tsx`     | 수정      | preset 생성 로직 간소화                |
| `client/.../AppleGameManager.ts`      | 수정      | `players`, `currentPlayerIndex` 제거   |

---

## 최종 구조

```
gameStore.ts (단일 진실 공급원)
├── appleField, gameTime, gameConfig  <- 서버 상태
├── players, myselfIndex              <- 플레이어 상태
├── dropCellEvent, gameResults        <- 게임 이벤트
└── ...

common/appleGameUtils.ts (공통 유틸)
├── MAP_SIZE_TO_GRID                  <- 그리드 크기 매핑
└── resolveAppleGameConfig()          <- 설정 변환 함수

AppleGameManager.ts (렌더링 전용)
├── apples[]         <- Phaser 사과 객체
├── selectedApples   <- 드래그 선택 (로컬)
└── config           <- 렌더링 설정
```

---

## 체크리스트

- [ ] Phase 1: `common/src/appleGameUtils.ts` 생성
- [ ] Phase 2: `gameSession.ts` 그리드 크기 수정
- [ ] Phase 3-1: `AppleGameScene.ts` gameStore 사용으로 변경
- [ ] Phase 3-2: `GameContainer.tsx` applePreset prop 제거
- [ ] Phase 3-3: `App.tsx` applePreset useState 제거
- [ ] Phase 3-4: `Lobby.tsx` preset 로직 간소화
- [ ] Phase 4: `AppleGamePreset.ts` manual, 1-3 제거
- [ ] Phase 5: 테스트

---

## 주의사항

1. **Phaser는 React 훅 사용 불가**: `useGameStore.getState()` 직접 호출
2. **구독 패턴 유지**: AppleGameScene의 `subscribeToGameStore()` 활용
3. **단계적 마이그레이션**: 파일별로 진행
4. **서버-클라이언트 동시 배포**: 그리드 크기 변경으로 인해 서버와 클라이언트를 동시에 배포해야 함
