# [FlappyBird] 사운드 및 이펙트 추가

> Parent Issue: #492

## 목표

밧줄 상호작용과 멀티플레이 특성을 반영한 사운드/이펙트

## 구현 계획

### 1단계: 사운드 효과

```typescript
// 기존 사운드
FLAP = 'flappyJump'; // 점프
SCORE = 'flappyScore'; // 점수 획득
CRASH = 'flappybirdStrike'; // 충돌

// 신규 사운드
ROPE_TENSION = 'ropeStretch'; // 밧줄 팽팽해질 때
ROPE_SNAP = 'ropeSnap'; // 밧줄 최대 장력
TEAM_SYNC = 'teamSync'; // 동시 점프 시
```

### 2단계: 시각 이펙트

```typescript
class FlappyEffects {
  // 점프 시 파티클 (깃털)
  createJumpParticles(bird: Phaser.GameObjects.Sprite): void;

  // 밧줄 장력 이펙트 (떨림, 색상)
  showRopeTensionEffect(tension: number): void;

  // 점수 획득 팝업 (+1)
  createScorePopup(position: Vector2): void;

  // 충돌 이펙트 (폭발, 깃털 흩날림)
  createCrashEffect(bird: Phaser.GameObjects.Sprite): void;
}
```

### 3단계: 화면 흔들림

```typescript
// 충돌 시
onCollision(): void {
  this.cameras.main.shake(200, 0.01);
}

// 동시 점프 시 (작은 흔들림)
onSyncJump(): void {
  this.cameras.main.shake(100, 0.005);
}
```

### 4단계: 사운드 매니저

```typescript
class FlappySoundManager {
  private lastRopeTensionSound = 0;

  playRopeTension(tension: number): void {
    // 0.5초 쿨다운
    if (Date.now() - this.lastRopeTensionSound < 500) return;
    if (tension > 0.8) {
      this.play('ropeStretch');
      this.lastRopeTensionSound = Date.now();
    }
  }

  playJump(): void {
    this.play('flappyJump');
  }

  playSyncJump(playerCount: number): void {
    if (playerCount >= 2) {
      this.play('teamSync');
    }
  }
}
```

## 필요 에셋

| 파일명                 | 설명                |
| ---------------------- | ------------------- |
| `ropeStretch.mp3`      | 밧줄 당기는 소리    |
| `ropeSnap.mp3`         | 밧줄 최대 장력 소리 |
| `teamSync.mp3`         | 동시 점프 효과음    |
| `feather_particle.png` | 깃털 파티클 (선택)  |

## 테스트 케이스

- [ ] 점프 시 사운드 재생 확인
- [ ] 밧줄 팽팽해질 때 사운드 재생 확인
- [ ] 동시 점프 시 보너스 사운드 확인
- [ ] 충돌 시 화면 흔들림 확인
- [ ] 사운드 중복 재생 방지 확인

## 파일 수정/추가

- `packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`
- 신규: `packages/client/src/game/scene/flappybirds/FlappyEffects.ts`
- 신규: `packages/client/src/game/scene/flappybirds/FlappySoundManager.ts`
- 에셋: `packages/client/src/assets/sounds/SFX/`

## Labels

`enhancement`, `game:flappybird`, `audio`, `visual`
