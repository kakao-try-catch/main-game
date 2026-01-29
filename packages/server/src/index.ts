import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import {
  joinPlayerToGame,
  handleClientPacket,
  handleDisconnect,
  handleConnection,
} from './applegame/serverHandler';
import { ServerPacket, SystemPacketType } from '../../common/src/packets';

console.log('Game server starting...');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    // todo 다른 플레이어 참여 어떻게?
    origin: ['*'],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'], // 서버도 웹소켓만 허용하도록 일치시킴
});

io.on('connection', (socket: Socket) => {
  handleConnection(socket);

  socket.onAny((eventName, data) => {
    // console.log(`Event: ${eventName}`, data);
    const packet = { type: eventName, ...data } as ServerPacket;
    handleClientPacket(io, socket, packet);
  });

  socket.on('disconnect', () => {
    console.log(`접속 종료: ${socket.id}`);
    handleDisconnect(socket.id);
  });
});

httpServer.listen(3000, '0.0.0.0', () => {
  console.log('🚀 소켓 서버가 3000번 포트에서 대기 중...');
});

// 프로세스 종료 방지 및 에러 로그 기록
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('exit', (code) => {
  console.log(`[Server] Process exiting with code: ${code}`);
  if (code !== 0) {
    console.trace('Exit Trace:');
  }
});

process.on('SIGINT', () => {
  console.log('[Server] Received SIGINT (Ctrl+C)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Server] Received SIGTERM');
  process.exit(0);
});
