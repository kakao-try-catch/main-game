# [FlappyBird] 결과 화면 및 UI 연동

> Parent Issue: #492

## 목표

게임 종료 시 적절한 결과 화면과 게임 중 UI 표시

## 현재 상태

- 기본적인 게임 종료 이벤트만 전달
- 누가 충돌했는지 명확하게 표시되지 않음
- 개인 통계(점프 횟수 등) 미표시
- 게임 중 UI가 부족함

## 구현 계획

### 1단계: 결과 데이터 구조 개선

```typescript
// flappybird.types.ts
export interface FlappyBirdGameResult {
  finalScore: number;
  reason: 'pipe_collision' | 'ground_collision';
  gameDuration: number;
  collidedPlayerIndex: number;
  collidedPlayerName: string;
  playerStats: FlappyPlayerStats[];
}

export interface FlappyPlayerStats {
  playerIndex: number;
  playerName: string;
  playerColor: string;
  jumpCount: number;
  avgJumpInterval: number;
}
```

### 2단계: 서버에서 통계 수집

- `FlappyBirdInstance.ts`에 `playerStats` Map 추가
- `handleJump()`에서 점프 횟수, 시간 기록
- 게임 오버 시 `buildGameResult()` 호출하여 통계 포함

### 3단계: 결과 화면 UI

- 팀 점수 크게 표시
- 충돌한 플레이어 강조 (이름, 아이콘)
- 충돌 사유 표시 (파이프/바닥)
- 개인 통계 카드 (점프 횟수, 평균 간격)
- 재시작/로비 버튼 (호스트만 활성화)

### 4단계: 게임 중 UI

- 상단 중앙: 현재 점수
- 우측 상단: 플레이어 목록 (색상, 이름, 내 표시)
- 하단: 조작 힌트 (스페이스바/클릭)

## 테스트 케이스

- [ ] 충돌한 플레이어가 명확히 표시되는지 확인
- [ ] 개인 통계가 정확한지 확인
- [ ] 게임 중 점수 실시간 업데이트 확인
- [ ] 호스트/게스트 버튼 상태 확인

## 파일 수정/추가

- `packages/client/src/game/types/flappybird.types.ts`
- `packages/server/src/games/instances/FlappyBirdInstance.ts`
- `packages/client/src/game/utils/game-result/FlappyBirdResult.tsx`
- 신규: `packages/client/src/components/game/FlappyBirdGameUI.tsx`

## Labels

`enhancement`, `game:flappybird`, `ui`, `client`
