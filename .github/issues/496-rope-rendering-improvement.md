# [FlappyBird] 밧줄 렌더링 개선

> Parent Issue: #492

## 목표

물리적으로 정확하고 시각적으로 아름다운 밧줄 렌더링 구현

## 현재 상태

```typescript
// FlappyBirdsScene.ts - drawRopesFromSprites()
// 2차 베지어 곡선으로 단순 처짐 표현
const curve = new Phaser.Curves.QuadraticBezier(
  new Phaser.Math.Vector2(birdA.x, birdA.y),
  new Phaser.Math.Vector2(targetMidX, midPoint.y),
  new Phaser.Math.Vector2(birdB.x, birdB.y),
);

const points = curve.getPoints(16);
rope.strokePoints(points);
```

**현재 문제점:**

- 단순 베지어 곡선으로 실제 밧줄 처럼 보이지 않음
- 장력 상태 시각화 없음
- 밧줄 두께, 색상이 고정됨

## 구현 계획

### 1단계: Catenary 곡선 (현수선) 구현

```typescript
// 새 파일: RopeRenderer.ts
export class RopeRenderer {
  /**
   * 현수선(Catenary) 곡선 계산
   * 실제 중력에 의해 매달린 줄의 형태
   *
   * 수식: y = a * cosh((x - x0) / a) + c
   */
  static calculateCatenaryCurve(
    startPoint: Phaser.Math.Vector2,
    endPoint: Phaser.Math.Vector2,
    ropeLength: number,
    segments: number = 20,
  ): Phaser.Math.Vector2[] {
    const points: Phaser.Math.Vector2[] = [];

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const horizontalDistance = Math.sqrt(dx * dx + dy * dy);

    // 밧줄이 직선 거리보다 길면 처짐 발생
    if (ropeLength <= horizontalDistance) {
      // 밧줄이 팽팽함: 직선
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push(
          new Phaser.Math.Vector2(
            Phaser.Math.Linear(startPoint.x, endPoint.x, t),
            Phaser.Math.Linear(startPoint.y, endPoint.y, t),
          ),
        );
      }
    } else {
      // 밧줄이 느슨함: 현수선
      const slack = ropeLength - horizontalDistance;
      const sagDepth = Math.sqrt(slack * ropeLength) * 0.5;

      // 중간점이 가장 많이 처지는 현수선 근사
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = Phaser.Math.Linear(startPoint.x, endPoint.x, t);

        // 포물선 근사 (실제 현수선보다 계산이 간단)
        const sagFactor = 4 * t * (1 - t); // 0에서 1까지 갔다가 0으로
        const baseLine = Phaser.Math.Linear(startPoint.y, endPoint.y, t);
        const y = baseLine + sagDepth * sagFactor;

        points.push(new Phaser.Math.Vector2(x, y));
      }
    }

    return points;
  }
}
```

### 2단계: 장력 시각화

```typescript
interface RopeVisualState {
  tension: number;      // 0: 느슨, 1: 팽팽
  color: number;        // 장력에 따른 색상
  thickness: number;    // 장력에 따른 두께
  alpha: number;        // 투명도
}

static calculateRopeVisualState(
  distance: number,
  restLength: number,
  maxLength: number
): RopeVisualState {
  // 장력 계산 (0 ~ 1)
  const normalizedDistance = (distance - restLength) / (maxLength - restLength);
  const tension = Math.max(0, Math.min(1, normalizedDistance));

  // 느슨할 때: 갈색, 두꺼움
  // 팽팽할 때: 빨간색 기미, 얇음
  const baseColor = 0x8b4513; // 갈색
  const tensionColor = 0xff4444; // 빨간색

  // 색상 보간
  const r1 = (baseColor >> 16) & 0xff;
  const g1 = (baseColor >> 8) & 0xff;
  const b1 = baseColor & 0xff;

  const r2 = (tensionColor >> 16) & 0xff;
  const g2 = (tensionColor >> 8) & 0xff;
  const b2 = tensionColor & 0xff;

  const r = Math.floor(Phaser.Math.Linear(r1, r2, tension));
  const g = Math.floor(Phaser.Math.Linear(g1, g2, tension));
  const b = Math.floor(Phaser.Math.Linear(b1, b2, tension));

  const color = (r << 16) | (g << 8) | b;

  // 두께: 느슨할 때 6, 팽팽할 때 3
  const thickness = Phaser.Math.Linear(6, 3, tension);

  // 투명도: 항상 0.9
  const alpha = 0.9;

  return { tension, color, thickness, alpha };
}
```

### 3단계: 세그먼트 물리 시뮬레이션 (선택)

