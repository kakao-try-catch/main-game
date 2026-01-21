import { io, Socket } from 'socket.io-client';
import { MockSocket } from './MockSocket';

/**
 * 환경 변수 기반 소켓 팩토리
 * Mock 모드와 실제 서버 모드를 자동으로 전환합니다.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_SERVER === 'true';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

let socketInstance: Socket | MockSocket | null = null;

/**
 * 소켓 인스턴스 가져오기 (싱글톤)
 */
export function getSocket(): Socket | MockSocket {
    if (!socketInstance) {
        if (USE_MOCK) {
            console.log('[SocketService] Mock 모드로 실행 중');
            socketInstance = new MockSocket();
        } else {
            console.log(`[SocketService] 실제 서버 연결 중: ${SERVER_URL}`);
            socketInstance = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
        }
    }

    return socketInstance;
}

/**
 * 소켓 연결 해제
 */
export function disconnectSocket() {
    if (socketInstance) {
        if ('disconnect' in socketInstance) {
            socketInstance.disconnect();
        }
        socketInstance = null;
    }
}

/**
 * Mock 모드 여부 확인
 */
export function isMockMode(): boolean {
    return USE_MOCK;
}
