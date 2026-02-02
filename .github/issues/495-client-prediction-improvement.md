# [FlappyBird] 클라이언트 예측 및 보간 개선

> Parent Issue: #492

## 목표

밧줄 물리와 상호작용을 고려한 Client-Side Prediction 개선

## 현재 상태

```typescript
// FlappyBirdsScene.ts - update()
// 내 새만 로컬 예측, 다른 새는 서버 보간
if (String(i) === this.myPlayerId && !this.isGameOver) {
  // My Bird: Use local prediction
  sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);
  sprite.y = this.myY * ratio;

  // My Rotation
  const angle = Phaser.Math.Clamp(this.myVy * 10, -30, 90);
  sprite.rotation = Phaser.Math.DegToRad(angle);
} else {
  // Other Birds: Interpolation
  sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);
  sprite.y = Phaser.Math.Linear(sprite.y, target.y * ratio, 0.3);
}
```

**현재 문제점:**

- 내 새의 Y 위치만 예측하고, 밧줄 상호작용은 무시
- 다른 새의 점프가 내 새에 미치는 영향을 예측하지 않음
- 레이턴시가 높을 때 밧줄이 부자연스럽게 늘어남

## 구현 계획

### 1단계: 밧줄 예측 반영

```typescript
// FlappyBirdsScene.ts
private predictRopeInteraction(): void {
  const myIndex = Number(this.myPlayerId);

  for (const [indexA, indexB] of this.ropeConnections) {
    // 내 새와 연결된 밧줄만 처리
    if (indexA !== myIndex && indexB !== myIndex) continue;

    const connectedIndex = indexA === myIndex ? indexB : indexA;
    const connectedTarget = this.targetPositions[connectedIndex];

    if (!connectedTarget) continue;

    // 내 예측 위치와 연결된 새의 서버 위치 사이 거리 계산
    const myPredictedY = this.myY;
    const connectedY = connectedTarget.y;

    const dx = connectedTarget.x - this.targetPositions[myIndex].x;
    const dy = connectedY - myPredictedY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 밧줄이 늘어나면 내 예측 위치 보정
    if (distance > this.gameConfig.ropeLength) {
      const excess = distance - this.gameConfig.ropeLength;
      const ny = dy / distance;

      // 내 새를 연결된 새 방향으로 당김
      this.myY += ny * excess * 0.3; // 30%만 보정 (부드럽게)
    }
  }
}
```

### 2단계: Reconciliation 개선

```typescript
// 서버 상태와 로컬 예측 차이 보정 로직 개선
private reconcileWithServer(): void {
  const myIndex = Number(this.myPlayerId);
  const target = this.targetPositions[myIndex];

  if (!target) return;

  const diff = target.y - this.myY;

  // 임계값 정의
  const SNAP_THRESHOLD = 100;   // 100px 이상: 즉시 스냅
  const BLEND_THRESHOLD = 30;   // 30px 이상: 빠른 블렌딩
  const DRIFT_THRESHOLD = 10;   // 10px 이상: 느린 보정

  if (Math.abs(diff) > SNAP_THRESHOLD) {
    // 큰 차이: 즉시 스냅 (롤백 상황)
    console.log(`[Reconciliation] Snap! Diff: ${diff.toFixed(1)}`);
    this.myY = target.y;
    this.myVy = target.velocityY;
  } else if (Math.abs(diff) > BLEND_THRESHOLD) {
    // 중간 차이: 빠른 블렌딩
    this.myY = Phaser.Math.Linear(this.myY, target.y, 0.15);
    this.myVy = Phaser.Math.Linear(this.myVy, target.velocityY, 0.1);
  } else if (Math.abs(diff) > DRIFT_THRESHOLD) {
    // 작은 차이: 느린 보정 (거의 느끼지 못함)
    this.myY = Phaser.Math.Linear(this.myY, target.y, 0.05);
  }
  // DRIFT_THRESHOLD 이하: 로컬 예측 유지
}
```

### 3단계: 입력 버퍼링 및 재계산

```typescript
// 입력 기록 구조
interface InputRecord {
  timestamp: number;
  serverTick: number;
  action: 'jump';
}

private inputHistory: InputRecord[] = [];
private readonly INPUT_HISTORY_SIZE = 60; // 약 1초 분량

// 점프 시 입력 기록
private handleFlap(playerId: PlayerId): void {
  if (playerId !== this.myPlayerId) return;

  // 입력 기록 추가
  this.inputHistory.push({
    timestamp: Date.now(),
    serverTick: useGameStore.getState().flappyServerTick,
    action: 'jump',
  });

  // 오래된 입력 제거
  if (this.inputHistory.length > this.INPUT_HISTORY_SIZE) {
    this.inputHistory.shift();
  }

  // ... 기존 점프 로직
}

// 서버 상태 수신 시 재계산
private onServerStateReceived(serverTick: number): void {
  // 서버가 확인하지 않은 입력만 남김
  this.inputHistory = this.inputHistory.filter(
    input => input.serverTick > serverTick
  );

  // 남은 입력으로 예측 상태 재계산
  this.replayUnconfirmedInputs();
}

private replayUnconfirmedInputs(): void {
  // 서버 상태를 기준으로 시작
  const target = this.targetPositions[Number(this.myPlayerId)];
  if (!target) return;

  let predictedY = target.y;
  let predictedVy = target.velocityY;

  // 미확인 입력 적용
  for (const input of this.inputHistory) {
    if (input.action === 'jump') {
      predictedVy = FLAPPY_PHYSICS.FLAP_VELOCITY;
    }
    // 간단한 물리 시뮬레이션
    predictedVy += FLAPPY_PHYSICS.GRAVITY_Y;
    predictedY += predictedVy;
  }

  // 차이가 크지 않으면 예측값 사용
  if (Math.abs(predictedY - this.myY) < 50) {
    this.myY = predictedY;
    this.myVy = predictedVy;
  }
}
```

### 4단계: 다른 플레이어 보간 개선

```typescript
// 다른 플레이어의 움직임 보간 개선
private interpolateOtherBird(
  sprite: Phaser.GameObjects.Sprite,
  target: BirdPosition,
  ratio: number
): void {
  // 속도 기반 외삽을 통한 부드러운 보간
  const predictedX = target.x + target.velocityX * 0.016 * 2; // 2프레임 예측
  const predictedY = target.y + target.velocityY * 0.016 * 2;

  // 보간 속도: 거리에 따라 조절 (멀수록 빠르게)
  const dx = predictedX * ratio - sprite.x;
  const dy = predictedY * ratio - sprite.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const lerpFactor = Math.min(0.5, 0.2 + distance / 500);

  sprite.x = Phaser.Math.Linear(sprite.x, predictedX * ratio, lerpFactor);
  sprite.y = Phaser.Math.Linear(sprite.y, predictedY * ratio, lerpFactor);
}
```

## 테스트 케이스

- [ ] 100ms 레이턴시에서 부드러운 움직임 확인
- [ ] 200ms 레이턴시에서도 플레이 가능 확인
- [ ] 밧줄 상호작용 시 예측과 서버 상태 간 큰 차이 없음
- [ ] 급격한 상태 변화(다른 플레이어 점프) 시 자연스러운 보정
- [ ] 네트워크 지연 변동 시 안정적인 동작

## 파일 수정

- `packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`
  - `predictRopeInteraction()` 메서드 추가
  - `reconcileWithServer()` 메서드 수정
  - `inputHistory` 관련 로직 추가
  - `interpolateOtherBird()` 메서드 추가
  - `update()` 메서드 수정

## Labels

`enhancement`, `game:flappybird`, `client`, `networking`
