# Plan: 플래피버드 팀 점수카드 및 결과 모달 구현

사과게임의 플레이어카드와 결과 모달을 객체지향적으로 모듈화하여 플래피버드에서 팀 점수 표시와 게임오버 모달을 구현합니다. React 컴포넌트 재사용을 기반으로 하며, Phaser 이벤트와 React 상태를 연결합니다.

## Steps

### 1. 공통 게임 결과 컴포넌트 모듈화

[GameResult.tsx](packages/client/src/game/utils/game-result/GameResult.tsx)에 `title` prop을 추가하고, [PlayerCard.tsx](packages/client/src/components/PlayerCard.tsx)를 팀 점수 표시용으로 확장 가능하도록 수정

**변경 사항:**

- GameResult 컴포넌트에 `title?: string` prop 추가 (기본값: "APPLE GAME TOGETHER")
- PlayerCard는 현재 구조 그대로 재사용 가능

### 2. FlappyBirdsScene 이벤트 전달 구현

[FlappyBirdsScene.ts](packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts)에서 `score_update`와 `game_over` 소켓 이벤트를 `scoreUpdate`, `gameEnd` Phaser 이벤트로 변환하여 발생시킴

**구현 내용:**

```typescript
// score_update 소켓 이벤트 처리
this.socket.on('score_update', (data: ScoreUpdateEvent) => {
  this.scene.events.emit('scoreUpdate', {
    score: data.score,
  });
});

// game_over 소켓 이벤트 처리 (기존 코드 수정)
this.socket.on('game_over', (data: GameOverEvent) => {
  this.gameStarted = false;
  this.isGameOver = true;

  // React로 게임 종료 데이터 전달
  this.scene.events.emit('gameEnd', {
    finalScore: data.finalScore,
    reason: data.reason,
    players: this.getPlayersData(), // 플레이어 정보 생성
  });
});
```

### 3. GameContainer 이벤트 리스너 추가

[GameContainer.tsx](packages/client/src/game/GameContainer.tsx)에서 플래피버드 씬의 `scoreUpdate`, `gameEnd` 이벤트를 수신하여 콜백으로 전달

**구현 내용:**

```typescript
// FlappyBirdsScene 타입 가드 또는 조건부 처리
if (gameType === 'flappybird') {
  targetScene.events.on('scoreUpdate', (data: { score: number }) => {
    onScoreUpdate?.(data.score);
  });

  targetScene.events.on('gameEnd', (data) => {
    onGameEnd?.(data);
  });
}
```

### 4. App.tsx에 플래피버드 상태 관리 추가

[App.tsx](packages/client/src/App.tsx)에 `flappyScore`, `flappyGameEnded`, `flappyFinalPlayers` 상태 추가 및 핸들러 구현, 조건부 렌더링으로 `PlayerCard`와 `GameResult` 표시

**구현 내용:**

- useState로 플래피버드 점수/게임종료 상태 관리
- `handleFlappyScoreUpdate`, `handleFlappyGameEnd` 핸들러 구현
- GameContainer에 콜백 props 전달
- 조건부 렌더링:
  - 게임 진행 중: 팀 점수카드 표시 (단일 PlayerCard)
  - 게임 종료 시: GameResult 모달 표시

### 5. 타입 정의 확장

[flappybird.types.ts](packages/client/src/game/types/flappybird.types.ts)와 [common.ts](packages/client/src/game/types/common.ts)에서 팀 점수 데이터를 위한 인터페이스 추가 또는 확장

**추가할 타입:**

```typescript
// flappybird.types.ts
export interface FlappyBirdGameEndData {
  finalScore: number;
  reason: 'pipe_collision' | 'ground_collision';
  players: PlayerResultData[];
}

// common.ts (필요시 확장)
export interface TeamScoreData {
  teamScore: number;
  timestamp: number;
}
```

## Further Considerations

### 1. 플레이어카드 표시 방식

- **옵션 A (추천)**: 팀 점수만 표시하는 단일 카드
  - "Team Score: 123" 형태
  - 중앙 상단 배치

- **옵션 B**: 4개 플레이어카드에 동일 점수 표시
  - 각 플레이어 색상은 유지
  - 모든 카드에 동일한 팀 점수 표시

### 2. 결과 모달 순위 표시

개인 점수가 없으므로:

- **옵션 A**: GameResult를 단순화하여 팀 전체 점수만 크게 표시
- **옵션 B**: 모든 플레이어를 1위(공동우승)로 표시
- **옵션 C (추천)**: 게임 참여 플레이어 목록 + 팀 총점 표시

### 3. 객체지향 구조 개선 가능성

현재는 React 컴포넌트 재사용이 주요 방식이나, 추후 다음을 고려 가능:

- Phaser Container 기반 Prefab 클래스 생성
  - `TeamScoreCardPrefab extends Phaser.GameObjects.Container`
  - `GameOverModalPrefab extends Phaser.GameObjects.Container`
- Factory 패턴으로 게임 타입별 UI 생성
- Strategy 패턴으로 점수 업데이트 로직 분리

## 구현 우선순위

### Phase 1: 핵심 기능 (MVP)

1. ✅ GameResult.tsx title prop 추가
2. ✅ FlappyBirdsScene 이벤트 전달
3. ✅ App.tsx 상태 관리
4. ✅ 타입 정의

### Phase 2: UI/UX 개선

1. 플래피버드 전용 스타일 적용
2. 애니메이션 효과 추가
3. 사운드 이펙트 연동

### Phase 3: 리팩토링 (선택적)

1. Phaser Prefab 클래스 생성
2. 공통 UI 시스템 추상화
3. 게임별 UI 테마 시스템 구축
