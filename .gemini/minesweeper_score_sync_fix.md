# 지뢰찾기 멀티플레이어 점수 동기화 버그 수정

## 문제 설명

멀티플레이어 지뢰찾기에서 어떤 플레이어의 씬이 늦게 로딩되었을 때, 다른 플레이어들의 변한 점수가 업데이트되지 않는 버그가 있었습니다.

### 증상

- 로딩되기 전에 이미 열린 타일은 잘 동기화되어 보임
- 하지만 점수창은 업데이트되지 않음
- 해당 플레이어가 새로운 클릭을 하기 전까지 로딩 전에 있었던 점수 변화가 표시되지 않음

## 근본 원인

### 1. MS_GAME_INIT 패킷 처리 문제

`clientHandler.ts`의 `handleMSGameInit` 함수가 모든 플레이어의 점수를 무조건 0으로 초기화했습니다.

```typescript
// 기존 코드 (버그)
function handleMSGameInit(packet: MSGameInitPacket): void {
  // 리플레이 시 플레이어 점수 초기화
  const store = useGameStore.getState();
  store.setPlayers((prev: PlayerData[]) =>
    prev.map((player: PlayerData) => ({
      ...player,
      reportCard: { ...player.reportCard, score: 0 }, // ❌ 항상 0으로 초기화
    })),
  );
  // ...
}
```

이 함수는 두 가지 상황에서 호출됩니다:

1. **게임 시작/리플레이**: 모든 플레이어에게 브로드캐스트 (점수 0이 맞음)
2. **씬 로딩 완료 후 동기화**: 늦게 로딩된 플레이어가 `MS_REQUEST_SYNC`를 보내면 서버가 현재 게임 상태를 응답 (현재 점수를 받아야 함)

서버는 이미 올바르게 현재 점수를 `packet.players`에 담아서 보내고 있었지만, 클라이언트가 이를 무시하고 0으로 덮어쓰고 있었습니다.

### 2. MS_SCORE_UPDATE 패킷 처리 문제

`handleMSScoreUpdate` 함수가 gameStore를 업데이트하지 않았습니다.

```typescript
// 기존 코드 (불완전)
function handleMSScoreUpdate(packet: MSScoreUpdatePacket): void {
  const event = new CustomEvent('ms:score_update', { detail: packet });
  window.dispatchEvent(event); // ❌ MineSweeperScene에만 전달, gameStore는 업데이트 안 함
}
```

PlayerCard UI는 gameStore의 데이터를 읽기 때문에, gameStore가 업데이트되지 않으면 UI에 점수 변화가 반영되지 않습니다.

## 해결 방법

### 1. handleMSGameInit 수정

서버에서 받은 점수 데이터를 실제로 적용하도록 수정:

```typescript
function handleMSGameInit(packet: MSGameInitPacket): void {
  // 서버에서 받은 플레이어 점수로 업데이트 (동기화)
  // 리플레이 시에는 모든 점수가 0으로 오고, 씬 로딩 중에는 현재 점수가 옴
  const store = useGameStore.getState();

  // packet.players를 playerId 기준으로 맵핑
  const serverScores = new Map<string, number>();
  packet.players.forEach((p) => {
    serverScores.set(p.playerId, p.score);
  });

  // 현재 플레이어 목록의 점수를 서버 데이터로 업데이트
  store.setPlayers((prev: PlayerData[]) =>
    prev.map((player: PlayerData) => ({
      ...player,
      reportCard: {
        ...player.reportCard,
        score: serverScores.get(player.id) ?? 0, // ✅ 서버 점수 사용
      },
    })),
  );

  // 게임 씬으로 이벤트 전달 (MineSweeperScene에서 수신)
  const event = new CustomEvent('ms:game_init', { detail: packet });
  window.dispatchEvent(event);
}
```

### 2. handleMSScoreUpdate 수정

gameStore도 함께 업데이트하도록 수정 (Apple 게임과 동일한 패턴):

```typescript
function handleMSScoreUpdate(packet: MSScoreUpdatePacket): void {
  // gameStore의 플레이어 점수 업데이트 (PlayerCard UI 동기화)
  const store = useGameStore.getState();
  store.setPlayers((prev: PlayerData[]) =>
    prev.map((player: PlayerData) =>
      player.id === packet.playerId
        ? {
            ...player,
            reportCard: { ...player.reportCard, score: packet.newScore },
          }
        : player,
    ),
  );

  // 게임 씬으로 이벤트 전달 (MineSweeperScene에서 수신)
  const event = new CustomEvent('ms:score_update', { detail: packet });
  window.dispatchEvent(event);
}
```

## 동작 흐름

### 정상 로딩 (기존에도 작동)

1. 게임 시작 → 모든 플레이어가 `MS_GAME_INIT` 수신 (점수 0)
2. 플레이어 A가 타일 클릭 → 모든 플레이어가 `MS_SCORE_UPDATE` 수신
3. gameStore 업데이트 → PlayerCard UI 업데이트 ✅

### 늦은 로딩 (수정 후 작동)

1. 게임 진행 중 (플레이어 A: 10점, 플레이어 B: 5점)
2. 플레이어 C의 씬이 늦게 로딩됨
3. 플레이어 C가 `MS_REQUEST_SYNC` 전송
4. 서버가 `MS_GAME_INIT` 응답 (A: 10점, B: 5점, C: 0점)
5. `handleMSGameInit`이 서버 점수를 gameStore에 적용 ✅
6. PlayerCard UI에 현재 점수 표시 ✅

## 수정된 파일

- `packages/client/src/network/clientHandler.ts`
  - `handleMSGameInit()`: 서버 점수 데이터 적용
  - `handleMSScoreUpdate()`: gameStore 업데이트 추가

## 테스트 방법

1. 멀티플레이어 지뢰찾기 게임 시작
2. 플레이어 A가 몇 개의 타일을 열어서 점수 획득
3. 플레이어 B가 게임에 늦게 참여하거나, 씬 로딩이 느린 상황 시뮬레이션
4. 플레이어 B의 화면에서 플레이어 A의 점수가 올바르게 표시되는지 확인
5. 이후 점수 변화가 실시간으로 반영되는지 확인
