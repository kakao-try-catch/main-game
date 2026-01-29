import { Server, Socket } from 'socket.io';
// @ts-ignore
import { joinPlayerToGame, getSession } from '../applegame/serverHandler';
// Mock Socket + Server with minimal adapter.rooms tracking
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

const roomId = 'test-room';

async function runTest_4PlayerJoin() {
  console.log('=== TEST START: Joining 5 Players ===');

  const players = ['a1', 'a2', 'a3', 'a4', 'a5'];

  for (let i = 0; i < players.length; i++) {
    const playerName = players[i];
    const playerId = `socket-${i + 1}`;
    console.log(`\n--- Player ${i + 1} (${playerName}) joining ---`);

    // Mock socket for each player
    const mockSocket = createMockSocket(playerId);

    joinPlayerToGame(mockIo, mockSocket, roomId, playerName);

    // Check session state
    const session = getSession(roomId);
    if (session) {
      console.log(`Current Session Player Count: ${session.getPlayerCount()}`);
      console.log(
        `Current Players: ${JSON.stringify(session.getPlayers().map((p) => p.playerName))}`,
      );
    }
  }

  console.log('\n=== TEST END ===');
}

runTest_4PlayerJoin();
