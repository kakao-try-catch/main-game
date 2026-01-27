# JOIN_ROOM (ServerBound)

플레이어가 방에 입장할 때 서버로 보내는 프로토콜입니다.

playerid: string # 플레이어 id (socket id)
roomid: string # 방 id (가고자하는 방 id)
playerName: string # 플레이어 이름 (서버가 알아야 함)

# ROOM_UPDATE (ClientBound)

방에 있는 참여자 모두에게 방 구성원이 변경되었음을 알리는 프로토콜입니다.
플레이어가 JOIN_ROOM으로 방에 입장하게 되면 서버에게 랜덤한 색을 부여받고,
서버는 색상 정보와 플레이어 이름 정보를 모두에게 알려서 동기화시킵니다.

players: PlayerData[] # 플레이어 정보를 담은 배열
updateType: RoomUpdateType # INIT(0): 플레이어 본인 입장 (전체 리스트), JOIN(1): 다른 플레이어 입장 (추가됨) 클라이언트는 추후에 이걸 받고 0이면 닉네임 설정창에서 로비 화면으로 넘어가야 하고, 1이면 목록 업데이트를 해주어야 함. 서버는 방에 들어 온 참여자에게는 0으로 보내줘야 하고, 나머지 참여자들에게는 1로 보내줘야 함.
yourIndex: number # 플레이어마다 배열 order 보내주기

PlayerData는 { order: number, playerName: string, color: string } 으로 구성되어 있음.

# GAME_CONFIG_UPDATE_REQ (ServerBound)

방장이 서버로 게임 설정 변경을 요청할 때 사용됩니다.

selectedGameType: string # 게임 타입
game_config: config # 게임 구성 설정

string에 들어가는 selectedGameType은 enum으로 정의되어야 함.
APPLE_GAME, FLAPPY_BIRD, MINESWEEPER

config는 게임마다 다를 수 있지만 일단 사과게임을 우선적으로 처리합니다.
map_size: small, medium, large enum # 맵 크기
time: number #서버측도 검증해야 함. 클라측 검증 로직을 서버측도 가져오기?
generation: 0/1 #0은 쉬움. 1~9 숫자 생성, 1은 어려움. 1~5 숫자 생성
zero: boolean # 0 생성 여부

# GAME_CONFIG_UPDATE (ClientBound)

방장이 게임 설정을 변경했을 때 모든 플레이어에게 전달됩니다.

- selectedGameType: GameType # 게임 타입
- gameConfig: config # 게임 구성 설정 (사과게임 콘피그는 packets.ts에 있는 AppleGameConfig 사용)

config는 게임마다 다를 수 있지만 일단 사과게임을 우선적으로 처리합니다.

- mapSize: small, medium, large enum # 맵 크기
- time: number #서버측도 검증해야 함. 클라측 검증 로직을 서버측도 가져오기?
- generation: 0/1 #0은 쉬움. 1~9 숫자 생성, 1은 어려움. 1~5 숫자 생성
- zero: boolean # 0 생성 여부

# GAME_START_REQ (ServerBound)

방장이 현재 설정으로 게임 시작을 요청할 때 사용됩니다.
서버측은 방장인지 검증 후 현재 상태로 게임을 시작합니다.
서버측 해당 패킷을 보낸 socket의 id를 기반으로 room을 찾고 접속 여부, 방장 여부 등을 검증 후 게임 시작 처리를 준비합니다.

# READY_SCENE (ClientBound)

클라이언트가 이 패킷을 받아야 실제 게임 화면을 구성합니다. (기존 setCurrentScreen('game')으로 게임 화면으로 넘어가는 부분)

- selectedGameType: GameType # 게임 타입 (packets.ts에 있는 GameType 사용하면 됨.)

# UPDATE_SCORE (ClientBound)

클라이언트의 점수판을 업데이트 합니다.

- playerOrder: number # 점수를 업데이트할 플레이어 order
- reportCard: ReportCard[] # 해당 플레이어가 나타내는 점수판

ReportCard = AppleGameReportCard | MineSweeperReportCard;
AppleGameReportCard = {
score: number,
};
MineSweeperReportCard = {
score: number,
flags: number,
}
