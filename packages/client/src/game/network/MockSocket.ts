/**
 * Mock Socket - 서버 없이 로컬에서 테스트하기 위한 가상 소켓
 * 실제 Socket.io 클라이언트와 동일한 인터페이스를 제공합니다.
 */
export class MockSocket {
  private latencyMs: number = 50; // 네트워크 지연 시뮬레이션 (50ms)
  private serverCore: any = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    console.log('[MockSocket] 초기화됨 - 로컬 모드로 실행 중');
  }

  /**
   * MockServerCore 연결
   */
  setServerCore(serverCore: any) {
    this.serverCore = serverCore;
  }

  /**
   * 클라이언트에서 서버로 이벤트 전송 (레이턴시 시뮬레이션 포함)
   */
  emit(event: string, data?: any): boolean {
    // 레이턴시 시뮬레이션
    setTimeout(() => {
      if (this.serverCore) {
        // 클라이언트가 서버로 보내는 이벤트만 handleClientEvent로 전달
        this.serverCore.handleClientEvent(event, data);
      }
    }, this.latencyMs);

    return true;
  }

  /**
   * 서버에서 클라이언트로 이벤트 전송 (MockServerCore가 호출)
   * 이 메서드는 MockServerCore.update()에서 socket.emit() 대신 socket.triggerEvent()로 호출됩니다.
   */
  triggerEvent(event: string, data?: any): void {
    // 레이턴시 시뮬레이션
    setTimeout(() => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach((callback) => callback(data));
      }
    }, this.latencyMs);
  }

  /**
   * 서버로부터 이벤트 수신
   */
  on(event: string, callback: Function): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    return this;
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event: string, callback?: Function): this {
    if (!callback) {
      this.eventListeners.delete(event);
    } else {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
    return this;
  }

  /**
   * 연결 해제
   */
  disconnect() {
    console.log('[MockSocket] 연결 해제됨');
    this.eventListeners.clear();
  }

  /**
   * 레이턴시 설정 (테스트용)
   */
  setLatency(ms: number) {
    this.latencyMs = ms;
    console.log(`[MockSocket] 레이턴시 설정: ${ms}ms`);
  }
}
