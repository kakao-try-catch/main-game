# 멀티플레이 협동 플래피버드 - 서버 API 명세서

## 개요

이 문서는 4인 협동 플래피버드 게임의 서버-클라이언트 통신 규격을 정의합니다.
서버는 **Authoritative Server** 방식으로 모든 물리 연산을 담당하며, 클라이언트는 렌더링만 수행합니다.

---

## 기술 스택

- **통신 프로토콜:** Socket.io
- **물리 엔진:** Matter.js (서버 측)
- **업데이트 주기:** 60fps (16.67ms 간격)

---

## 연결 (Connection)

### 클라이언트 → 서버 연결

```typescript
const socket = io('http://your-server-url:3000');
```

### 연결 성공 이벤트

**이벤트명:** `connected`

**서버 → 클라이언트**

```typescript
{
  playerId: string;        // 할당된 플레이어 ID (0-3)
  roomId: string;          // 방 ID
  playerCount: number;     // 현재 접속자 수
}
```

**설명:**
- 클라이언트가 서버에 연결되면 고유한 `playerId`가 할당됩니다.
- `playerId`는 0~3 사이의 값으로, 4명의 새 중 어떤 새를 조작할지 결정합니다.

---

## 게임 상태 관리

### 게임 준비 상태

**이벤트명:** `player_ready`

**클라이언트 → 서버**

```typescript
{
  playerId: string;
  ready: boolean;
}
```

**설명:**
- 플레이어가 게임 시작 준비가 되었음을 알립니다.
- 4명 모두 `ready: true`가 되면 게임이 시작됩니다.

---

### 게임 시작

**이벤트명:** `game_start`

**서버 → 클라이언트**

```typescript
{
  timestamp: number;       // 게임 시작 시각 (Unix timestamp)
  initialPositions: {
    playerId: string;
    x: number;
    y: number;
  }[];
}
```

**설명:**
- 4명 모두 준비되면 서버가 게임을 시작합니다.
- 각 새의 초기 위치를 전달합니다.

---

## 게임 플레이

### Flap (점프) 입력

**이벤트명:** `flap`

**클라이언트 → 서버**

```typescript
{
  playerId: string;
  timestamp: number;       // 클라이언트 타임스탬프 (레이턴시 보상용)
}
```

**설명:**
- 플레이어가 스페이스바 또는 클릭 시 서버로 전송됩니다.
- 서버는 해당 플레이어의 새에 위쪽 힘을 적용합니다.

---

### 위치 업데이트

**이벤트명:** `update_positions`

**서버 → 클라이언트**

```typescript
{
  timestamp: number;       // 서버 타임스탬프
  birds: {
    playerId: string;
    x: number;             // 새의 X 좌표 (픽셀)
    y: number;             // 새의 Y 좌표 (픽셀)
    velocityX: number;     // X 방향 속도
    velocityY: number;     // Y 방향 속도
    angle: number;         // 회전 각도 (도)
  }[];
  ropes: {
    points: {
      x: number;
      y: number;
    }[];                   // 밧줄 정점 배열 (각 밧줄당 10개 정점)
  }[];
}
```

**설명:**
- 서버가 60fps로 물리 연산 후 모든 클라이언트에게 브로드캐스트합니다.
- `birds` 배열은 4개의 새 정보를 포함합니다.
- `ropes` 배열은 3개의 밧줄 정보를 포함합니다 (Bird[0]↔Bird[1], Bird[1]↔Bird[2], Bird[2]↔Bird[3]).
- 클라이언트는 이 데이터를 기반으로 화면을 렌더링합니다.

---

### 점수 업데이트

**이벤트명:** `score_update`

**서버 → 클라이언트**

```typescript
{
  score: number;           // 현재 점수
  timestamp: number;
}
```

**설명:**
- 새가 파이프를 통과할 때마다 점수가 증가합니다.
- 모든 플레이어에게 동일한 점수가 적용됩니다 (협동 게임).

---

### 게임 오버

**이벤트명:** `game_over`

**서버 → 클라이언트**

```typescript
{
  reason: 'pipe_collision' | 'ground_collision';  // 게임 오버 원인
  finalScore: number;                              // 최종 점수
  collidedPlayerId: string;                        // 충돌한 플레이어 ID
  timestamp: number;
}
```

**설명:**
- 어떤 새든 파이프나 바닥에 충돌하면 게임이 종료됩니다.
- `collidedPlayerId`는 충돌을 일으킨 플레이어를 나타냅니다.

---

### 게임 재시작

**이벤트명:** `restart_game`

**클라이언트 → 서버**

```typescript
{
  playerId: string;
}
```

**설명:**
- 게임 오버 후 재시작을 요청합니다.
- 4명 모두 재시작을 요청하면 게임이 초기화됩니다.

---

## 물리 엔진 파라미터

서버 측 Matter.js 설정 값입니다. 프론트엔드 MockServerCore 구현 시 동일한 값을 사용해야 합니다.

