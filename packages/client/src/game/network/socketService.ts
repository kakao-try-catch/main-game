import type { Socket } from 'socket.io-client';
import { MockSocket } from './MockSocket';
import { socketManager } from '../../network/socket';

/**
 * 환경 변수 기반 소켓 팩토리
 * Mock 모드와 실제 서버 모드를 자동으로 전환합니다.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_SERVER === 'true';

let mockSocketInstance: MockSocket | null = null;

/**
 * 소켓 인스턴스 가져오기 (싱글톤)
 * 실제 서버 모드에서는 socketManager의 소켓을 사용
 */
export function getSocket(): Socket | MockSocket {
  if (USE_MOCK) {
    if (!mockSocketInstance) {
      console.log('[SocketService] Mock 모드로 실행 중');
      mockSocketInstance = new MockSocket();
    }
    return mockSocketInstance;
  } else {
    // 실제 서버 모드: socketManager의 소켓 사용 (방에 참가한 소켓)
    const socket = socketManager.getSocket();
    if (!socket) {
      throw new Error('[SocketService] socketManager에 소켓이 없습니다. 먼저 연결해주세요.');
    }
    return socket;
  }
}

/**
 * 소켓 연결 해제
 */
export function disconnectSocket() {
  if (mockSocketInstance) {
    mockSocketInstance = null;
  }
  // 실제 서버 모드에서는 socketManager가 관리하므로 여기서는 처리하지 않음
}

/**
 * Mock 모드 여부 확인
 */
export function isMockMode(): boolean {
  return USE_MOCK;
}
