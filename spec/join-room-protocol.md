# Join Room Protocol
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

PlayerData는 { order: number, playerName: string, color: string } 으로 구성되어 있음.