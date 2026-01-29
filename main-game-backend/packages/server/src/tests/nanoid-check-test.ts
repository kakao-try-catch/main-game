import { Server, Socket } from 'socket.io';
// @ts-ignore
import { joinPlayerToGame, getSession } from '../applegame/serverHandler';

// Mock Socket + Server (lobby-req-test.ts 참고)
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

async function runTest_NanoidRoomId() {
  console.log('=== TEST: nanoid roomId generation ===\n');

  const socket = createMockSocket('test-socket-1');

  // Test 1: 빈 roomId로 joinPlayerToGame 호출
  console.log('--- Test 1: 빈 roomId로 방 생성 ---');
  await joinPlayerToGame(mockIo, socket, '', 'Player1');

  // mockAdapter.rooms에서 생성된 roomId 확인
  const rooms = Array.from(mockAdapter.rooms.keys());
  console.log(`[Result] Created rooms: ${rooms.join(', ')}`);

  if (rooms.length > 0) {
    const generatedRoomId = rooms[0];
    const isValid = /^[0-9a-z]{10}$/.test(generatedRoomId);
    console.log(`[Result] Generated roomId: ${generatedRoomId}`);
    console.log(`[Result] Is 10-char alphanumeric: ${isValid}`);
    console.log(isValid ? '[PASS]' : '[FAIL]');
  } else {
    console.log('[FAIL] No room created');
  }

  console.log('\n=== TEST END ===');
}

runTest_NanoidRoomId();