```typescript
// Verlet Integration을 사용한 밧줄 세그먼트 물리
class RopePhysicsSimulator {
  private points: Phaser.Math.Vector2[] = [];
  private prevPoints: Phaser.Math.Vector2[] = [];
  private readonly segmentCount: number = 10;

  constructor(startPoint: Phaser.Math.Vector2, endPoint: Phaser.Math.Vector2) {
    // 초기 포인트 설정
    for (let i = 0; i <= this.segmentCount; i++) {
      const t = i / this.segmentCount;
      this.points.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(startPoint.x, endPoint.x, t),
          Phaser.Math.Linear(startPoint.y, endPoint.y, t),
        ),
      );
      this.prevPoints.push(this.points[i].clone());
    }
  }

  update(
    startPoint: Phaser.Math.Vector2,
    endPoint: Phaser.Math.Vector2,
    dt: number,
  ): Phaser.Math.Vector2[] {
    const gravity = 0.5;
    const segmentLength = this.ropeLength / this.segmentCount;

    // 끝점 고정
    this.points[0].copy(startPoint);
    this.points[this.segmentCount].copy(endPoint);

    // Verlet Integration
    for (let i = 1; i < this.segmentCount; i++) {
      const current = this.points[i];
      const prev = this.prevPoints[i];

      // 속도 = 현재 - 이전
      const vx = current.x - prev.x;
      const vy = current.y - prev.y;

      // 이전 위치 저장
      prev.copy(current);

      // 새 위치 = 현재 + 속도 + 중력
      current.x += vx * 0.98; // 감쇠
      current.y += vy * 0.98 + gravity;
    }

    // 거리 제약 적용 (여러 번 반복해서 안정화)
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < this.segmentCount; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const diff = (distance - segmentLength) / distance;
          const offsetX = dx * diff * 0.5;
          const offsetY = dy * diff * 0.5;

          // 끝점이 아니면 이동
          if (i !== 0) {
            p1.x += offsetX;
            p1.y += offsetY;
          }
          if (i !== this.segmentCount - 1) {
            p2.x -= offsetX;
            p2.y -= offsetY;
          }
        }
      }
    }

    return this.points;
  }
}
```

### 4단계: 효과 추가

```typescript
// 장력 변화 시 떨림 효과
private addTensionVibration(
  points: Phaser.Math.Vector2[],
  tensionChange: number
): void {
  if (Math.abs(tensionChange) < 0.1) return;

  const vibrationAmount = Math.min(5, Math.abs(tensionChange) * 10);

  for (let i = 1; i < points.length - 1; i++) {
    // 수직 방향으로 랜덤 진동
    points[i].y += (Math.random() - 0.5) * vibrationAmount;
  }
}

// 그림자 효과
private drawRopeShadow(
  graphics: Phaser.GameObjects.Graphics,
  points: Phaser.Math.Vector2[],
  thickness: number
): void {
  graphics.lineStyle(thickness + 2, 0x000000, 0.3);

  const shadowOffset = 3;
  const shadowPoints = points.map(p =>
    new Phaser.Math.Vector2(p.x + shadowOffset, p.y + shadowOffset)
  );

  graphics.strokePoints(shadowPoints);
}
```

## 최종 렌더링 메서드

```typescript
private drawRopesFromSprites(): void {
  const ratio = this.getRatio();

  for (let i = 0; i < this.ropes.length; i++) {
    const rope = this.ropes[i];
    const [indexA, indexB] = this.ropeConnections[i];
    const birdA = this.birdSprites[indexA];
    const birdB = this.birdSprites[indexB];

    if (!birdA || !birdB) continue;

    // 거리 계산
    const distance = Phaser.Math.Distance.Between(
      birdA.x, birdA.y, birdB.x, birdB.y
    );

    // 시각 상태 계산
    const visualState = RopeRenderer.calculateRopeVisualState(
      distance,
      this.gameConfig.ropeLength * ratio * 0.7,
      this.gameConfig.ropeLength * ratio
    );

    // 현수선 계산
    const points = RopeRenderer.calculateCatenaryCurve(
      new Phaser.Math.Vector2(birdA.x, birdA.y),
      new Phaser.Math.Vector2(birdB.x, birdB.y),
      this.gameConfig.ropeLength * ratio,
      20
    );

    rope.clear();

    // 그림자
    this.drawRopeShadow(rope, points, visualState.thickness * ratio);

    // 메인 밧줄
    rope.lineStyle(
      visualState.thickness * ratio,
      visualState.color,
      visualState.alpha
    );
    rope.strokePoints(points);
  }
}
```

## 테스트 케이스

- [ ] 밧줄이 느슨할 때 자연스러운 처짐 확인
- [ ] 밧줄이 팽팽할 때 거의 직선 + 색상 변화 확인
- [ ] 빠른 움직임 시 밧줄이 자연스럽게 흔들림
- [ ] 4인 플레이 시 모든 밧줄 정상 렌더링

## 파일 수정/추가

- 새 파일: `packages/client/src/game/scene/flappybirds/RopeRenderer.ts`
- `packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`
  - `drawRopesFromSprites()` 수정
  - RopeRenderer 사용

## Labels

`enhancement`, `game:flappybird`, `visual`, `client`
