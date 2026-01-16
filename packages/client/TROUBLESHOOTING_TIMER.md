# 🔧 타이머 탭 전환 문제 해결

## 📌 문제 상황

**증상**: 게임 타이머 동작 중 브라우저 탭을 전환하면 타이머 렌더링이 멈추거나 느려지는 현상

**원인**: Phaser의 `Tween`과 `TimerEvent`가 `requestAnimationFrame`에 의존하는데, 브라우저가 비활성 탭의 RAF를 throttle(1fps 이하로 제한)하기 때문

---

## ✅ 해결 방법

### 핵심 전략
**Timestamp 기반 타이머 + Visibility Change 이벤트 감지**

### 구현 개요

```typescript
// 1. 실제 시간(timestamp) 기반으로 경과 시간 계산
const elapsed = (Date.now() - startTimestamp - pausedDuration) / 1000;
remainingTime = totalTime - elapsed;

// 2. Visibility Change 이벤트로 탭 전환 감지
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        syncTimer(); // 탭 복귀 시 즉시 동기화
    }
});

// 3. 60fps로 부드러운 업데이트
scene.time.addEvent({ delay: 16, callback: update, loop: true });
```

---

## 🔍 상세 구현

### 1. Timestamp 기반 시간 추적

**변경 전** (Tween 의존):
```typescript
this.barTween = this.scene.tweens.add({
    targets: this.timerPrefab.getBar(),
    scaleY: 0,
    duration: totalSeconds * 1000,
    ease: 'Linear'
});
```

**변경 후** (Timestamp 기반):
```typescript
this.startTimestamp = Date.now();

// 매 프레임 업데이트
private update(): void {
    const elapsed = (Date.now() - this.startTimestamp - this.totalPausedDuration) / 1000;
    this.remainingTime = Math.max(0, this.totalTime - elapsed);
    this.timerPrefab.setBarScale(this.ratio);
}
```

### 2. Visibility Change 감지

```typescript
private setupVisibilityListener(): void {
    this.visibilityChangeHandler = () => {
        if (!document.hidden && !this.isFinished && !this.isPaused) {
            this.syncTimer(); // 탭 복귀 시 동기화
        }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
}

private syncTimer(): void {
    const now = Date.now();
    const elapsed = (now - this.startTimestamp - this.totalPausedDuration) / 1000;
    this.remainingTime = Math.max(0, this.totalTime - elapsed);
    this.timerPrefab.setBarScale(this.ratio);
    this.updateBarColor();
}
```

### 3. 일시정지 처리

```typescript
pause(): void {
    this.isPaused = true;
    this.pausedTimestamp = Date.now(); // 일시정지 시작 시간 기록
}

resume(): void {
    this.isPaused = false;
    const pauseDuration = Date.now() - this.pausedTimestamp;
    this.totalPausedDuration += pauseDuration; // 누적
}
```

---

## 📊 비교

| 항목 | 기존 (Tween) | 개선 (Timestamp) |
|------|-------------|-----------------|
| **탭 전환 시** | ❌ 타이머 멈춤/느려짐 | ✅ 정확히 동작 |
| **탭 복귀 시** | ❌ 느린 시간으로 계속 진행 | ✅ 즉시 실제 시간으로 동기화 |
| **정확도** | ⚠️ RAF에 의존 (불안정) | ✅ 시스템 시간 기반 (정확) |
| **성능** | ✅ Tween 엔진 최적화 | ✅ 60fps 유지 |
| **코드 복잡도** | 낮음 | 중간 |

---

## 🧪 테스트 방법

1. 게임 시작 후 타이머 확인 (예: 120초)
2. 다른 탭으로 전환 (10초 대기)
3. 게임 탭으로 복귀
4. **예상 결과**: 타이머가 약 110초로 정확히 표시됨
5. **콘솔 확인**: `▶️ 탭 활성화 - 타이머 동기화 완료` 로그 출력

---

## ⚠️ 주의사항

### 1. 메모리 누수 방지
```typescript
destroy(): void {
    // Visibility 리스너 반드시 제거
    if (this.visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
}
```

### 2. 일시정지 시간 누적
- 일시정지 시간을 `totalPausedDuration`에 누적하여 정확한 경과 시간 계산
- 단순히 `pause()`/`resume()` 호출만으로는 부족

### 3. 초 단위 이벤트 최적화
```typescript
// 매 프레임 이벤트 발생 방지 (성능 저하)
const currentSecond = Math.ceil(this.remainingTime);
if (currentSecond !== this.lastSecond) {
    this.scene.events.emit(TimerEvents.TICK, this.remainingTime);
}
```

---

## 🔄 대안 방법 (검토했으나 채택하지 않음)

### 1. Web Worker
- **장점**: 백그라운드에서 완전히 독립적으로 동작
- **단점**: Phaser 객체 접근 불가, 메시지 통신 오버헤드
- **결론**: 과도한 복잡도 대비 이점 적음

### 2. Server-side Timer
- **장점**: 완벽한 동기화
- **단점**: 네트워크 지연, 서버 부하
- **결론**: 현재 클라이언트 단독 게임에는 불필요

### 3. setInterval
- **장점**: 구현 간단
- **단점**: 탭 비활성화 시 여전히 throttle됨
- **결론**: 근본적 해결 안됨

---

## 📍 수정 파일

- **`src/game/utils/TimerSystem.ts`** (전체 재구현)
  - Tween → Timestamp 기반 계산
  - Visibility Change 리스너 추가
  - 일시정지 로직 개선

---

## 📚 참고 자료

- [Page Visibility API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [requestAnimationFrame throttling - Chrome Developers](https://developer.chrome.com/blog/background-tabs/)
- [Phaser Time Events](https://photonstorm.github.io/phaser3-docs/Phaser.Time.TimerEvent.html)

---

**작성일**: 2026-01-16  
**수정자**: 개발팀  
**관련 이슈**: 타이머 탭 전환 문제
