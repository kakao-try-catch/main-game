# FlappyBird B안: 버퍼 있는 버전

> 틱 기반 렌더링 + 버퍼 보간 방식

---

## 개요

서버 패킷을 버퍼에 저장하고, **클라이언트도 20Hz 틱으로 렌더링**. 60fps 부드러움은 **틱 간 보간**으로 달성.

```
서버 (20Hz)     →  [패킷1] → [패킷2] → [패킷3] → [패킷4]
                       ↓
클라이언트 버퍼  →  [틱1, 틱2, 틱3] (3틱 버퍼, 150ms)
                       ↓
렌더 틱 (20Hz)  →  버퍼에서 틱 꺼냄 (currentTick → nextTick)
                       ↓
화면 (60fps)    →  currentTick ↔ nextTick 사이 프레임 보간
```

---

## 장단점

### 장점
- 서버 물리 상태를 그대로 렌더링 → **밧줄 제약 100% 유지**
- 네트워크 지터(jitter) 흡수
- 클라이언트에서 물리 계산 불필요

### 단점
- 150ms 입력 지연 (3틱 버퍼)
- 구현 복잡도 증가
- 버퍼 부족 시 끊김 발생 가능

---

## 수정 파일
`packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`

---

## Step 1: 새로운 속성 추가

```typescript
// 기존 속성 유지 + 새 속성 추가

// 틱 버퍼 시스템
private tickBuffer: WorldState[] = [];
private currentTick: WorldState | null = null;
private nextTick: WorldState | null = null;
private tickProgress: number = 0;
private lastTickTime: number = 0;
private readonly TICK_INTERVAL = 50;  // 20Hz = 50ms
private readonly BUFFER_SIZE = 3;     // 3틱 버퍼 (150ms)
private isBufferReady: boolean = false;  // 버퍼 준비 완료 여부

// WorldState 인터페이스 (클래스 외부 또는 상단에 정의)
interface WorldState {
  tick: number;
  birds: BirdPosition[];
  pipes: PipeData[];
  cameraX: number;
  timestamp: number;
}
```

---

## Step 2: setupStoreSubscription 수정

```typescript
private setupStoreSubscription(): void {
  this.storeUnsubscribe = useGameStore.subscribe(
    (state) => ({
      birds: state.flappyBirds,
      pipes: state.flappyPipes,
      tick: state.flappyServerTick,
      cameraX: state.flappyCameraX,
      score: state.flappyScore,
      isGameOver: state.isFlappyGameOver,
      gameOverData: state.flappyGameOverData,
    }),
    (current, previous) => {
      // 새 위치 데이터 → 버퍼에 저장 (기존: targetPositions 직접 업데이트)
      if (current.birds.length > 0 && current.tick !== previous.tick) {
        const worldState: WorldState = {
          tick: current.tick,
          birds: current.birds.map((bird, index) => ({
            playerId: String(index) as PlayerId,
            x: bird.x,
            y: bird.y,
            velocityX: bird.vx,
            velocityY: bird.vy,
            angle: bird.angle,
          })),
          pipes: current.pipes.map((pipe) => ({
            id: String(pipe.id),
            x: pipe.x,
            gapY: pipe.gapY,
            width: pipe.width,
            gap: pipe.gap,
            passed: false,
            passedPlayers: [],
          })),
          cameraX: current.cameraX,
          timestamp: Date.now(),
        };

        this.tickBuffer.push(worldState);

        // 버퍼 크기 제한 (너무 오래된 틱 제거)
        while (this.tickBuffer.length > this.BUFFER_SIZE * 2) {
          this.tickBuffer.shift();
        }

        // 버퍼가 충분히 찼는지 확인
        if (!this.isBufferReady && this.tickBuffer.length >= this.BUFFER_SIZE) {
          this.isBufferReady = true;
          this.lastTickTime = Date.now();
          console.log('[FlappyBirdsScene] 버퍼 준비 완료, 렌더링 시작');
        }
      }

      // 점수 업데이트 (즉시 처리)
      if (current.score !== previous.score) {
        this.currentScore = current.score;
        this.events.emit('flappyScore');
        this.events.emit('scoreUpdate', {
          score: current.score,
          timestamp: Date.now(),
        });
      }

      // 게임 오버 (즉시 처리)
      if (current.isGameOver && !previous.isGameOver && current.gameOverData) {
        this.gameStarted = false;
        this.isGameOver = true;
        this.events.emit('flappyStrike');

        this.events.emit('gameEnd', {
          finalScore: current.gameOverData.finalScore,
          reason: current.gameOverData.reason,
          collidedPlayerId: String(current.gameOverData.collidedPlayerIndex) as PlayerId,
          timestamp: Date.now(),
          players: this.getPlayersData(),
        });
      }
    },
  );
}
```

---

## Step 3: update() 메서드 전면 수정

