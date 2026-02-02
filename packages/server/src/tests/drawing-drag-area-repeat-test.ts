import { Server, Socket } from 'socket.io';
// @ts-ignore
import {
  joinPlayerToGame,
  handleClientPacket,
  getSession,
} from '../applegame/serverHandler';
import { GamePacketType } from '../../../common/src/packets';

// Mock Socket + Server with minimal adapter.rooms tracking
const mockAdapter = { rooms: new Map<string, Set<string>>() };

let broadcastCount = 0;

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
      emit: (event: string, data: any) => {
        // count only UPDATE_DRAG_AREA broadcasts
        if (event === GamePacketType.UPDATE_DRAG_AREA) broadcastCount++;
        console.log(
          `[Socket ${id}] Broadcast to '${roomId}' '${event}':`,
          JSON.stringify(data, null, 2),
        );
      },
    }),
  } as unknown as Socket;
};

// Mock Server
const mockIo = {
  sockets: { adapter: mockAdapter },
  to: (roomId: string) => ({
    emit: (event: string, data: any) =>
      console.log(
        `[Server] Broadcast to '${roomId}' '${event}':`,
        JSON.stringify(data, null, 2),
      ),
  }),
} as unknown as Server;

// Use the same hardcoded room id used by joinPlayerToGame
const roomId = 'HARDCODED_ROOM_1';

async function runTest() {
  console.log('=== TEST START: drawing-drag-area-repeat-test ===');

  const mockSocket = createMockSocket('socket-1');

  // Join to create session
  joinPlayerToGame(mockIo, mockSocket, roomId, 'tester');

  // Prepare a DRAWING_DRAG_AREA packet
  const pkt = {
    type: GamePacketType.DRAWING_DRAG_AREA,
    startX: 0,
    startY: 0,
    endX: 10,
    endY: 10,
  } as any;

  // Send the identical packet 5 times
  for (let i = 0; i < 5; i++) {
    console.log(`\n-- Sending identical DRAWING_DRAG_AREA #${i + 1}`);
    handleClientPacket(mockIo, mockSocket, pkt);
  }

  console.log(`\nBroadcast count after 5 identical sends: ${broadcastCount}`);
  if (broadcastCount !== 3) {
    throw new Error(
      `Expected 3 broadcasts for identical packets, got ${broadcastCount}`,
    );
  }

  // Now send a different packet (should broadcast again)
  const pkt2 = { ...pkt, endX: 11 } as any;
  console.log('\n-- Sending different DRAWING_DRAG_AREA');
  handleClientPacket(mockIo, mockSocket, pkt2);

  console.log(`Broadcast count after different packet: ${broadcastCount}`);
  if (broadcastCount !== 4) {
    throw new Error(
      `Expected 4 broadcasts after different packet, got ${broadcastCount}`,
    );
  }

  console.log('=== TEST PASSED ===');
}

runTest();
