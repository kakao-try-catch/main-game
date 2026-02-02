# FlappyBird A안: 버퍼 없는 버전

> 클라이언트 측 밧줄 제약 적용 방식

---

## 개요

서버 패킷을 받으면 즉시 보간을 시작하되, **보간 후 클라이언트에서 밧줄 제약을 재적용**하여 시각적 일관성 유지

```
서버 (20Hz)  →  패킷 수신 → targetPositions 업데이트
                    ↓
클라 (60fps) →  독립 보간 → 밧줄 제약 재적용 → 렌더링
```

---

## 장단점

### 장점
- 구현이 간단함
- 기존 코드 구조 유지
- 입력 지연 없음 (버퍼 대기 없음)

### 단점
- 클라이언트 밧줄 제약이 서버와 미세하게 다를 수 있음
- 보간 중 밧줄이 약간 "탄성"처럼 보일 수 있음
- 서버/클라 물리 로직 중복

---

## 수정 파일
`packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`

---

## Step 1: 클라이언트 밧줄 제약 함수 추가

```typescript
/**
 * 클라이언트 측 밧줄 제약 적용 (시각적 일관성용)
 * 서버의 enforceRopeConstraint()와 동일한 로직
 */
private enforceClientRopeConstraint(): void {
  const ratio = this.getRatio();
  const maxLength = this.gameConfig.ropeLength * ratio;

  for (const [indexA, indexB] of this.ropeConnections) {
    const spriteA = this.birdSprites[indexA];
    const spriteB = this.birdSprites[indexB];
    if (!spriteA || !spriteB) continue;

    const dx = spriteB.x - spriteA.x;
    const dy = spriteB.y - spriteA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxLength && distance > 0) {
      const nx = dx / distance;
      const ny = dy / distance;
      const excess = distance - maxLength;
      const correction = excess / 2;

      // 양쪽 스프라이트를 당김
      spriteA.x += nx * correction;
      spriteA.y += ny * correction;
      spriteB.x -= nx * correction;
      spriteB.y -= ny * correction;
    }
  }
}
```

---

## Step 2: update() 메서드 수정

```typescript
update() {
  if (this.isGameOver) return;

  const ratio = this.getRatio();

  // 1. 기존 독립 보간 (각 새를 타겟 위치로)
  for (let i = 0; i < this.birdSprites.length; i++) {
    const sprite = this.birdSprites[i];
    const target = this.targetPositions[i];

    if (target) {
      sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);
      sprite.y = Phaser.Math.Linear(sprite.y, target.y * ratio, 0.3);

      // 회전 (기존 로직 유지)
      let angle = target.angle;
      if (angle === 0) {
        angle = Phaser.Math.Clamp(target.velocityY * 10, -30, 90);
      }
      sprite.rotation = Phaser.Math.DegToRad(angle);
    }
  }

  // 2. 보간 후 밧줄 제약 적용 (추가)
  this.enforceClientRopeConstraint();

  // 3. 카메라 추적 (기존 로직 유지)
  if (this.gameStarted && this.birdSprites.length > 0) {
    // ... 기존 카메라 코드
  }

  // 4. 파이프 업데이트 (기존 로직 유지)
  if (this.targetPipes.length > 0 && this.pipeManager) {
    // ... 기존 파이프 코드
  }

  // 5. 밧줄 그리기 (기존 로직 유지)
  this.drawRopesFromSprites();

  // 6. 디버그 (기존 로직 유지)
  if (this.showDebug) {
    this.drawDebugHitboxes();
  }
}
```

---

## 전체 변경 요약

```diff
// FlappyBirdsScene.ts

+ // 클라이언트 밧줄 제약 함수 추가
+ private enforceClientRopeConstraint(): void { ... }

  update() {
    // 1. 독립 보간 (기존)
    for (let i = 0; i < this.birdSprites.length; i++) {
      sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);
      sprite.y = Phaser.Math.Linear(sprite.y, target.y * ratio, 0.3);
    }

+   // 2. 밧줄 제약 적용 (추가)
+   this.enforceClientRopeConstraint();

    // 3. 카메라, 파이프, 밧줄 그리기 (기존)
  }
```

---

## 검증 방법

1. **밧줄 시각 테스트**
   - 2인 플레이: 한 명만 점프 → 밧줄이 늘어나지 않는지 확인
   - 밧줄이 "고무줄"처럼 튀지 않고 자연스럽게 유지되는지

2. **부드러움 테스트**
   - 60fps 부드러운 애니메이션 유지 확인
   - 프레임 드랍 없는지 확인

3. **네트워크 지연 테스트**
   - 인위적 지연 추가 후에도 밧줄 제약이 시각적으로 유지되는지

---

## 필요 시 추가 조정

### 보간 계수 조정
밧줄이 너무 "탄성"처럼 보이면 보간 계수 조정:
```typescript
// 현재: 0.3 (30% 보간)
sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);

// 더 부드럽게: 0.2
sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.2);

// 더 즉각적: 0.5
sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.5);
```

### 밧줄 제약 반복 적용
한 번으로 부족하면 여러 번 반복:
```typescript
// 2~3회 반복으로 더 정확한 제약
for (let iter = 0; iter < 3; iter++) {
  this.enforceClientRopeConstraint();
}
```
