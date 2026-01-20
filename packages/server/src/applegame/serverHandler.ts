
import { Server, Socket } from "socket.io";
import {
  GamePacketType,
  SystemPacketType,
  ServerPacket,
  GamePacket,
  RoomUpdatePacket,
} from "../../../common/src/packets";
import { GameSession } from "./gameSession";

// Room ID -> Session
const sessions = new Map<string, GameSession>();

// Player ID -> Room ID
const playerRooms = new Map<string, string>();

export function getSession(roomId: string): GameSession | undefined {
  return sessions.get(roomId);
}

export function handleConnection(io: Server, socket: Socket) {
  // 클라이언트가 방에 접속 시도 (Connection 직후 로직은 index.ts에 있으나, 
  // 여기서는 로직 분리를 위해 함수 제공)

  // Note: index.ts에서 이미 hardcoded room logic이 있으므로 
  // 여기서는 패킷 핸들링 위주로 구현함.
}

export function handleDisconnect(socketId: string) {
  const roomId = playerRooms.get(socketId);
  if (roomId) {
    const session = sessions.get(roomId);
    if (session) {
      session.removePlayer(socketId);
    }
    playerRooms.delete(socketId);
  }
}

export function handleClientPacket(io: Server, socket: Socket, packet: ServerPacket) {
  //  const roomId = playerRooms.get(socket.id);
  //
  //  // 만약 System Packet인 JOIN_ROOM이 온다면 처리 (기존 index.ts 로직 대체 가능성 고려)
  //  // 현재 구조상 index.ts에서 socket.join을 하고 있음.
  //  // 여기서는 이미 Join된 상태라고 가정하고 게임 패킷만 처리하거나,
  //  // JOIN_ROOM 패킷을 받아서 처리하도록 구조화 가능.
  //
  //  if (!roomId) {
  //    // 방에 없는 상태에서 게임 패킷을 보내면 무시/에러
  //    // 단, JOIN 관련 패킷은 예외여야 함
  //    return;
  //  }
  //
  //  const session = sessions.get(roomId);
  //  if (!session) return;

  switch (packet.type) {
    case SystemPacketType.JOIN_ROOM:
      joinPlayerToGame(io, socket, packet.roomId, packet.playerName);
      break;

    case GamePacketType.DRAWING_DRAG_AREA:
      // 브로드캐스트 (나 제외)
      socket.to(roomId).emit(GamePacketType.UPDATE_DRAG_AREA, {
        type: GamePacketType.UPDATE_DRAG_AREA,
        playerId: socket.id,
        startX: packet.startX,
        startY: packet.startY,
        endX: packet.endX,
        endY: packet.endY,
      });
      break;

    case GamePacketType.CONFIRM_DRAG_AREA:
      session.handleDragConfirm(socket.id, packet.indices);
      break;

    // TODO: 게임 시작 요청 등이 있다면 추가
  }
}

// index.ts에서 호출할 초기화/조인 헬퍼
export function joinPlayerToGame(io: Server, socket: Socket, roomId: string, playerName: string) {
  // 중복 조인 방지
  //  if (playerRooms.has(socket.id)) {
  //    socket.emit(SystemPacketType.SYSTEM_MESSAGE, { message: "이미 방에 참여 중입니다." });
  //    return;
  //  }

  let session = sessions.get(roomId);
  if (!session) {
    session = new GameSession(roomId, (packet: ServerPacket) => {
      // packet에서 type과 나머지 데이터를 분리
      const { type, ...payload } = packet;

      // Broadcast callback
      io.to(roomId).emit(packet.type, payload);
    });
    sessions.set(roomId, session);
    console.log(`Created new Game Session for ${roomId}`);
  }

  // 방 인원 검사 해야 함.
  if (session.getPlayerCount() >= 4) {
    socket.emit(SystemPacketType.SYSTEM_MESSAGE, { message: "방이 꽉 찼습니다." });
    return;
  }

  // Socket join
  socket.join(roomId);
  playerRooms.set(socket.id, roomId);
  session.addPlayer(socket.id, playerName);

  // 이거 ROOM_UPDATE 여야 함.
  const roomUpdatePacket: RoomUpdatePacket = {
    type: SystemPacketType.ROOM_UPDATE,
    players: session.getPlayers(),
  };
  io.to(roomId).emit(SystemPacketType.ROOM_UPDATE, roomUpdatePacket);

  // 만약 방이 꽉 찼거나 특정 조건 만족 시 게임 시작?
  // 현재는 자동 시작 or 수동 시작. 일단 자동 시작 로직 예시:
  // if (session.getPlayerCount() >= 2 && session.status === 'waiting') {
  //   session.startGame();
  // }
  // 혹은 클라이언트가 시작 요청을 보내야 함?
  // 요구사항에 '게임 시작' 명시적 로직은 없지만, TEST를 위해
  // 접속 시 바로 시작하거나 일정 인원에서 시작하도록 설정.
  // 일단 인원 1명이라도 들어오면 바로 시작하도록 해서 테스트 용이하게 함 (개발중)
  if (session.status === 'waiting') {
    session.startGame();
  } else if (session.status === 'playing') {
    // 이미 진행중이면 현재 상태 전송 (Reconnection logic)
    socket.emit(GamePacketType.SET_FIELD, { type: GamePacketType.SET_FIELD, apples: session.apples });
    socket.emit(GamePacketType.SET_TIME, { type: GamePacketType.SET_TIME, limitTime: session.timeLeft });
  }
}
