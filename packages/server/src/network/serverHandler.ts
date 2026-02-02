import { Server, Socket } from 'socket.io';
import {
  SystemPacketType,
  ServerPacket,
  RoomUpdatePacket,
  RoomUpdateType,
} from '../../../common/src/packets';
import { GameSession } from '../games/gameSession';
import { customAlphabet } from 'nanoid';

// 커스텀 nanoid 생성기
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const generateRoomId = customAlphabet(alphabet, 10);

// Room ID -> Session
const sessions = new Map<string, GameSession>();

// Player ID -> Room ID
const playerRooms = new Map<string, string>(); // todo 얘가 지금 기본 socket.io room 으로 대체 가능성이 있음.

export function getSession(roomId: string): GameSession | undefined {
  return sessions.get(roomId);
}

export function handleConnection(socket: Socket) {
  // 클라이언트 정보 추출
  const clientIP =
    (socket.handshake.headers['x-forwarded-for'] as string) ||
    socket.request?.socket?.remoteAddress ||
    'unknown';
  const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
  const acceptLanguage =
    socket.handshake.headers['accept-language'] || 'unknown';
  const connectionTime = socket.handshake.time;

  // 이쁘게 로깅
  console.log('=====================================');
  console.log('[접속] 새 클라이언트 연결');
  console.log('-------------------------------------');
  console.log(`  Socket ID : ${socket.id}`);
  console.log(`  IP        : ${clientIP}`);
  console.log(`  User-Agent: ${userAgent}`);
  console.log(`  Language  : ${acceptLanguage}`);
  console.log(`  접속 시간  : ${connectionTime}`);
  console.log('=====================================');
  console.log('');
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

    // JOIN_ROOM 처리
    if (packet.type === SystemPacketType.JOIN_ROOM) {
      joinPlayerToGame(io, socket, packet.roomId, packet.playerName);
      return;
    }

    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const session = sessions.get(roomId);
    if (!session) return;

    // System 패킷 처리
    switch (packet.type) {
      case SystemPacketType.GAME_START_REQ: {
        console.log(`[Server] GAME_START_REQ received from ${socket.id}`);
        console.log(
          `[Server] Player object:`,
          session.players.get(socket.id)
            ? session.players.get(socket.id)!.playerName
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

      case SystemPacketType.RETURN_TO_THE_LOBBY_REQ:
        session.returnToLobby(socket.id);
        break;

      case SystemPacketType.REPLAY_REQ:
        session.handleReplayRequest(socket.id);
        break;
    }

    //     case AppleGamePacketType.DRAWING_DRAG_AREA: {
    //   // 브로드캐스트 (나 제외)
    //   // 검증 로직 필요함. 게임 안쪽 영역이 맞는지, 그리고 정규화된 건지
    //   // 드래그 영역은 정규화가 필요함.
    //   // 추가: 이전에 보냈던 것과 동일한지 비교해 동일한 패킷이 3번까지만 브로드캐스트,
    //   // 4번째부터는 무시하도록 함.
    //   const playerIndex = session.getIndex(socket.id);
    //   const sx = packet.startX;
    //   const sy = packet.startY;
    //   const ex = packet.endX;
    //   const ey = packet.endY;

    //   const prev = playerDragState.get(playerIndex);
    //   const isSame =
    //     !!prev &&
    //     prev.startX === sx &&
    //     prev.startY === sy &&
    //     prev.endX === ex &&
    //     prev.endY === ey;

    //   if (isSame) {
    //     prev.repeatCount = (prev.repeatCount || 0) + 1;
    //     if (prev.repeatCount <= 3 || true) {
    //       socket.to(roomId).emit(AppleGamePacketType.UPDATE_DRAG_AREA, {
    //         type: AppleGamePacketType.UPDATE_DRAG_AREA,
    //         playerIndex: playerIndex,
    //         startX: sx,
    //         startY: sy,
    //         endX: ex,
    //         endY: ey,
    //       });
    //     } else {
    //       // 4번째 이상 동일한 패킷은 무시
    //       // 필요하면 로깅 추가
    //     }
    //   } else {
    //     playerDragState.set(playerIndex, {
    //       startX: sx,
    //       startY: sy,
    //       endX: ex,
    //       endY: ey,
    //       repeatCount: 1,
    //     });
    //     socket.to(roomId).emit(AppleGamePacketType.UPDATE_DRAG_AREA, {
    //       type: AppleGamePacketType.UPDATE_DRAG_AREA,
    //       playerIndex: playerIndex,
    //       startX: sx,
    //       startY: sy,
    //       endX: ex,
    //       endY: ey,
    //     });
    //   }

    //   break;
    // }

    // case AppleGamePacketType.CONFIRM_DRAG_AREA:
    //   session.handleDragConfirm(socket.id, packet.indices);
    //   break;

    // 게임별 패킷 라우팅
    if (packet.type.startsWith('APPLE_')) {
      session.handleGamePacket(socket, packet);
      return;
    }

    if (packet.type.startsWith('FLAPPY_')) {
      session.handleGamePacket(socket, packet);
      return;
    }
  } catch (error) {
    console.error(`[Server] Error handling packet ${packet.type}:`, error);
  }
}

// index.ts에서 호출할 초기화/조인 헬퍼
const MAX_PLAYERS_PER_ROOM = 4;
export async function joinPlayerToGame(
  io: Server,
  socket: Socket,
  roomId: string,
  playerName: string,
) {
  if (!roomId) {
    roomId = generateRoomId();
  }

  console.log(
    `[Server] Player ${playerName} (${socket.id}) joining room ${roomId}`,
  );
  // 중복 조인 방지
  if (playerRooms.has(socket.id)) {
    socket.emit(SystemPacketType.SYSTEM_MESSAGE, {
      message: '이미 방에 참여 중입니다.',
    });
    return;
  }

  let session = sessions.get(roomId);

  // 게임이 진행 중이거나 결과 화면이면 접속 거부
  if (session && session.status !== 'waiting') {
    const message =
      session.status === 'playing'
        ? '게임이 이미 진행 중입니다.'
        : '게임이 아직 종료되지 않았습니다.';
    socket.emit(SystemPacketType.SYSTEM_MESSAGE, {
      message,
    });
    socket.disconnect();
    return;
  }

  if (!session) {
    session = new GameSession(io, roomId);
    sessions.set(roomId, session); // todo 얘는 생성할 때만 있어도 되는 거 아님?
    console.log(`Created new Game Session for ${roomId}`);

    socket.join(roomId);
    playerRooms.set(socket.id, roomId);
    session.addPlayer(socket.id, playerName);

    const roomUpdatePacket2Player: RoomUpdatePacket = {
      type: SystemPacketType.ROOM_UPDATE,
      players: session.getPlayers(),
      updateType: RoomUpdateType.INIT_ROOM,
      yourIndex: session.getIndex(socket.id),
      roomId: roomId,
    };
    socket.emit(SystemPacketType.ROOM_UPDATE, roomUpdatePacket2Player);
    console.log(
      `[Server] Sent ROOM_UPDATE (${roomUpdatePacket2Player.updateType}) to ${socket.id}`,
    );
    return;
  }

  // todo 얘 rooms에 등록되는 과정 어떻게 됨?
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
  await socket.join(roomId);
  playerRooms.set(socket.id, roomId);
  session.addPlayer(socket.id, playerName);

  const roomUpdatePacket2Player: RoomUpdatePacket = {
    type: SystemPacketType.ROOM_UPDATE,
    players: session.getPlayers(),
    updateType: RoomUpdateType.PLAYER_JOIN,
    yourIndex: session.getIndex(socket.id),
    roomId: roomId,
  };
  socket.emit(SystemPacketType.ROOM_UPDATE, roomUpdatePacket2Player);
  console.log(
    `[Server] Sent ROOM_UPDATE (${roomUpdatePacket2Player.updateType}) to ${socket.id}`,
  );

  session.updateRemainingPlayers(socket.id);

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
  //   socket.emit(GamePacketType.SET_FIELD, { type: AppleGamePacketType.SET_FIELD, apples: session.apples });
  //   socket.emit(GamePacketType.SET_TIME, { type: AppleGamePacketType.SET_TIME, limitTime: session.timeLeft });
  // }
}
