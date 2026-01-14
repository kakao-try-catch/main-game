// 서버 메인 파일
// 게임 서버 로직을 여기서 초기화하세요

console.log('Game server starting...');

import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // 모든 도메인 허용 (프론트 주소가 다를 것이므로?)
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket: Socket) => {
  console.log(`클라이언트 접속! ${socket.id}`);
  
  let count = 1;

  // 1초마다 숫자 1씩 증가시켜 전송
  const timer = setInterval(() => {
    socket.emit('update_number', count++);
    console.log(`Sent to ${socket.id}: ${count - 1}`);
  }, 1000);

  // 연결이 끊기면 타이머 종료 (메모리 누수 방지)
  socket.on('disconnect', () => {
    clearInterval(timer);
    console.log(`접속 종료: ${socket.id}`);
  });
});

httpServer.listen(3000, () => {
  console.log('🚀 소켓 서버가 3000번 포트에서 대기 중...');
});