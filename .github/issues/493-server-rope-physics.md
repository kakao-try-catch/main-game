# [FlappyBird] 서버 밧줄 물리 고도화

> Parent Issue: #492

## 목표

**서버 물리를 클라이언트 렌더링과 일치**시켜 탄성과 댐핑이 있는 자연스러운 밧줄 구현

## 현재 상태

### 서버 (FlappyBirdInstance.ts) - Hard Constraint

```typescript
// 현재: 거리가 ropeLength를 초과할 때만 작동
private enforceRopeConstraint(): void {
  for (const [indexA, indexB] of this.ropeConnections) {
    if (distance > this.ropeLength) {
      // 위치를 강제로 당김 (딱딱함)
      // 속도 보정
    }
  }
}
```

### 클라이언트 (FlappyBirdsScene.ts) - Spring-Damper 렌더링

```typescript
// 시각적 효과만 (실제 물리 아님)
private drawRopesFromSprites() {
  const GRAVITY = 1.5 * ratio;
  const STIFFNESS = 0.3;
  const DAMPING = 0.8;

  // 중간점에 관성 물리 적용
  const ay = (targetMidY - midPoint.y) * STIFFNESS + GRAVITY;
  midPoint.vy = (midPoint.vy + ay) * DAMPING;
  midPoint.y += midPoint.vy;
}
```

**문제점**:

- 서버: 딱딱한 하드 제약 (탄성 없음)
- 클라이언트: 부드러운 렌더링 (물리 아님)
- **서버와 클라이언트 불일치** → 서버를 클라이언트에 맞춰야 함

## 구현 계획

### 1단계: 스프링-댐퍼 모델 적용 (클라이언트와 동일한 느낌)

**목표**: 클라이언트의 시각적 효과를 서버 물리로 구현

```typescript
interface RopePhysics {
  stiffness: number; // 스프링 강성
  damping: number; // 감쇠 계수
  restLength: number; // 자연 길이 (ropeLength의 70%)
  maxLength: number; // 최대 길이 (ropeLength)
}
```

### 2단계: 힘 계산 공식 (클라이언트 렌더링 기반)

**클라이언트 값 참고**:

- `STIFFNESS = 0.3` (복원력)
- `DAMPING = 0.8` (감쇠)
- `GRAVITY = 1.5` (밧줄 자체 중력)

```typescript
/**
 * Hooke's Law + Damping Force
 * 클라이언트 렌더링과 동일한 느낌을 주기 위해 조정
 */
private applyRopeSpringForce(): void {
  // 클라이언트와 유사한 값 사용
  const restLength = this.ropeLength * 0.7;

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

    // 스프링 힘 (클라이언트 STIFFNESS 기반)
    const displacement = distance - restLength;
    const springForce = this.stiffness * displacement;

    // 감쇠 힘 (클라이언트 DAMPING 기반)
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
// config.ts
export type RopeStiffnessPreset = 'soft' | 'normal' | 'stiff';

export interface FlappyBirdGamePreset {
  // 기존 설정...
  ropeStiffness?: RopeStiffnessPreset;
}

// 클라이언트 렌더링 값을 기준으로 조정
const stiffnessValues = {
  soft: { stiffness: 0.0001, damping: 0.05 },
  normal: { stiffness: 0.0003, damping: 0.1 }, // 클라이언트와 유사
  stiff: { stiffness: 0.0005, damping: 0.15 },
};
```

### 4단계: 기존 제약 유지 (안전장치)

```typescript
// 스프링 힘 + 하드 제약 (밧줄 끊어짐 방지)
private enforceRopeConstraint(): void {
  // 1. 스프링 힘 적용 (클라이언트 느낌)
  this.applyRopeSpringForce();

  // 2. 최대 길이 하드 제약 (안전장치)
  for (const [indexA, indexB] of this.ropeConnections) {
    if (distance > this.ropeLength) {
      // 위치/속도 보정
    }
  }
}
```

## 테스트 케이스

- [ ] 두 새가 가까이 있을 때 밧줄이 느슨함 (힘 거의 없음)
- [ ] 두 새가 자연 길이 이상 멀어지면 서로 당기는 힘 발생
- [ ] 급격한 이동 시 적절한 감쇠로 진동이 빠르게 수렴
- [ ] 최대 길이 초과 시 하드 제약 작동
- [ ] **클라이언트 렌더링과 서버 물리가 일치하는 느낌**

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
