import { io, Socket } from "socket.io-client";
import { handleGamePacket } from "./gameHandler";
import { GamePacket } from "../../../common/src/game.packets.ts";

class GameSocket {
    private socket: Socket | null = null;

    connect(url: string) {
        this.socket = io(url, {
            transports: ["websocket"], // 성능을 위해 웹소켓 강제
            reconnectionAttempts: 5
        });

        // 통합 핸들러 연결
        this.socket.onAny((eventName, data) => {
            // 패킷 구조가 { type, ...data } 형태라면 그대로 전달
            const packet: GamePacket = { type: eventName, ...data };
            handleGamePacket(packet);
        });

        this.socket.on("connect", () => console.log("Connected!"));
        this.socket.on("disconnect", () => console.log("Disconnected!"));
    }

    // 서버로 데이터 전송할 때 사용하는 메서드
    send(packet: GamePacket) {
        if (!this.socket) return;
        const { type, ...data } = packet;
        this.socket.emit(type, data);
    }
}

export const gameSocket = new GameSocket();