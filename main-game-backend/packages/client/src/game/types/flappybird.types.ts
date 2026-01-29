/**
 * 플래피버드 게임 타입 정의
 */

// 플레이어 ID (0-3)
export type PlayerId = '0' | '1' | '2' | '3';

// 게임 상태
export const GameState = {
  WAITING: 'WAITING', // 플레이어 대기 중
  READY: 'READY', // 모두 준비 완료
  PLAYING: 'PLAYING', // 게임 진행 중
  GAME_OVER: 'GAME_OVER', // 게임 종료
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

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

// 파이프 데이터
export interface PipeData {
  id: string; // 파이프 고유 ID
  x: number; // 파이프 X 좌표
  gapY: number; // 간격 중심 Y 좌표 (서버에서 랜덤 생성)
  width: number; // 파이프 너비
  gap: number; // 위아래 파이프 사이 간격
  passed: boolean; // 점수 획득 여부
  passedPlayers: PlayerId[]; // 통과한 플레이어 ID 목록
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
  pipes: PipeData[];
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

/**
 * 플래피버드 게임 종료 데이터
 * React로 전달되어 결과 모달에 표시됨
 */
export interface FlappyBirdGameEndData {
  finalScore: number; // 팀 최종 점수
  reason: 'pipe_collision' | 'ground_collision'; // 게임 종료 사유
  collidedPlayerId: PlayerId; // 충돌한 플레이어 ID
  timestamp: number; // 게임 종료 시각
}

// 에러 이벤트
export interface ErrorEvent {
  code: 'ROOM_FULL' | 'GAME_IN_PROGRESS' | 'INVALID_PLAYER_ID';
  message: string;
}