```typescript
update(time: number, delta: number) {
  if (this.isGameOver) return;

  const ratio = this.getRatio();
  const now = Date.now();

  // 1. 버퍼가 준비되지 않았으면 대기
  if (!this.isBufferReady) {
    // 버퍼 채우는 중... 로딩 표시 가능
    return;
  }

  // 2. 틱 진행 (50ms마다)
  if (now - this.lastTickTime >= this.TICK_INTERVAL) {
    this.lastTickTime = now;
    this.tickProgress = 0;

    // 현재 틱 → 다음 틱으로 이동
    if (this.nextTick) {
      this.currentTick = this.nextTick;
    } else if (this.tickBuffer.length > 0) {
      this.currentTick = this.tickBuffer.shift()!;
    }

    // 다음 틱 준비
    if (this.tickBuffer.length > 0) {
      this.nextTick = this.tickBuffer.shift()!;
    } else {
      this.nextTick = null;
    }
  }

  // 3. 틱 진행률 계산 (0~1)
  this.tickProgress = Math.min(1, (now - this.lastTickTime) / this.TICK_INTERVAL);

  // 4. 새 스프라이트 위치 설정 (틱 간 보간)
  if (this.currentTick) {
    for (let i = 0; i < this.birdSprites.length; i++) {
      const sprite = this.birdSprites[i];
      const currentBird = this.currentTick.birds[i];
      const nextBird = this.nextTick?.birds[i];

      if (currentBird) {
        let x = currentBird.x;
        let y = currentBird.y;
        let angle = currentBird.angle;

        // 다음 틱이 있으면 보간
        if (nextBird) {
          x = Phaser.Math.Linear(currentBird.x, nextBird.x, this.tickProgress);
          y = Phaser.Math.Linear(currentBird.y, nextBird.y, this.tickProgress);
          angle = Phaser.Math.Linear(currentBird.angle, nextBird.angle, this.tickProgress);
        }

        sprite.x = x * ratio;
        sprite.y = y * ratio;
        sprite.rotation = Phaser.Math.DegToRad(angle);
      }
    }
  }

  // 5. 카메라 추적
  if (this.gameStarted && this.birdSprites.length > 0) {
    let totalX = 0;
    for (const sprite of this.birdSprites) {
      totalX += sprite.x;
    }
    const avgX = totalX / this.birdSprites.length;
    const screenWidth = GAME_WIDTH * ratio;
    const targetCameraX = avgX - screenWidth / 4;

    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX,
      targetCameraX,
      0.1,
    );

    if (this.groundTile) {
      this.groundTile.tilePositionX = this.cameras.main.scrollX;
    }
  }

  // 6. 파이프 업데이트 (currentTick 기반)
  if (this.currentTick && this.currentTick.pipes.length > 0 && this.pipeManager) {
    const pipes = this.currentTick.pipes;
    const nextPipes = this.nextTick?.pipes;

    // 파이프도 틱 간 보간
    const scaledPipes = pipes.map((p, i) => {
      let x = p.x;
      if (nextPipes && nextPipes[i]) {
        x = Phaser.Math.Linear(p.x, nextPipes[i].x, this.tickProgress);
      }
      return {
        ...p,
        x: x * ratio,
        gapY: p.gapY * ratio,
        gap: p.gap * ratio,
        width: p.width * ratio,
      };
    });
    this.pipeManager.updateFromServer(scaledPipes);
  }

  // 7. 밧줄 그리기
  this.drawRopesFromSprites();

  // 8. 디버그
  if (this.showDebug) {
    this.drawDebugHitboxes();
  }
}
```

---

## Step 4: 버퍼 상태 초기화 (create에서)

```typescript
create() {
  // ... 기존 초기화 코드

  // 버퍼 초기화 (추가)
  this.tickBuffer = [];
  this.currentTick = null;
  this.nextTick = null;
  this.tickProgress = 0;
  this.lastTickTime = 0;
  this.isBufferReady = false;

  // ... 나머지 코드
}
```

---

## 전체 변경 요약

```diff
// FlappyBirdsScene.ts

+ // 새 속성
+ private tickBuffer: WorldState[] = [];
+ private currentTick: WorldState | null = null;
+ private nextTick: WorldState | null = null;
+ private tickProgress: number = 0;
+ private lastTickTime: number = 0;
+ private readonly TICK_INTERVAL = 50;
+ private readonly BUFFER_SIZE = 3;
+ private isBufferReady: boolean = false;

  setupStoreSubscription() {
-   // targetPositions 직접 업데이트
+   // tickBuffer에 저장
  }

  update() {
-   // 독립 보간 (각 새별로)
+   // 틱 기반 렌더링 + 틱 간 보간
  }

  create() {
+   // 버퍼 초기화
  }
```

---

## 검증 방법

1. **버퍼 테스트**
   - 게임 시작 시 "버퍼 준비 완료" 로그 확인 (3틱 후)
   - 150ms 지연 후 렌더링 시작

2. **밧줄 테스트**
   - 한 플레이어만 점프 → 밧줄이 **전혀** 늘어나지 않는지 확인
   - 서버 물리 상태 그대로 렌더링되므로 100% 유지되어야 함

3. **부드러움 테스트**
   - 60fps 부드러운 애니메이션 유지
   - 틱 전환 시 끊김 없는지 확인

4. **네트워크 지터 테스트**
   - 인위적 지연/지터 추가 → 버퍼가 흡수하는지 확인
   - 버퍼 부족 시 동작 확인

---

## 향후 개선

### 적응형 버퍼
네트워크 상태에 따라 버퍼 크기 동적 조절:
```typescript
// RTT 측정 후 버퍼 크기 조절
const rtt = measureRTT();
this.BUFFER_SIZE = Math.ceil(rtt / this.TICK_INTERVAL) + 1;
```

### 버퍼 부족 시 처리
```typescript
// 버퍼가 비었을 때 마지막 상태 유지 또는 예측
if (this.tickBuffer.length === 0 && !this.nextTick) {
  console.warn('[FlappyBirdsScene] 버퍼 부족! 마지막 상태 유지');
  // 또는 클라이언트 예측 로직
}
```

### 입력 지연 감소
버퍼 크기를 2로 줄이면 100ms 지연:
```typescript
private readonly BUFFER_SIZE = 2;  // 100ms 지연
```
