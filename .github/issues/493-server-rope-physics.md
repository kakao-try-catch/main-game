# [FlappyBird] 서버 밧줄 물리 고도화

> Parent Issue: #492

## 목표

현재 단순 거리 제한 방식의 밧줄을 탄성과 댐핑이 있는 진짜 물리 기반 밧줄로 개선

## 현재 상태

```typescript
// FlappyBirdInstance.ts - enforceRopeConstraint()
// 현재: 거리가 ropeLength를 초과하면 양쪽 새를 당김
private enforceRopeConstraint(): void {
  for (const [indexA, indexB] of this.ropeConnections) {
    const birdA = this.birds[indexA];
    const birdB = this.birds[indexB];
    // ...
    if (distance > this.ropeLength) {
      // 위치 보정
      // 속도 보정
    }
  }
}
```

**문제점:**

- 밧줄이 최대 길이를 초과할 때만 작동
- 스프링처럼 탄성 있는 느낌이 없음
- 진동이나 자연스러운 흔들림이 없음

## 구현 계획

### 1단계: 스프링-댐퍼 모델 적용

```typescript
interface RopePhysics {
  stiffness: number; // 스프링 강성 (0.1 ~ 1.0)
  damping: number; // 감쇠 계수 (0.05 ~ 0.2)
  restLength: number; // 자연 길이 (ropeLength의 70%)
  maxLength: number; // 최대 길이 (끊어지는 길이)
}
```

### 2단계: 힘 계산 공식

```typescript
/**
 * Hooke's Law + Damping Force
 * F = -k * (x - x0) - c * v
 *
 * k: 스프링 상수 (stiffness)
 * x: 현재 거리
 * x0: 자연 길이 (restLength)
 * c: 감쇠 계수 (damping)
 * v: 상대 속도
 */
private applyRopeSpringForce(): void {
  for (const [indexA, indexB] of this.ropeConnections) {
    const birdA = this.birds[indexA];
    const birdB = this.birds[indexB];

    const dx = birdB.position.x - birdA.position.x;
    const dy = birdB.position.y - birdA.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) continue;

    // 단위 벡터
    const nx = dx / distance;
    const ny = dy / distance;

    // 스프링 힘 (자연 길이에서 벗어난 정도에 비례)
    const displacement = distance - this.restLength;
    const springForce = this.stiffness * displacement;

    // 감쇠 힘 (상대 속도의 밧줄 방향 성분)
    const relVx = birdB.velocity.x - birdA.velocity.x;
    const relVy = birdB.velocity.y - birdA.velocity.y;
    const relVelAlongRope = relVx * nx + relVy * ny;
    const dampingForce = this.damping * relVelAlongRope;

    // 총 힘
    const totalForce = springForce + dampingForce;

    // 각 새에 힘 적용 (반대 방향)
    const forceX = totalForce * nx;
    const forceY = totalForce * ny;

    Matter.Body.applyForce(birdA, birdA.position, {
      x: forceX * 0.5,
      y: forceY * 0.5
    });
    Matter.Body.applyForce(birdB, birdB.position, {
      x: -forceX * 0.5,
      y: -forceY * 0.5
    });
  }
}
```

### 3단계: 설정 프리셋 추가

```typescript
// config.ts에 추가
export type RopeStiffnessPreset = 'soft' | 'normal' | 'stiff';

export interface FlappyBirdGamePreset {
  // 기존 설정...
  ropeStiffness?: RopeStiffnessPreset;
}

// resolveFlappyBirdPreset() 수정
const stiffnessValues = {
  soft: { stiffness: 0.0001, damping: 0.05 },
  normal: { stiffness: 0.0003, damping: 0.1 },
  stiff: { stiffness: 0.0005, damping: 0.15 },
};
```

### 4단계: 기존 제약 유지 (최대 길이)

```typescript
// 스프링 힘 + 하드 제약 (밧줄 끊어짐 방지)
private enforceRopeConstraint(): void {
  // 1. 스프링 힘 적용
  this.applyRopeSpringForce();

  // 2. 최대 길이 하드 제약 (기존 코드 유지)
  for (const [indexA, indexB] of this.ropeConnections) {
    // ... 최대 길이 초과 시 위치/속도 보정
  }
}
```

## 테스트 케이스

- [ ] 두 새가 가까이 있을 때 밧줄이 느슨함 (힘 거의 없음)
- [ ] 두 새가 자연 길이 이상 멀어지면 서로 당기는 힘 발생
- [ ] 급격한 이동 시 적절한 감쇠로 진동이 빠르게 수렴
- [ ] 최대 길이 초과 시 하드 제약 작동
- [ ] 프리셋(soft/normal/stiff) 변경 시 체감 차이 확인

## 파일 수정

- `packages/server/src/games/instances/FlappyBirdInstance.ts`
  - `applyRopeSpringForce()` 메서드 추가
  - `enforceRopeConstraint()` 수정
  - 스프링 관련 속성 추가
- `packages/common/src/config.ts`
  - `RopeStiffnessPreset` 타입 추가
  - `FlappyBirdGamePreset` 인터페이스 수정
  - `resolveFlappyBirdPreset()` 함수 수정

## Labels

`enhancement`, `game:flappybird`, `physics`, `server`