### 중력 설정

```typescript
{
  gravity: {
    x: 0,
    y: 0.8                 // 중력 가속도
  }
}
```

### 새 (Bird) Body 설정

```typescript
{
  shape: 'circle',
  radius: 20,              // 새의 반지름 (픽셀)
  density: 0.001,          // 밀도
  restitution: 0,          // 탄성 (튕기지 않음)
  friction: 0,             // 마찰 없음
  frictionAir: 0.01,       // 공기 저항
  collisionFilter: {
    category: 0x0001,      // CATEGORY_BIRD
    mask: 0x0002 | 0x0004  // PIPE | GROUND
  }
}
```

### Flap 힘

```typescript
{
  flapVelocity: -8         // 위로 튀어오르는 속도 (음수 = 위쪽)
}
```

### 체인 (Chain) Constraint 설정

```typescript
{
  length: 100,             // 밧줄 길이 (픽셀)
  stiffness: 0.4,          // 강성 (0~1)
  damping: 0.1             // 감쇠
}
```

### 파이프 (Pipe) 설정

```typescript
{
  width: 80,               // 파이프 너비
  gap: 200,                // 위아래 파이프 사이 간격
  spawnInterval: 2000,     // 파이프 생성 간격 (ms)
  speed: 3                 // 파이프 이동 속도 (픽셀/프레임)
}
```

---

## 충돌 카테고리

```typescript
const CATEGORY_BIRD = 0x0001;
const CATEGORY_PIPE = 0x0002;
const CATEGORY_GROUND = 0x0004;
const CATEGORY_SENSOR = 0x0008;  // 점수 획득 영역
```

**충돌 규칙:**
- 새 ↔ 새: 충돌하지 않음
- 새 ↔ 파이프: 충돌 감지 → 게임 오버
- 새 ↔ 바닥: 충돌 감지 → 게임 오버
- 새 ↔ 센서: 충돌 감지 → 점수 증가

---

## 에러 처리

### 연결 에러

**이벤트명:** `error`

**서버 → 클라이언트**

```typescript
{
  code: string;            // 에러 코드
  message: string;         // 에러 메시지
}
```

**에러 코드:**
- `ROOM_FULL`: 방이 가득 참 (4명 초과)
- `GAME_IN_PROGRESS`: 게임이 이미 진행 중
- `INVALID_PLAYER_ID`: 잘못된 플레이어 ID

---

## 구현 예시 (서버 측)

### Node.js + Socket.io + Matter.js

```typescript
import { Server } from 'socket.io';
import Matter from 'matter-js';

const io = new Server(3000);
const engine = Matter.Engine.create();
const world = engine.world;

// 중력 설정
engine.gravity.y = 0.8;

// 새 생성
const birds = [];
for (let i = 0; i < 4; i++) {
  const bird = Matter.Bodies.circle(100 + i * 100, 300, 20, {
    density: 0.001,
    restitution: 0,
    friction: 0,
    frictionAir: 0.01,
    label: 'bird',
    collisionFilter: {
      category: 0x0001,
      mask: 0x0002 | 0x0004
    }
  });
  birds.push(bird);
  Matter.World.add(world, bird);
}

// 체인 연결
for (let i = 0; i < 3; i++) {
  const constraint = Matter.Constraint.create({
    bodyA: birds[i],
    bodyB: birds[i + 1],
    length: 100,
    stiffness: 0.4,
    damping: 0.1
  });
  Matter.World.add(world, constraint);
}

// 물리 업데이트 루프 (60fps)
setInterval(() => {
  Matter.Engine.update(engine, 1000 / 60);
  
  // 위치 데이터 브로드캐스트
  const positions = birds.map((bird, index) => ({
    playerId: String(index),
    x: bird.position.x,
    y: bird.position.y,
    velocityX: bird.velocity.x,
    velocityY: bird.velocity.y,
    angle: bird.angle * (180 / Math.PI)
  }));
  
  io.emit('update_positions', {
    timestamp: Date.now(),
    birds: positions,
    ropes: [] // 밧줄 정점 계산 로직 추가 필요
  });
}, 1000 / 60);

// Flap 이벤트 처리
io.on('connection', (socket) => {
  socket.on('flap', (data) => {
    const bird = birds[parseInt(data.playerId)];
    Matter.Body.setVelocity(bird, {
      x: bird.velocity.x,
      y: -8
    });
  });
});
```

---

## 참고 사항

1. **레이턴시 보상:** 클라이언트는 선형 보간(Linear Interpolation)을 사용하여 부드러운 움직임을 구현해야 합니다.
2. **동기화:** 서버 타임스탬프를 기준으로 클라이언트 시간을 동기화하는 것을 권장합니다.
3. **최적화:** 밧줄 정점은 10개 이하로 유지하여 데이터 전송량을 최소화합니다.
4. **보안:** 클라이언트에서 받은 입력은 서버에서 검증해야 합니다 (예: Flap 쿨다운 체크).
