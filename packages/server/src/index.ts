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
    },
    transports: ["websocket"] // 서버도 웹소켓만 허용하도록 일치시킴
});

io.on('connection', (socket: Socket) => {
  console.log(`클라이언트 접속! ${socket.id}`);
  
  let count = 1;

  // 1초마다 숫자 1씩 증가시켜 전송
  const timer = setInterval(() => {
    socket.emit('update_number', count++);
    console.log(`Sent to ${socket.id}: ${count - 1}`);
  }, 1000);

  socket.on("JOIN_ROOM", (roomId: string) => {
        // 1. 해당 방의 현재 인원 체크 (예: 최대 4명)
        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        
        if (roomSize >= 4) {
            socket.emit("ERROR", { message: "방이 꽉 찼습니다." });
            return;
        }

        // 2. 소켓을 해당 방에 입장시킴
        socket.join(roomId);
        
        // 3. 방에 있는 모든 플레이어에게 알림 (나 포함 혹은 나 제외)
        io.to(roomId).emit("PLAYER_JOINED", { 
            playerId: socket.id, 
            currentCount: roomSize + 1 
        });
        
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

  // 연결이 끊기면 타이머 종료 (메모리 누수 방지)
  socket.on('disconnect', () => {
    clearInterval(timer);
    console.log(`접속 종료: ${socket.id}`);
  });

  socket.on("disconnecting", () => {
    // 소켓이 속한 모든 방을 순회 (보통은 게임방 하나)
    for (const roomId of socket.rooms) {
        if (roomId !== socket.id) { // 소켓 기본 ID 방 제외
            // 1. 다른 플레이어들에게 누가 나갔는지 알림
            socket.to(roomId).emit("PLAYER_LEFT", { playerId: socket.id });
            
            // 2. 만약 방에 아무도 없다면 게임 데이터 삭제 로직 실행
            const remaining = io.sockets.adapter.rooms.get(roomId)?.size;
            if (remaining === 1) { // 현재 나가는 중이므로 1일 때가 마지막 인원
                deleteGameData(roomId);
            }
        }
    }
});
});

httpServer.listen(3000, () => {
  console.log('🚀 소켓 서버가 3000번 포트에서 대기 중...');
});

