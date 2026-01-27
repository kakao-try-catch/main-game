import { Server, Socket } from 'socket.io';
import {
  GamePacketType,
  SystemPacketType,
  ServerPacket,
  GamePacket,
  RoomUpdatePacket,
  RoomUpdateType,
} from '../../../common/src/packets';
import { GameSession } from './gameSession';

// Room ID -> Session
const sessions = new Map<string, GameSession>();

// Player ID -> Room ID
const playerRooms = new Map<string, string>(); // todo 얘가 지금 기본 socket.io room 으로 대체 가능성이 있음.

// Player ID -> last drag area & repeat count
const playerDragState = new Map<
  string,
  {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    repeatCount: number;
  }
>();

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

export function handleClientPacket(
  io: Server,
  socket: Socket,
  packet: ServerPacket,
) {
  try {
    console.log(
      '[Server] handleClientPacket received packet type:',
      packet.type,
    );
    if (packet.type === SystemPacketType.JOIN_ROOM) {
      joinPlayerToGame(io, socket, packet.roomId, packet.playerName);
      return;
    }

    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const session = sessions.get(roomId);
    if (!session) return;

    switch (packet.type) {
      case SystemPacketType.GAME_START_REQ: {
        console.log(`[Server] GAME_START_REQ received from ${socket.id}`);
        console.log(
          `[Server] Player object:`,
          session.players.get(socket.id)
            ? session.players.get(socket.id)!.name
            : 'null',
        );
        if (session.isHost(socket.id)) {
          console.log(
            '[Server] Order is 0, starting game... (currently commented out)',
          );
          session.startGame();
        } else {
          const playerExists = !!session.players.get(socket.id);
          console.log(
            `[Server] Start denied: ${playerExists ? 'not order 0' : 'player not found'}`,
          );
          socket.emit(SystemPacketType.SYSTEM_MESSAGE, {
            message: '방장만 게임을 시작할 수 있습니다.',
          });
        }
        break;
      }

      case GamePacketType.DRAWING_DRAG_AREA: {
        // 브로드캐스트 (나 제외)
        // 검증 로직 필요함. 게임 안쪽 영역이 맞는지, 그리고 정규화된 건지
        // 드래그 영역은 정규화가 필요함.
        // 추가: 이전에 보냈던 것과 동일한지 비교해 동일한 패킷이 3번까지만 브로드캐스트,
        // 4번째부터는 무시하도록 함.
        const key = socket.id;
        const sx = packet.startX;
        const sy = packet.startY;
        const ex = packet.endX;
        const ey = packet.endY;

        const prev = playerDragState.get(key);
        const isSame =
          !!prev &&
          prev.startX === sx &&
          prev.startY === sy &&
          prev.endX === ex &&
          prev.endY === ey;

        if (isSame) {
          prev.repeatCount = (prev.repeatCount || 0) + 1;
          if (prev.repeatCount <= 3) {
            socket.to(roomId).emit(GamePacketType.UPDATE_DRAG_AREA, {
              type: GamePacketType.UPDATE_DRAG_AREA,
              playerId: socket.id,
              startX: sx,
              startY: sy,
              endX: ex,
              endY: ey,
            });
          } else {
            // 4번째 이상 동일한 패킷은 무시
            // 필요하면 로깅 추가
          }
        } else {
          playerDragState.set(key, {
            startX: sx,
            startY: sy,
            endX: ex,
            endY: ey,
            repeatCount: 1,
          });
          socket.to(roomId).emit(GamePacketType.UPDATE_DRAG_AREA, {
            type: GamePacketType.UPDATE_DRAG_AREA,
            playerId: socket.id,
            startX: sx,
            startY: sy,
            endX: ex,
            endY: ey,
          });
        }

        break;
      }

      case GamePacketType.CONFIRM_DRAG_AREA:
        session.handleDragConfirm(socket.id, packet.indices);
        break;

      case SystemPacketType.GAME_CONFIG_UPDATE_REQ:
        // Only host may update game config
        if (!session.isHost(socket.id)) {
          socket.emit(SystemPacketType.SYSTEM_MESSAGE, {
            message: '방장만 게임 설정을 변경할 수 있습니다.',
          });
          break;
        }
        session.updateGameConfig(packet.selectedGameType, packet.gameConfig);
        break;

      // TODO: 게임 시작 요청 등이 있다면 추가
    }
  } catch (error) {
    console.error(`[Server] Error handling packet ${packet.type}:`, error);
  }
}

