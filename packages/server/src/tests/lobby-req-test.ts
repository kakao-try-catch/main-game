import { Server, Socket } from 'socket.io';
// @ts-ignore
import { joinPlayerToGame, getSession } from '../applegame/serverHandler';

// Mock Socket + Server
const mockAdapter = { rooms: new Map<string, Set<string>>() };

const createMockSocket = (id: string): Socket => {
  return {
    id,
    join: (roomId: string) => {
      let set = mockAdapter.rooms.get(roomId);
      if (!set) {
        set = new Set<string>();
        mockAdapter.rooms.set(roomId, set);
      }
      set.add(id);
      console.log(`[Socket ${id}] Joined room: ${roomId}`);
    },
    disconnect: () => {
      console.log(`[Socket ${id}] Disconnected`);
    },
    emit: (event: string, data: any) =>
      console.log(
        `[Socket ${id}] Receive '${event}':`,
        JSON.stringify(data, null, 2),
      ),
    to: (roomId: string) => ({
      emit: (event: string, data: any) =>
        console.log(
          `[Socket ${id}] Broadcast to '${roomId}' '${event}':`,
          JSON.stringify(data, null, 2),
        ),
    }),
  } as unknown as Socket;
};

const mockIo = {
  sockets: {
    adapter: mockAdapter,
    sockets: new Map<string, Socket>(),
  },
  to: (roomId: string) => ({
    emit: (event: string, data: any) =>
      console.log(
        `[Server] Broadcast to '${roomId}' '${event}':`,
        JSON.stringify(data, null, 2),
      ),
  }),
} as unknown as Server;

const roomId = 'HARDCODED_ROOM_1';

async function runTest_ReturnToLobby() {
  console.log('=== TEST: returnToLobby ===\n');

  // Setup: 2명의 플레이어가 방에 접속
  const hostSocket = createMockSocket('host-socket');
  const guestSocket = createMockSocket('guest-socket');

  joinPlayerToGame(mockIo, hostSocket, roomId, 'Host');
  joinPlayerToGame(mockIo, guestSocket, roomId, 'Guest');

  const session = getSession(roomId);
  if (!session) {
    console.log('[FAIL] Session not found');
    return;
  }

  // Test 1: 게임이 진행 중일 때 (status = 'playing') 로비 복귀 요청 → 거부
  console.log('\n--- Test 1: 게임 진행 중 로비 복귀 요청 ---');
  session.status = 'playing';
  session.returnToLobby('host-socket');
  console.log(`[Expected] 거부됨. status=${session.status}`);
  console.log(`[Result] status=${session.status} (should still be 'playing')`);
  console.log(session.status === 'playing' ? '[PASS]' : '[FAIL]');

  // Test 2: 게임 종료 후 (status = 'ended') 게스트가 로비 복귀 요청 → 거부
  console.log('\n--- Test 2: 게스트의 로비 복귀 요청 ---');
  session.status = 'ended';
  session.returnToLobby('guest-socket');
  console.log(`[Expected] 거부됨. status=${session.status}`);
  console.log(`[Result] status=${session.status} (should still be 'ended')`);
  console.log(session.status === 'ended' ? '[PASS]' : '[FAIL]');

  // Test 3: 게임 종료 후 호스트가 로비 복귀 요청 → 성공
  console.log('\n--- Test 3: 호스트의 로비 복귀 요청 ---');
  session.status = 'ended';
  session.returnToLobby('host-socket');
  console.log(
    `[Expected] 성공. status='waiting', ReturnToTheLobby 패킷 브로드캐스트`,
  );
  console.log(`[Result] status=${session.status}`);
  console.log(session.status === 'waiting' ? '[PASS]' : '[FAIL]');

  console.log('\n=== TEST END ===');
}

runTest_ReturnToLobby();
