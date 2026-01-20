/**
 * 플래피버드 게임 타입 정의
 */

// 플레이어 ID (0-3)
export type PlayerId = '0' | '1' | '2' | '3';

// 게임 상태
export const GameState = {
    WAITING: 'WAITING',     // 플레이어 대기 중
    READY: 'READY',         // 모두 준비 완료
    PLAYING: 'PLAYING',     // 게임 진행 중
    GAME_OVER: 'GAME_OVER'  // 게임 종료
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

// 새 위치 데이터
export interface BirdPosition {
    playerId: PlayerId;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    angle: number;
}

// 밧줄 정점 데이터
export interface RopeData {
    points: {
        x: number;
        y: number;
    }[];
}

// 서버 → 클라이언트: 연결 성공
export interface ConnectedEvent {
    playerId: PlayerId;
    roomId: string;
    playerCount: number;
}

// 클라이언트 → 서버: 플레이어 준비
export interface PlayerReadyEvent {
    playerId: PlayerId;
    ready: boolean;
}

// 서버 → 클라이언트: 게임 시작
export interface GameStartEvent {
    timestamp: number;
    initialPositions: {
        playerId: PlayerId;
        x: number;
        y: number;
    }[];
}

// 클라이언트 → 서버: Flap 입력
export interface FlapEvent {
    playerId: PlayerId;
    timestamp: number;
}

// 서버 → 클라이언트: 위치 업데이트
export interface UpdatePositionsEvent {
    timestamp: number;
    birds: BirdPosition[];
    ropes: RopeData[];
}

// 서버 → 클라이언트: 점수 업데이트
export interface ScoreUpdateEvent {
    score: number;
    timestamp: number;
}

// 서버 → 클라이언트: 게임 오버
export interface GameOverEvent {
    reason: 'pipe_collision' | 'ground_collision';
    finalScore: number;
    collidedPlayerId: PlayerId;
    timestamp: number;
}

// 클라이언트 → 서버: 게임 재시작
export interface RestartGameEvent {
    playerId: PlayerId;
}

// 에러 이벤트
export interface ErrorEvent {
    code: 'ROOM_FULL' | 'GAME_IN_PROGRESS' | 'INVALID_PLAYER_ID';
    message: string;
}
