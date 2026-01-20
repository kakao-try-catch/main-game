import { io, Socket } from "socket.io-client";
import { type ServerPacket } from "../../../common/src/packets.ts";
// import { handleServerPacket } from "./clientHandler.ts";

class SocketManager {
  private socket: Socket | null = null;

  connect(url: string) {
    // [중요] 이미 소켓이 생성되어 있고 연결 중이라면 중복 실행 방지
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(url, {
      transports: ["websocket"], // 성능을 위해 웹소켓 강제
      reconnectionAttempts: 5,
    });

    // 통합 핸들러 연결
    this.socket.onAny((eventName, data) => {
      // 패킷 구조가 { type, ...data } 형태라면 그대로 전달
      // 모든 수신 데이터는 ServerPacket 규격을 따름을 명시
      const packet = { type: eventName, ...data } as ServerPacket;
      // handleServerPacket(packet);
    });

    this.socket.on("connect", () => console.log("Connected! url:", url));
    this.socket.on("disconnect", () => console.log("Disconnected! url:", url));
  }

  // 서버로 데이터 전송할 때 사용하는 메서드
  send(packet: ServerPacket) {
    if (!this.socket) return;
    const { type, ...data } = packet;
    this.socket.emit(type, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketManager = new SocketManager();
