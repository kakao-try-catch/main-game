import { io, Socket } from 'socket.io-client';
import { type ServerPacket } from '../../../common/src/packets.ts';
import { handleServerPacket } from './clientHandler.ts';
import { useGameStore } from '../store/gameStore.ts';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

class SocketManager {
  private socket: Socket | null = null;

  connect(url: string): void {
    // [중요] 이미 소켓이 생성되어 있고 연결 중이라면 중복 실행 방지
    if (this.socket && this.socket.connected) {
      return;
    }

    // 기존 소켓이 있지만 연결이 끊어진 경우 정리
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.io.removeAllListeners();
      this.socket = null;
    }

    // 새 연결 시작 시 소켓 끊김 상태 리셋
    const { setSocketDisconnected } = useGameStore.getState();
    setSocketDisconnected(false);

    this.socket = io(url, {
      transports: ['websocket'], // 성능을 위해 웹소켓 강제
      reconnectionAttempts: 5,
    });

    console.log('[SocketManager] io url called: ' + url);

    // 통합 핸들러 연결
    this.socket.onAny((eventName, data) => {
      // 패킷 구조가 { type, ...data } 형태라면 그대로 전달
      // 모든 수신 데이터는 ServerPacket 규격을 따름을 명시
      const packet = { type: eventName, ...data } as ServerPacket;
      handleServerPacket(packet);
    });

    this.socket.on('connect', () => {
      console.log('[SocketManager] Connected! url:', url);
    });
    this.socket.on('disconnect', (reason) => {
      console.log('[SocketManager] Disconnected! reason:', reason, 'url:', url);

      // 서버 측 또는 네트워크 문제로 인한 연결 끊김 처리
      // 'io client disconnect'는 클라이언트가 명시적으로 끊은 경우이므로 제외
      if (reason !== 'io client disconnect') {
        const { setScreen, setConnectionError, setSocketDisconnected } =
          useGameStore.getState();
        setSocketDisconnected(true);
        setConnectionError({
          message: '서버와의 연결이 끊겨 랜딩페이지로 돌아왔습니다.',
        });
        setScreen('landing');
      }
    });

    // 재연결 성공 시 상태 복원
    this.socket.on('connect', () => {
      const { setSocketDisconnected } = useGameStore.getState();
      setSocketDisconnected(false);
    });
  }

  // 서버로 데이터 전송할 때 사용하는 메서드
  send(packet: ServerPacket) {
    if (!this.socket) {
      console.warn('[SocketManager] Cannot send packet: socket is null');
      return;
    }
    const { type, ...data } = packet;
    this.socket.emit(type, data);
  }

  disconnect() {
    if (this.socket) {
      console.log('[SocketManager] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getId() {
    if (!this.socket) return null;
    return this.socket.id;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // 소켓이 연결되어 있는지 확인
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  // 소켓 재연결 (끊어진 경우에만)
  reconnect(): void {
    if (!this.isConnected()) {
      console.log('[SocketManager] Reconnecting...');
      this.connect(SERVER_URL);
    }
  }
}

export const socketManager = new SocketManager();
socketManager.connect(SERVER_URL);