// index.ts에서 호출할 초기화/조인 헬퍼
const MAX_PLAYERS_PER_ROOM = 4;
export function joinPlayerToGame(
  io: Server,
  socket: Socket,
  roomId: string,
  playerName: string,
) {
  roomId = 'HARDCODED_ROOM_1'; // todo: 강제로 하드코드된 방으로 넣기. 나중엔 지워야 함.
  console.log(
    `[Server] Player ${playerName} (${socket.id}) joining room ${roomId}`,
  );
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

  const room = io.sockets.adapter.rooms.get(roomId);
  const numClients = room ? room.size : 0;

  // todo: 여기 방 numClients 랑 session.getPlayerCount() 둘 역할 중복되어서 정리해야 함
  if (numClients >= MAX_PLAYERS_PER_ROOM) {
    socket.emit(SystemPacketType.SYSTEM_MESSAGE, { message: 'Room is full' });
    socket.disconnect();
    return;
  }
  // 방 인원 검사 해야 함.
  if (session.getPlayerCount() >= MAX_PLAYERS_PER_ROOM) {
    socket.emit(SystemPacketType.SYSTEM_MESSAGE, {
      message: '방이 꽉 찼습니다.',
    });
    socket.disconnect();
    return;
  }

  // Socket join
  socket.join(roomId);
  playerRooms.set(socket.id, roomId);
  session.addPlayer(socket.id, playerName);

  const roomUpdatePacket2Player: RoomUpdatePacket = {
    type: SystemPacketType.ROOM_UPDATE,
    players: session.getPlayers(),
    updateType: RoomUpdateType.INIT,
  };
  socket.emit(SystemPacketType.ROOM_UPDATE, roomUpdatePacket2Player);
  console.log(`[Server] Sent ROOM_UPDATE (INIT) to ${socket.id}`);

  // Send JOIN to existing players
  const roomUpdatePacket2Others: RoomUpdatePacket = {
    type: SystemPacketType.ROOM_UPDATE,
    players: session.getPlayers(),
    updateType: RoomUpdateType.JOIN,
  };
  // todo socket 주인장 제외 보내야 함.
  socket.to(roomId).emit(SystemPacketType.ROOM_UPDATE, roomUpdatePacket2Others);
  console.log(
    `[Server] Sent ROOM_UPDATE (JOIN) to room ${roomId} (excluding ${socket.id})`,
  );

  // 만약 방이 꽉 찼거나 특정 조건 만족 시 게임 시작?
  // 현재는 자동 시작 or 수동 시작. 일단 자동 시작 로직 예시:
  // if (session.getPlayerCount() >= 2 && session.status === 'waiting') {
  //   session.startGame();
  // }
  // 혹은 클라이언트가 시작 요청을 보내야 함?
  // 요구사항에 '게임 시작' 명시적 로직은 없지만, TEST를 위해
  // 접속 시 바로 시작하거나 일정 인원에서 시작하도록 설정.
  // 일단 인원 1명이라도 들어오면 바로 시작하도록 해서 테스트 용이하게 함 (개발중)
  // if (session.status === 'waiting') {
  //   session.startGame();
  // } else if (session.status === 'playing') {
  //   // 이미 진행중이면 현재 상태 전송 (Reconnection logic)
  //   socket.emit(GamePacketType.SET_FIELD, { type: GamePacketType.SET_FIELD, apples: session.apples });
  //   socket.emit(GamePacketType.SET_TIME, { type: GamePacketType.SET_TIME, limitTime: session.timeLeft });
  // }
}
