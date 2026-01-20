import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import {
  joinPlayerToGame,
  handleClientPacket,
  handleDisconnect,
} from "./applegame/serverHandler";
import { SystemPacketType } from "../../common/src/packets";

console.log("Game server starting...");

const ROOM_ID = "HARDCODED_ROOM_1";
const MAX_PLAYERS = 4;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    // todo 다른 플레이어 참여 어떻게?
    origin: "http://localhost:5173", // 모든 도메인 허용 (프론트 주소가 다를 것이므로?)
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // 서버도 웹소켓만 허용하도록 일치시킴
});

io.on("connection", (socket: Socket) => {
  console.log(`[접속] 클라이언트: ${socket.id}`);

  // Auto Join
  // 클라이언트에서 닉네임 정보를 handshake query로 보내면 좋겠지만,
  // 지금은 임시로 Socket ID를 이름으로 사용
  // 실제로는 클라이언트가 JOIN 요청을 보내는게 맞음.
  // 하지만 기존 로직 유지하여 접속 시 바로 조인 시도.

  // 방 인원 체크 logic moved to 'joinPlayerToGame' internally or we check here
  const room = io.sockets.adapter.rooms.get(ROOM_ID);
  const numClients = room ? room.size : 0;

  if (numClients < MAX_PLAYERS) {
    joinPlayerToGame(io, socket, ROOM_ID, `Player_${socket.id.substr(0, 4)}`);
  } else {
    socket.emit(SystemPacketType.SYSTEM_MESSAGE, { message: "Room is full" });
    socket.disconnect();
    return;
  }

  socket.onAny((eventName, data) => {
    // console.log(`Event: ${eventName}`, data);
    const packet = { type: eventName, ...data };
    handleClientPacket(io, socket, packet);
  });

  socket.on("disconnect", () => {
    console.log(`접속 종료: ${socket.id}`);
    handleDisconnect(socket.id);
  });
});

httpServer.listen(3000, () => {
  console.log("🚀 소켓 서버가 3000번 포트에서 대기 중...");
});
