import { Server, Socket } from 'socket.io';
// @ts-ignore
import { joinPlayerToGame, getSession } from '../applegame/serverHandler';
import { GameType, MapSize } from '../../../common/src/packets';

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

// Note: serverHandler currently forces roomId to 'HARDCODED_ROOM_1'.
// Use the same key here so the test can find the created session.
const roomId = 'HARDCODED_ROOM_1';

// ----------------------------
// New test: updateGameConfig
// ----------------------------
async function runTest_updateGameConfig() {
  console.log('=== TEST START: updateGameConfig sanitization ===');

  const mockSocket = createMockSocket('socket-1');

  // Join a single player to create the session
  joinPlayerToGame(mockIo, mockSocket, roomId, 'tester');

  const session = getSession(roomId);
  if (!session) {
    console.error('Session not found after join');
    return;
  }

  // Access internal stored configs (for test inspection)
  const storedConfigs: Map<any, any> = (session as any).gameConfigs;

  console.log('\n-- Initial stored config (raw) --');
  console.log(JSON.stringify(storedConfigs.get(GameType.APPLE_GAME), null, 2));

  // 1) Valid config coming from client
  const validCfg = {
    mapSize: MapSize.SMALL,
    time: 45,
    generation: 1,
    zero: true,
  } as any;

  console.log('\n> Sending valid GAME_CONFIG_UPDATE_REQ (simulated)');
  session.updateGameConfig(GameType.APPLE_GAME, validCfg);

  console.log('\n-- Stored config after valid update --');
  console.log(JSON.stringify(storedConfigs.get(GameType.APPLE_GAME), null, 2));

  // 2) Malformed / malicious config
  const invalidCfg = {
    mapSize: 'NOT_A_MAP',
    time: 'not-a-number',
    generation: 999,
    zero: 'yes',
  } as any;

  console.log('\n> Sending invalid GAME_CONFIG_UPDATE_REQ (simulated)');
  session.updateGameConfig(GameType.APPLE_GAME, invalidCfg);

  console.log('\n-- Stored config after invalid update (sanitized) --');
  console.log(JSON.stringify(storedConfigs.get(GameType.APPLE_GAME), null, 2));

  console.log('\n=== TEST END ===');
}

runTest_updateGameConfig();
