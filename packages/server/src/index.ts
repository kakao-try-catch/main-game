import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import {
  joinPlayerToGame,
  handleClientPacket,
  handleDisconnect,
} from "./applegame/serverHandler";
import { ServerPacket, SystemPacketType } from "../../common/src/packets";

console.log("Game server starting...");

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


  socket.onAny((eventName, data) => {
    // console.log(`Event: ${eventName}`, data);
    const packet = { type: eventName, ...data } as ServerPacket;
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
