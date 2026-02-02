# 1. ServerBound

## 1.1. JUMP

현재 위치에서 점프를 했다고 서버에게 보냅니다.

포함 데이터

- timestamp: 언제 뛰었는지 # 서버측 보간용

# 2. ClientBound

## 2.1. WORLD_STATE

birdsData: BirdsData[y, vy] #현재 PlayerData 순서대로 각 플레이어들 높이(y) 정보와 속도(vy) 정보
pipeData: Pipe[]

## 2.2. GAME_OVER

collidedPlayerIndex: number # 부딪힌 플레이어
finalScore: number # 최종 점수

플래피버드는 TIME_END가 없기 때문에 게임 오버 패킷을 따로 만듦
