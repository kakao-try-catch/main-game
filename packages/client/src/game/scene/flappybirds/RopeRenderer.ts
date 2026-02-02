import Phaser from 'phaser';

export interface RopeVisualState {
  tension: number; // 0: 느슨, 1: 팽팽
  color: number; // 장력에 따른 색상
  thickness: number; // 장력에 따른 두께
  alpha: number; // 투명도
}

export class RopeRenderer {
  /**
   * 현수선(Catenary) 곡선 계산
   * 실제 중력에 의해 매달린 줄의 형태
   *
   * 수식: y = a * cosh((x - x0) / a) + c 근사
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
      // 밧줄이 느슨함: 현수선 (포물선 근사)
      const slack = ropeLength - horizontalDistance;
      // 처짐 깊이 계산
      const sagDepth = Math.sqrt(slack * ropeLength) * 0.5;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = Phaser.Math.Linear(startPoint.x, endPoint.x, t);

        // 포물선 근사 (0에서 시작하여 중간에서 sagDepth만큼 갔다가 다시 0으로)
        const sagFactor = 4 * t * (1 - t);
        const baseLineY = Phaser.Math.Linear(startPoint.y, endPoint.y, t);
        const y = baseLineY + sagDepth * sagFactor;

        points.push(new Phaser.Math.Vector2(x, y));
      }
    }

    return points;
  }

  /**
   * 장력에 따른 시각적 상태 계산
   */
  static calculateRopeVisualState(
    distance: number,
    restLength: number,
    maxLength: number,
  ): RopeVisualState {
    // 장력 계산 (0 ~ 1)
    // restLength(약 70%)에서 maxLength(100%) 사이에서 변화
    const normalizedDistance =
      (distance - restLength) / (maxLength - restLength);
    const tension = Math.max(0, Math.min(1, normalizedDistance));

    // 느슨할 때: 갈색 (0x8B4513)
    // 팽팽할 때: 빨간색 기미 (0xFF4444)
    const baseColor = 0x8b4513;
    const tensionColor = 0xff4444;

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

    // 투명도
    const alpha = 0.9;

    return { tension, color, thickness, alpha };
  }
}
