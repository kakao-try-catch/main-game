# [FlappyBird] 점프 상호작용 시스템

> Parent Issue: #492

## 목표

한 새가 점프할 때 밧줄을 통해 연결된 다른 새에게 힘이 전달되는 시스템 구현

## 핵심 메커니즘

### 게임플레이 영향

| 상황           | 효과                                     |
| -------------- | ---------------------------------------- |
| 동시 점프      | 모든 새가 더 높이 뜀 (시너지 효과)       |
| 번갈아 점프    | 밧줄이 팽팽해지며 서로 당김              |
| 한 명만 점프   | 연결된 새도 살짝 위로 당겨짐             |
| 아무도 안 점프 | 모두 함께 떨어짐 (밧줄 연결로 속도 유사) |

## 구현 계획

### 1단계: 점프 시 힘 전달

```typescript
// FlappyBirdInstance.ts
private handleJump(playerIndex: number): void {
  if (this.isGameOverState) return;

  const jumpingBird = this.birds[playerIndex];
  if (!jumpingBird || jumpingBird.isStatic) return;

  // 점프 시간 기록
  this.lastFlapTime.set(playerIndex, this.physicsTick);

  // 1. 점프하는 새에 기본 힘 적용
  const extraBoost = this.flapBoostBase + Math.random() * this.flapBoostRandom;
  const verticalJitter =
    (Math.random() - 0.5) * Math.abs(FLAP_VELOCITY) * FLAP_VERTICAL_JITTER_RATIO;

  Matter.Body.setVelocity(jumpingBird, {
    x: jumpingBird.velocity.x + extraBoost,
    y: FLAP_VELOCITY + verticalJitter,
  });

  // 2. 연결된 새들에게 부분 힘 전달
  this.transferJumpForceToConnectedBirds(playerIndex);
}
```

### 2단계: 연결된 새에게 힘 전달

```typescript
/**
 * 점프한 새와 연결된 다른 새들에게 일부 힘을 전달
 * 거리가 가까울수록 더 많은 힘이 전달됨
 */
private transferJumpForceToConnectedBirds(jumperIndex: number): void {
  const jumpingBird = this.birds[jumperIndex];

  for (const [indexA, indexB] of this.ropeConnections) {
    // 점프한 새와 연결된 경우만 처리
    if (indexA !== jumperIndex && indexB !== jumperIndex) continue;

    const connectedIndex = indexA === jumperIndex ? indexB : indexA;
    const connectedBird = this.birds[connectedIndex];

    if (!connectedBird || connectedBird.isStatic) continue;

    // 힘 전달 비율 계산 (거리에 반비례)
    const transferRatio = this.calculateForceTransferRatio(jumpingBird, connectedBird);

    // 부분 점프력 전달 (위로 당기는 힘)
    const transferredVelocityY = FLAP_VELOCITY * transferRatio * this.forceTransferRate;

    // 직접 속도 변경 대신 힘으로 적용 (더 자연스러움)
    Matter.Body.applyForce(connectedBird, connectedBird.position, {
      x: 0,
      y: transferredVelocityY * connectedBird.mass * 0.1,
    });

    console.log(
      `[FlappyBirdInstance] 힘 전달: Player ${jumperIndex} -> Player ${connectedIndex}, ratio: ${transferRatio.toFixed(2)}`
    );
  }
}
```

### 3단계: 힘 전달 비율 계산

```typescript
/**
 * 두 새 사이의 거리에 따른 힘 전달 비율 계산
 * 가까울수록 더 많은 힘이 전달됨
 *
 * @returns 0.0 ~ 1.0 사이의 비율
 */
private calculateForceTransferRatio(birdA: Matter.Body, birdB: Matter.Body): number {
  const dx = birdB.position.x - birdA.position.x;
  const dy = birdB.position.y - birdA.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 거리가 0이면 최대 전달, 밧줄 길이면 0
  // 선형 보간: ratio = 1 - (distance / ropeLength)
  const ratio = 1 - (distance / this.ropeLength);

  // 0 ~ 1 범위로 클램핑
  return Math.max(0, Math.min(1, ratio));
}
```

### 4단계: 설정 옵션 추가

```typescript
// config.ts
export type ForceTransferPreset = 'weak' | 'normal' | 'strong';

export interface FlappyBirdGamePreset {
  // 기존 설정...

  /** 밧줄을 통한 힘 전달 비율 */
  forceTransfer?: ForceTransferPreset;
}

// resolveFlappyBirdPreset() 수정
export interface ResolvedFlappyBirdConfig {
  // 기존 설정...
  forceTransferRate: number; // 힘 전달 비율 (0.0 ~ 1.0)
}

const forceTransferValues = {
  weak: 0.2,
  normal: 0.4,
  strong: 0.6,
};
```

### 5단계: 동시 점프 보너스 (선택)

```typescript
/**
 * 일정 시간 내 여러 새가 점프하면 시너지 보너스
 */
private checkSyncJumpBonus(): void {
  const SYNC_WINDOW_MS = 100; // 100ms 이내 동시 점프
  const now = this.physicsTick;

  let recentJumpers = 0;
  for (const [playerIndex, lastFlapTick] of this.lastFlapTime) {
    if (now - lastFlapTick < SYNC_WINDOW_MS * (this.PHYSICS_FPS / 1000)) {
      recentJumpers++;
    }
  }

  if (recentJumpers >= 2) {
    // 동시 점프 보너스 적용
    const syncBonus = 1 + (recentJumpers - 1) * 0.1; // 2명: 1.1배, 3명: 1.2배...

    for (const bird of this.birds) {
      if (bird.velocity.y < 0) { // 위로 올라가는 중이면
        Matter.Body.setVelocity(bird, {
          x: bird.velocity.x,
          y: bird.velocity.y * syncBonus,
        });
      }
    }

    console.log(`[FlappyBirdInstance] 동시 점프 보너스! ${recentJumpers}명, ${syncBonus}배`);
  }
}
```

## 테스트 케이스

- [ ] 한 새 점프 시 연결된 새가 위로 당겨지는지 확인
- [ ] 거리에 따라 전달되는 힘이 다른지 확인
- [ ] 동시 점프 시 힘이 합쳐지는지 확인
- [ ] forceTransfer 프리셋(weak/normal/strong) 변경 시 체감 차이 확인
- [ ] 4인 플레이 시 힘 전달 체인 확인 (A -> B -> C -> D)

## 파일 수정

- `packages/server/src/games/instances/FlappyBirdInstance.ts`
  - `transferJumpForceToConnectedBirds()` 메서드 추가
  - `calculateForceTransferRatio()` 메서드 추가
  - `handleJump()` 수정
  - `forceTransferRate` 속성 추가
- `packages/common/src/config.ts`
  - `ForceTransferPreset` 타입 추가
  - `FlappyBirdGamePreset` 인터페이스 수정
  - `ResolvedFlappyBirdConfig` 인터페이스 수정
  - `resolveFlappyBirdPreset()` 함수 수정

## Labels

`enhancement`, `game:flappybird`, `physics`, `gameplay`
