# 사과 게임 GameStore 중앙화 리팩토링 계획

## 요약

사과 게임의 서버 관련 변수들을 `gameStore.ts`로 통합하여 단일 진실 공급원(Single Source of Truth)으로 만듭니다.

---

## 현재 상태 분석

### ✅ gameStore.ts에 이미 있는 변수

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

### ⚠️ 중복/분산된 변수

| 변수                 | 위치                | 라인  | gameStore에 있음?                 |
| -------------------- | ------------------- | ----- | --------------------------------- |
| `applePreset`        | App.tsx             | 64-66 | ❌ 미사용 (제거 대상)             |
| `_currentPreset`     | AppleGameScene.ts   | 59    | ❌ 미사용 (제거 대상)             |
| `players`            | AppleGameManager.ts | 84    | ✅ 중복 (gameStore 사용으로 변경) |
| `currentPlayerIndex` | AppleGameManager.ts | 59    | ✅ 중복 (`myselfIndex` 사용)      |

---

## 제안하는 변경사항

### 1. App.tsx - `applePreset` 제거

**현재** (L64-66):

```typescript
const [applePreset, setApplePreset] = useState<AppleGamePreset | undefined>(
  undefined,
);
```

**수정**: 해당 useState 및 관련 코드 제거 (L64-66, L184-185, L314)

### 2. AppleGameScene.ts - `_currentPreset` 제거

**현재** (L59):

```typescript
private _currentPreset?: AppleGamePreset;
```

**수정**: 필드 및 관련 import 제거

### 3. AppleGameManager.ts - gameStore 사용

**현재**:

```typescript
private players: PlayerData[] = [];           // L84
private currentPlayerIndex: number = 0;       // L59
```

**수정**: gameStore.getState()에서 직접 가져오기

---

## 파일별 수정 요약

| 파일                | 변경                                                  |
| ------------------- | ----------------------------------------------------- |
| App.tsx             | `applePreset` useState 제거, GameContainer props 수정 |
| AppleGameScene.ts   | `_currentPreset` 필드/import 제거                     |
| AppleGameManager.ts | `players`, `currentPlayerIndex` → gameStore 사용      |
| GameContainer.tsx   | `applePreset` prop 제거                               |

---

## 최종 구조

```
gameStore.ts (단일 진실 공급원)
├── appleField, gameTime, gameConfig  ← 서버 상태
├── players, myselfIndex              ← 플레이어 상태
├── dropCellEvent, gameResults        ← 게임 이벤트
└── ...

AppleGameManager.ts (렌더링 전용)
├── apples[]         ← Phaser 사과 객체
├── selectedApples   ← 드래그 선택 (로컬)
└── config           ← 렌더링 설정
```

---

## 체크리스트

- [ ] App.tsx: `applePreset` 관련 코드 제거
- [ ] AppleGameScene.ts: `_currentPreset` 제거
- [ ] AppleGameManager.ts: gameStore 사용으로 변경
- [ ] GameContainer.tsx: props 수정
- [ ] 테스트

---

## 주의사항

1. **Phaser는 React 훅 사용 불가**: `useGameStore.getState()` 직접 호출
2. **구독 패턴 유지**: AppleGameScene의 `subscribeToGameStore()` 활용
3. **단계적 마이그레이션**: 파일별로 진행
