// 미완

// 서버 메모리 상의 게임 방 상태 예시
interface GameRoom {
  apples: number[]; // 초기 생성된 사과 숫자들 [9, 1, 4, 6, ...]
  removedIndices: Set<number>; // 이미 제거된 사과 인덱스 저장
  scores: Map<string, number>; // 플레이어별 점수
  // ... 기타 상태
}

// 서버 메모리 상의 관리 예시
const gameRooms = new Map<string, GameRoom>(); // roomId -> RoomData

function getRoomByPlayer(socket: Socket) {
  // 1. socket.rooms에서 roomId를 하나 찾아낸 뒤 (socket.id가 아닌 것)
  // 2. 그 roomId로 gameRooms Map에서 데이터를 꺼내옴
  const roomId = Array.from(socket.rooms).find((id) => id !== socket.id);
  return gameRooms.get(roomId || '');
}

// 나를 제외한 방 안의 모든 사람에게 (UPDATE_DRAG_AREA 등에 사용)
const broadcastToOthers = (
  socket: Socket,
  roomId: string,
  eventName: string,
  data: any,
) => {
  socket.to(roomId).emit(eventName, data);
};

// 나를 포함한 방 안의 모든 사람에게 (DROP_CELL_INDEX 등에 사용)
const broadcastToAll = (
  io: Server,
  roomId: string,
  eventName: string,
  data: any,
) => {
  io.to(roomId).emit(eventName, data);
};
