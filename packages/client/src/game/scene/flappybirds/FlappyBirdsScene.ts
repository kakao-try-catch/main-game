// You can write more code here

/* START OF COMPILED CODE */

import Phaser from 'phaser';
import type { Socket } from 'socket.io-client';
import { getSocket, isMockMode } from '../../network/socketService';
import { MockSocket } from '../../network/MockSocket';
import { MockServerCore } from '../../physics/MockServerCore';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  FLAPPY_GROUND_Y,
} from '../../config/gameConfig';
import type {
  BirdPosition,
  GameOverEvent,
  PlayerId,
  PipeData,
  ScoreUpdateEvent,
  FlappyBirdGameEndData,
} from '../../types/flappybird.types';
import type { PlayerResultData } from '../../types/common';
import { CONSTANTS } from '../../types/common';
import type {
  FlappyBirdGamePreset,
  ResolvedFlappyBirdConfig,
} from '../../../../../common/src/config';
import {
  resolveFlappyBirdPreset,
  GameType,
  FLAPPY_PHYSICS,
} from '../../../../../common/src/config';
import {
  FlappyBirdPacketType,
  type FlappyJumpPacket,
} from '../../../../../common/src/packets';
import PipeManager from './PipeManager';
import { useGameStore, type GameState } from '../../../store/gameStore';
import { socketManager } from '../../../network/socket';
import type {
  FlappyBirdData,
  FlappyPipeData,
} from '../../../../../common/src/common-type';
import { RopeRenderer } from './RopeRenderer';

interface InputRecord {
  timestamp: number;
  serverTick: number;
  action: 'jump';
}

interface FlappyStateSelection {
  birds: FlappyBirdData[];
  pipes: FlappyPipeData[];
  score: number;
  cameraX: number;
  isGameOver: boolean;
  gameOverData: {
    reason: 'pipe_collision' | 'ground_collision';
    collidedPlayerIndex: number;
    finalScore: number;
  } | null;
  serverTick: number;
}

export const DEFAULT_FLAPPYBIRD_PRESET: FlappyBirdGamePreset = {
  pipeSpeed: 'normal',
  pipeSpacing: 'normal',
  pipeGap: 'normal',
  pipeWidth: 'normal',
  ropeLength: 'normal',
  connectAll: false,
};

export default class FlappyBirdsScene extends Phaser.Scene {
  private socket!: Socket | MockSocket;
  private mockServerCore?: MockServerCore;
  private myPlayerId: PlayerId = '0';
  private pipeManager?: PipeManager;
  private playerCount: number = 4;
  private playerNames: string[] = [
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ]; // 플레이어 이름 (서버에서 받거나 기본값)
  private currentScore: number = 0; // 현재 팀 점수

  // 새 스프라이트
  private birdSprites: Phaser.GameObjects.Sprite[] = [];
  private targetPositions: BirdPosition[] = [];

  // 바닥 (무한 스크롤용)
  private groundTile!: Phaser.GameObjects.TileSprite;
  private background!: Phaser.GameObjects.TileSprite;

  // 파이프 데이터 (서버로부터 받은 데이터)
  private targetPipes: PipeData[] = [];

  // Local Prediction (CSP)
  private myY: number = 0;
  private myVy: number = 0;
  private syncErrorY: number = 0; // Reconciliation error to smooth out
  private lastUpdateTime: number = 0;

  // 밧줄
  private ropes: Phaser.GameObjects.Graphics[] = [];
  private ropeMidPoints: { y: number; vy: number }[] = []; // 밧줄 중간 지점의 관성 데이터
  private ropeConnections: [number, number][] = []; // 밧줄 연결 쌍 (새 인덱스)
  private lastRopeTensions: number[] = []; // 이전 프레임의 장력 데이터 (진동 효과용)
  private gameStarted: boolean = false; // 게임 시작 여부 (1초 딜레이 동기화)
  private isGameOver: boolean = false; // 게임 오버 여부
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private showDebug: boolean = false;
  private gameConfig: ResolvedFlappyBirdConfig = resolveFlappyBirdPreset(
    DEFAULT_FLAPPYBIRD_PRESET,
  );
  private storeUnsubscribe?: () => void; // Zustand store 구독 해제 함수

  // Input history for CSP
  private inputHistory: InputRecord[] = [];
  private readonly INPUT_HISTORY_SIZE = 60; // 약 1초 분량

  constructor() {
    super('FlappyBirdsScene');

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  private getRatio(): number {
    return (window as unknown as { __GAME_RATIO?: number }).__GAME_RATIO || 1;
  }

  editorCreate(): void {
    this.events.emit('scene-awake');
  }

  /* START-USER-CODE */

  // Write your code here

  create() {
    console.log('[FlappyBirdsScene] create 메서드 시작');

    // 이전 게임 상태 초기화 (리플레이 시 필요)
    useGameStore.getState().resetFlappyState();

    // 소켓 연결 먼저 (기존 리스너 정리를 위해)
    this.socket = getSocket();

    // 기존 소켓 이벤트 완전 정리 (중복 방지)
    this.socket.off('update_positions');
    this.socket.off('score_update');
    this.socket.off('game_over');
    this.events.off('updatePlayers');
    console.log('[FlappyBirdsScene] 기존 소켓 이벤트 리스너 제거 완료');

    // 기존 스프라이트, 그래픽, 파이프 파괴
    this.birdSprites.forEach((bird) => bird?.destroy());
    this.background?.destroy();

    this.ropes.forEach((rope) => rope?.destroy());
    if (this.pipeManager) {
      this.pipeManager.destroy();
    }
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
    if (this.groundTile) {
      this.groundTile.destroy();
    }

    // 기존 상태 초기화 (중복 생성 방지)
    this.birdSprites = [];
    this.targetPositions = [];
    this.ropes = [];
    this.ropeMidPoints = [];
    this.targetPipes = [];
    this.currentScore = 0;
    this.gameStarted = false;
    this.isGameOver = false;

    this.editorCreate();

    // 파이프 매니저 생성
    this.pipeManager = new PipeManager(this);

    // 소켓 이벤트 리스너 (updatePlayers를 먼저 받기 위해 setupSocketListeners 호출)
    this.setupSocketListeners();

    // Mock 모드인 경우 MockServerCore 생성
    if (isMockMode() && this.socket instanceof MockSocket) {
      // 기존 MockServerCore 파괴
      if (this.mockServerCore) {
        this.mockServerCore.destroy();
      }

      this.mockServerCore = new MockServerCore(this.socket as MockSocket);
      this.mockServerCore.setPlayerCount(this.playerCount); // 플레이어 수 설정
      this.mockServerCore.initialize(this.gameConfig); // 프리셋 설정 적용

      // 1초 후 물리 엔진 및 스크롤 시작 (초기화 시간 확보)
      setTimeout(() => {
        this.mockServerCore?.start();
        this.gameStarted = true; // 스크롤 허용
        console.log(
          '[FlappyBirdsScene] 물리 엔진 및 스크롤 시작 (1초 딜레이 후)',
        );
        // BootScene에 준비 완료 신호 보내기
        this.events.emit('scene-ready');
      }, 1000);

      console.log(
        `[FlappyBirdsScene] Mock 모드로 실행 중 (플레이어: ${this.playerCount}명)`,
      );
    } else {
      // 실제 서버 모드: Store 구독 설정
      this.setupStoreSubscription();

      // 서버에서 플레이어 인덱스 가져오기
      const store = useGameStore.getState();

      // 서버 설정 적용
      if (store.gameConfig && store.selectedGameType === GameType.FLAPPY_BIRD) {
        this.gameConfig = resolveFlappyBirdPreset(
          store.gameConfig as FlappyBirdGamePreset,
        );
        console.log('[FlappyBirdsScene] 서버 설정 적용:', this.gameConfig);
      }

      this.myPlayerId = String(store.myselfIndex) as PlayerId;
      this.playerCount = store.players.length || 4;
      this.playerNames = store.players.map(
        (p: any, i: number) => p.playerName || `Player ${i + 1}`,
      );

      // 게임 시작
      this.gameStarted = true;
      // BootScene에 준비 완료 신호 보내기
      this.events.emit('scene-ready');
      console.log(
        `[FlappyBirdsScene] 실제 서버 모드로 실행 중 (플레이어: ${this.playerCount}명, 내 인덱스: ${this.myPlayerId})`,
      );
    }

    // 초기 게임 객체 생성
    this.setupGame();

    // 입력 처리
    this.setupInput();

    // 디버그 그래픽
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(1000); // 최상단

    console.log('[FlappyBirdsScene] 씬 생성 완료');
  }

  private setupStoreSubscription(): void {
    // Zustand store 구독 (실제 서버 모드에서만 사용)
    this.storeUnsubscribe = (useGameStore as any).subscribe(
      (state: GameState): FlappyStateSelection => ({
        birds: state.flappyBirds,
        pipes: state.flappyPipes,
        score: state.flappyScore,
        cameraX: state.flappyCameraX,
        isGameOver: state.isFlappyGameOver,
        gameOverData: state.flappyGameOverData,
        serverTick: state.flappyServerTick,
      }),
      (current: FlappyStateSelection, previous: FlappyStateSelection) => {
        // 새 위치 데이터 업데이트
        if (current.birds.length > 0 && !this.isGameOver) {
          this.targetPositions = current.birds.map(
            (bird: FlappyBirdData, index: number): BirdPosition => ({
              playerId: String(index) as PlayerId,
              x: bird.x,
              y: bird.y,
              velocityX: bird.vx,
              velocityY: bird.vy,
              angle: bird.angle,
            }),
          );

          // 서버 상태와 동기화 및 미확인 입력 재시뮬레이션
          this.onServerStateReceived(current.serverTick);
        }

        // 파이프 데이터 업데이트
        if (current.pipes.length > 0 && !this.isGameOver) {
          this.targetPipes = current.pipes.map(
            (pipe: FlappyPipeData): PipeData => ({
              id: String(pipe.id),
              x: pipe.x,
              gapY: pipe.gapY,
              width: pipe.width,
              gap: pipe.gap,
              passed: false,
              passedPlayers: [],
            }),
          );
        }

        // 점수 변경 시 사운드
        if (current.score !== previous.score) {
          this.currentScore = current.score;
          this.events.emit('flappyScore');
          this.events.emit('scoreUpdate', {
            score: current.score,
            timestamp: Date.now(),
          });
          console.log(`[FlappyBirdsScene] 점수 업데이트: ${current.score}`);
        }

        // 게임 오버 시 처리
        if (
          current.isGameOver &&
          !previous.isGameOver &&
          current.gameOverData
        ) {
          this.gameStarted = false;
          this.isGameOver = true;
          this.events.emit('flappyStrike');

          const gameOverData = current.gameOverData;
          if (!gameOverData) return;

          const gameEndData: FlappyBirdGameEndData = {
            finalScore: gameOverData.finalScore,
            reason: gameOverData.reason,
            collidedPlayerId: String(
              gameOverData.collidedPlayerIndex,
            ) as PlayerId,
            collidedPlayerName: gameOverData.collidedPlayerName,
            gameDuration: gameOverData.gameDuration,
            playerStats: gameOverData.playerStats,
            timestamp: Date.now(),
          };

          this.events.emit('gameEnd', {
            ...gameEndData,
            players: this.getPlayersData(),
          });

          console.log(
            `[FlappyBirdsScene] 게임 오버: ${gameOverData.reason}, 점수: ${gameOverData.finalScore}`,
          );
        }
      },
    );
  }

  /**
   * 게임 객체 초기화 (새, 바닥, 밧줄)
   */
  private setupGame() {
    // 기존 객체 제거
    this.birdSprites.forEach((bird) => bird.destroy());
    this.ropes.forEach((rope) => rope.destroy());
    this.birdSprites = [];
    this.background?.destroy();
    this.ropes = [];
    this.targetPositions = [];
    this.ropeMidPoints = []; // 밧줄 관성 데이터 초기화 (누행 방지)
    this.lastRopeTensions = []; // 장력 데이터 초기화
    this.isGameOver = false; // 상태 초기화

    // 새 생성
    this.createBirds(this.playerCount);

    // 바닥 그리기
    this.createGroundUI();

    // 배경 그리기
    this.createBackgroundUI();

    // 밧줄 생성
    this.createRopes(this.playerCount);

    // 초기 밧줄 그리기
    this.drawInitialRopes();
  }

  /**
   * 새 생성
   */
  private createBirds(count: number) {
    const ratio = this.getRatio();
    const positions = this.calculateBirdPositions(count);

    for (let i = 0; i < count; i++) {
      // 플레이어 번호에 맞는 이미지 선택 (1, 2, 3, 4 순환)
      const birdKey = `flappybird_${(i % 4) + 1}`;
      const { x, y } = positions[i];
      const bird = this.add.sprite(x * ratio, y * ratio, birdKey);

      // 드로잉 오더 설정: 첫 번째 플레이어가 맨 앞으로 (index 0의 depth가 가장 높도록)
      bird.setDepth(100 - i);

      // 크기 조정 (기존보다 축소: 72x53)
      bird.setDisplaySize(72 * ratio, 53 * ratio);

      this.birdSprites.push(bird);

      // 초기 타겟 위치 설정 (서버 좌표계 GAME_WIDTH 기준 그대로 저장)
      this.targetPositions.push({
        playerId: String(i) as PlayerId,
        x: x,
        y: y,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
      });

      // Init local physics for my bird
      if (String(i) === this.myPlayerId) {
        this.myY = y;
        this.myVy = 0;
        this.syncErrorY = 0;
        this.lastUpdateTime = this.time.now;
      }
    }

    console.log(
      `[FlappyBirdsScene] ${count}개의 새(스프라이트) 생성 완료 (connectAll=${this.gameConfig.connectAll})`,
    );
  }

  /**
   * 새 초기 위치 계산
   * connectAll=false: 수평 일렬
   * connectAll=true: 3인 삼각형, 4인 마름모
   */
  private calculateBirdPositions(count: number): { x: number; y: number }[] {
    const centerX = 300;
    const centerY = 350;
    const spacing = 80;

    // 기본: 수평 일렬 배치 (서버와 동일하게)
    if (!this.gameConfig.connectAll || count < 3) {
      const startX = 250;
      const startY = 300;
      return Array.from({ length: count }, (_, i) => ({
        x: startX + i * 90,
        y: startY + i * 3,
      }));
    }

    // 모두 묶기: 도형 형태로 배치
    if (count === 3) {
      // 삼각형: 위에 1명, 아래에 2명
      return [
        { x: centerX, y: centerY - spacing * 0.6 },
        { x: centerX - spacing, y: centerY + spacing * 0.4 },
        { x: centerX + spacing, y: centerY + spacing * 0.4 },
      ];
    }

    if (count === 4) {
      // 마름모: 상-좌-하-우
      return [
        { x: centerX, y: centerY - spacing },
        { x: centerX - spacing, y: centerY },
        { x: centerX, y: centerY + spacing },
        { x: centerX + spacing, y: centerY },
      ];
    }

    // 5인 이상: 원형 배치
    return Array.from({ length: count }, (_, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        x: centerX + spacing * Math.cos(angle),
        y: centerY + spacing * Math.sin(angle),
      };
    });
  }

  /**
   * 바닥 그래픽 생성 (무한 스크롤 TileSprite 방식)
   */
  private createGroundUI() {
    const ratio = this.getRatio();
    const width = GAME_WIDTH * ratio;
    const imgSizeRatio = 1.3;

    // 이미지의 실제 높이 가져오기
    const groundTexture = this.textures.get('flappybird_ground');
    const groundImageHeight =
      groundTexture.getSourceImage().height * imgSizeRatio;
    const groundHeight = groundImageHeight * ratio;

    // 시각적 바닥 위치를 실제 충돌 위치보다 위로 올림 (50px)
    const visualGroundOffset = 40 * ratio;
    const groundY = FLAPPY_GROUND_Y * ratio - visualGroundOffset;

    // TileSprite를 사용하여 카메라 이동 시 패턴이 반복되게 함
    this.groundTile = this.add.tileSprite(
      0,
      groundY,
      width,
      groundHeight,
      'flappybird_ground',
    );
    this.groundTile.setOrigin(0, 0);
    this.groundTile.setScrollFactor(0); // 실제 이동은 update()에서 tilePositionX로 제어
    this.groundTile.setTileScale(ratio * imgSizeRatio);
    this.groundTile.setDepth(200); // 모든 요소보다 위쪽
  }

  /**
   * 배경  그래픽 생성 (무한 스크롤 TileSprite 방식)
   */
  private createBackgroundUI() {
    const backgroundKey = `flappybird_background`;
    const ratio = this.getRatio();
    const width = GAME_WIDTH * ratio;
    const offset = 70;
    const height = GAME_HEIGHT * ratio + offset;

    // TileSprite 생성 (화면 전체 크기)
    this.background = this.add.tileSprite(
      0,
      -offset,
      width,
      height,
      backgroundKey,
    );
    this.background.setOrigin(0, 0);
    this.background.setScrollFactor(0);
    this.background.setAlpha(0.5);

    // 깊이 설정: 가장 뒤에 배치
    this.background.setDepth(-1);

    // 이미지 크기가 화면에 비해 너무 크거나 작다면 scale 조절 (선택 사항)
    this.background.setTileScale(ratio);
  }

  /**
   * 밧줄 연결 쌍 계산
   * 2인: 1개 (선형), 3인: 3개 (삼각형), 4인: 4개 (사각형)
   */
  /**
   * 밧줄 연결 쌍 계산
   * connectAll=false: 선형 연결 (0-1, 1-2, 2-3)
   * connectAll=true: 폐쇄형 도형 (2인: 선형, 3인: 삼각형, 4인: 사각형)
   */
  private calculateRopeConnections(playerCount: number): [number, number][] {
    if (playerCount < 2) return [];

    // 선형 연결 (기본)
    const connections: [number, number][] = [];
    for (let i = 0; i < playerCount - 1; i++) {
      connections.push([i, i + 1]);
    }

    // 모두 묶기: 마지막 새와 첫 번째 새 연결 (3인 이상)
    if (this.gameConfig.connectAll && playerCount >= 3) {
      connections.push([playerCount - 1, 0]);
    }

    return connections;
  }

  /**
   * 밧줄 그래픽 생성
   */
  private createRopes(playerCount: number) {
    // 연결 쌍 계산
    this.ropeConnections = this.calculateRopeConnections(playerCount);
    const ropeCount = this.ropeConnections.length;

    for (let i = 0; i < ropeCount; i++) {
      const rope = this.add.graphics();
      rope.setDepth(10); // 새(depth 100~97)보다 뒤쪽에 렌더링
      this.ropes.push(rope);

      // 초기 관성 데이터 초기화
      this.ropeMidPoints.push({ y: 300, vy: 0 });
    }

    console.log(
      `[FlappyBirdsScene] ${ropeCount}개의 밧줄 생성 완료 (연결: ${this.ropeConnections.map((c) => `${c[0]}-${c[1]}`).join(', ')})`,
    );
  }

  /**
   * 소켓 이벤트 리스너 설정
   */
  private setupSocketListeners() {
    // 기존 리스너 제거 (중복 등록 방지)
    this.events.off('updatePlayers');
    this.socket.off('update_positions');
    this.socket.off('score_update');
    this.socket.off('game_over');

    // 플레이어 정보 업데이트 (인원수 조절 등)
    this.events.on(
      'updatePlayers',
      (data: {
        playerCount?: number;
        players?: { name: string }[];
        preset?: FlappyBirdGamePreset;
      }) => {
        console.log(
          `[FlappyBirdsScene] 플레이어 업데이트 수신: ${data.playerCount}명`,
        );
        const oldPlayerCount = this.playerCount;
        this.playerCount = data.playerCount || 4;

        // 플레이어 이름 업데이트
        if (data.players && data.players.length > 0) {
          this.playerNames = data.players.map(
            (p, i) => p.name || `Player ${i + 1}`,
          );
          console.log(
            `[FlappyBirdsScene] 플레이어 이름 업데이트:`,
            this.playerNames,
          );
        }

        // 프리셋이 있으면 게임 설정 업데이트
        let configChanged = false;
        let connectAllChanged = false;
        if (data.preset) {
          const newConfig = resolveFlappyBirdPreset(data.preset);
          // 설정이 변경되었는지 확인
          if (
            this.gameConfig.pipeSpeed !== newConfig.pipeSpeed ||
            this.gameConfig.pipeSpacing !== newConfig.pipeSpacing ||
            this.gameConfig.pipeGap !== newConfig.pipeGap ||
            this.gameConfig.pipeWidth !== newConfig.pipeWidth ||
            this.gameConfig.ropeLength !== newConfig.ropeLength ||
            this.gameConfig.connectAll !== newConfig.connectAll
          ) {
            connectAllChanged =
              this.gameConfig.connectAll !== newConfig.connectAll;
            this.gameConfig = newConfig;
            configChanged = true;
            console.log(`[FlappyBirdsScene] 프리셋 적용:`, this.gameConfig);
          }
        }

        // 인원수가 변경되었거나 설정이 변경된 경우 게임 객체 재설정
        if (oldPlayerCount !== this.playerCount || configChanged) {
          if (this.mockServerCore) {
            this.mockServerCore.setPlayerCount(this.playerCount);
            this.mockServerCore.initialize(this.gameConfig);
          }
          // 인원수 또는 connectAll이 변경된 경우 밧줄 재생성
          if (oldPlayerCount !== this.playerCount || connectAllChanged) {
            this.setupGame();
          }
        }
      },
    );

    // 위치 업데이트 수신 (Deprecated: Store 구독 방식으로 변경됨)
    // this.socket.on('update_positions', (data: UpdatePositionsEvent) => {
    //   if (this.isGameOver) {
    //     return;
    //   }
    //   this.targetPositions = data.birds;

    //   // 파이프 데이터 저장 (update()에서 처리)
    //   if (data.pipes) {
    //     this.targetPipes = data.pipes;
    //   }
    // });

    // 점수 업데이트
    this.socket.on('score_update', (data: ScoreUpdateEvent) => {
      this.currentScore = data.score;
      // React로 점수 업데이트 이벤트 전달
      this.events.emit('scoreUpdate', {
        score: data.score,
        timestamp: data.timestamp,
      });
      // 점수 획득 사운드 재생 이벤트 전달
      this.events.emit('flappyScore');
      console.log(`[FlappyBirdsScene] 점수 업데이트: ${data.score}`);
    });

    // 게임 오버
    this.socket.on('game_over', (data: GameOverEvent) => {
      console.log(
        `[FlappyBirdsScene] 게임 오버: ${data.reason}, 점수: ${data.finalScore}`,
      );
      this.gameStarted = false; // 스크롤 멈춤
      this.isGameOver = true; // 게임 오버 상태 기록
      this.events.emit('flappyStrike');
      // React로 게임 종료 데이터 전달
      const gameEndData: FlappyBirdGameEndData = {
        finalScore: data.finalScore,
        reason: data.reason,
        collidedPlayerId: data.collidedPlayerId,
        collidedPlayerName: data.collidedPlayerName,
        gameDuration: data.gameDuration,
        playerStats: data.playerStats,
        timestamp: data.timestamp,
      };

      this.events.emit('gameEnd', {
        ...gameEndData,
        players: this.getPlayersData(),
      });
    });
  }

  /**
   * 입력 처리 설정
   */
  private setupInput() {
    // 키보드 반복(꾹 누르기) 방지용 핸들러
    const onKeydown = (e: KeyboardEvent, playerId: PlayerId) => {
      if (e.repeat) return; // 꾹 누르고 있을 때 발생하는 반복 이벤트 무시
      this.handleFlap(playerId);
    };

    // 스페이스바 (내 새)
    this.input.keyboard?.on('keydown-SPACE', (e: KeyboardEvent) => {
      onKeydown(e, this.myPlayerId);
    });

    // 마우스 클릭 (내 새) - 마우스는 반복 이벤트가 없으므로 그대로 유지
    this.input.on('pointerdown', () => {
      this.handleFlap(this.myPlayerId);
    });

    // // Q키 - Bird 0
    // this.input.keyboard?.on('keydown-Q', (e: KeyboardEvent) => {
    //   onKeydown(e, '0');
    // });
    //
    // // W키 - Bird 1
    // this.input.keyboard?.on('keydown-W', (e: KeyboardEvent) => {
    //   onKeydown(e, '1');
    // });
    //
    // // E키 - Bird 2
    // this.input.keyboard?.on('keydown-E', (e: KeyboardEvent) => {
    //   onKeydown(e, '2');
    // });
    //
    // // R키 - Bird 3
    // this.input.keyboard?.on('keydown-R', (e: KeyboardEvent) => {
    //   onKeydown(e, '3');
    // });

    // D키 - 디버그 토글
    this.input.keyboard?.on('keydown-D', () => {
      this.showDebug = !this.showDebug;
      if (!this.showDebug) {
        this.debugGraphics.clear();
      }
    });

    console.log(
      '[FlappyBirdsScene] 입력 방식: 순수 연타(Tapping) 모드 - 꾹 누르기가 방지되었습니다.',
    );
  }

  /**
   * Flap 처리
   */
  private handleFlap(playerId: PlayerId) {
    if (this.isGameOver) {
      return;
    }

    if (isMockMode()) {
      // Mock 모드: 기존 형식 유지
      this.socket.emit('flap', {
        playerId: playerId,
        timestamp: Date.now(),
      });
    } else {
      // 실제 서버 모드: FLAPPY_JUMP 패킷 전송
      // 서버는 socket.id로 playerIndex를 결정하므로 playerId 전송 불필요
      const jumpPacket: FlappyJumpPacket = {
        type: FlappyBirdPacketType.FLAPPY_JUMP,
        timestamp: Date.now(),
      };
      socketManager.send(jumpPacket);
    }

    // Client-Side Prediction: Apply jump immediately
    if (playerId === this.myPlayerId) {
      this.myVy = FLAPPY_PHYSICS.FLAP_VELOCITY;

      // 입력 기록 추가
      this.inputHistory.push({
        timestamp: Date.now(),
        serverTick: useGameStore.getState().flappyServerTick,
        action: 'jump',
      });

      // 오래된 입력 제거
      if (this.inputHistory.length > this.INPUT_HISTORY_SIZE) {
        this.inputHistory.shift();
      }
    }

    // React로 점프 사운드 재생 이벤트 전달
    this.events.emit('flappyJump');

    console.log(`[FlappyBirdsScene] Bird ${playerId} Flap!`);
  }

  /**
   * 밧줄 예측 반영
   */
  private predictRopeInteraction(): void {
    const myIndex = Number(this.myPlayerId);

    for (const [indexA, indexB] of this.ropeConnections) {
      // 내 새와 연결된 밧줄만 처리
      if (indexA !== myIndex && indexB !== myIndex) continue;

      const connectedIndex = indexA === myIndex ? indexB : indexA;
      const connectedTarget = this.targetPositions[connectedIndex];

      if (!connectedTarget) continue;

      // 내 예측 위치와 연결된 새의 서버 위치 사이 거리 계산
      const myPredictedY = this.myY;
      const connectedY = connectedTarget.y;

      const dx = connectedTarget.x - this.targetPositions[myIndex].x;
      const dy = connectedY - myPredictedY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 밧줄이 늘어나면 내 예측 위치 보정
      if (distance > this.gameConfig.ropeLength) {
        const excess = distance - this.gameConfig.ropeLength;
        const ny = dy / distance;

        // 내 새를 연결된 새 방향으로 당김
        this.myY += ny * excess * 0.3; // 30%만 보정 (부드럽게)
      }
    }
  }

  /**
   * 서버 상태와 로컬 예측 차이 보정 (Reconciliation)
   */
  private reconcileWithServer(): void {
    const myIndex = Number(this.myPlayerId);
    const target = this.targetPositions[myIndex];

    if (!target) return;

    const diff = target.y - this.myY;

    // 임계값 정의
    const SNAP_THRESHOLD = 100; // 100px 이상: 즉시 스냅
    const BLEND_THRESHOLD = 30; // 30px 이상: 빠른 블렌딩
    const DRIFT_THRESHOLD = 10; // 10px 이상: 느린 보정

    if (Math.abs(diff) > SNAP_THRESHOLD) {
      // 큰 차이: 즉시 스냅 (롤백 상황)
      console.log(`[Reconciliation] Snap! Diff: ${diff.toFixed(1)}`);
      this.myY = target.y;
      this.myVy = target.velocityY;
    } else if (Math.abs(diff) > BLEND_THRESHOLD) {
      // 중간 차이: 빠른 블렌딩
      this.myY = Phaser.Math.Linear(this.myY, target.y, 0.15);
      this.myVy = Phaser.Math.Linear(this.myVy, target.velocityY, 0.1);
    } else if (Math.abs(diff) > DRIFT_THRESHOLD) {
      // 작은 차이: 느린 보정 (거의 느끼지 못함)
      this.myY = Phaser.Math.Linear(this.myY, target.y, 0.05);
    }
    // DRIFT_THRESHOLD 이하: 로컬 예측 유지
  }

  /**
   * 서버 상태 수신 시 재계산
   */
  private onServerStateReceived(serverTick: number): void {
    // 서버가 확인하지 않은 입력만 남김
    this.inputHistory = this.inputHistory.filter(
      (input) => input.serverTick > serverTick,
    );

    // 남은 입력으로 예측 상태 재계산
    this.replayUnconfirmedInputs();
  }

  /**
   * 미확인 입력 재시뮬레이션
   */
  private replayUnconfirmedInputs(): void {
    // 서버 상태를 기준으로 시작
    const target = this.targetPositions[Number(this.myPlayerId)];
    if (!target) return;

    let predictedY = target.y;
    let predictedVy = target.velocityY;

    // 미확인 입력 적용
    for (const input of this.inputHistory) {
      if (input.action === 'jump') {
        predictedVy = FLAPPY_PHYSICS.FLAP_VELOCITY;
      }
      // Physics step (matching update loop)
      const dtRatio = 1.0; // Assume 60fps for server confirmation
      predictedVy += FLAPPY_PHYSICS.GRAVITY_Y * dtRatio;
      predictedVy *= Math.pow(1 - 0.05, dtRatio);
      predictedY += predictedVy * dtRatio;
    }

    // 차이가 크지 않으면 예측값 사용
    if (Math.abs(predictedY - this.myY) < 50) {
      this.myY = predictedY;
      this.myVy = predictedVy;
    }
  }

  /**
   * 다른 플레이어 보간 개선
   */
  private interpolateOtherBird(
    sprite: Phaser.GameObjects.Sprite,
    target: BirdPosition,
    ratio: number,
  ): void {
    // 속도 기반 외삽을 통한 부드러운 보간
    const predictedX = target.x + target.velocityX * 0.016 * 2; // 2프레임 예측
    const predictedY = target.y + target.velocityY * 0.016 * 2;

    // 보간 속도: 거리에 따라 조절 (멀수록 빠르게)
    const dx = predictedX * ratio - sprite.x;
    const dy = predictedY * ratio - sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const lerpFactor = Math.min(0.5, 0.2 + distance / 500);

    sprite.x = Phaser.Math.Linear(sprite.x, predictedX * ratio, lerpFactor);
    sprite.y = Phaser.Math.Linear(sprite.y, predictedY * ratio, lerpFactor);

    // 회전 애니메이션
    let angle = target.angle;
    if (angle === 0) {
      angle = Phaser.Math.Clamp(target.velocityY * 10, -30, 90);
    }

    if (this.isGameOver && sprite.y > (FLAPPY_GROUND_Y - 30) * ratio) {
      angle = 90;
    }

    sprite.rotation = Phaser.Math.DegToRad(angle);
  }

  /**
   * 초기 밧줄 그리기 (물리 엔진 시작 전)
   */
  private drawInitialRopes() {
    console.log('[FlappyBirdsScene] 초기 밧줄 그리기 시작');
    console.log(
      `[FlappyBirdsScene] ropes.length: ${this.ropes.length}, birdSprites.length: ${this.birdSprites.length}`,
    );

    // 연결 쌍을 기반으로 밧줄 그리기
    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      const [indexA, indexB] = this.ropeConnections[i];
      const birdA = this.birdSprites[indexA];
      const birdB = this.birdSprites[indexB];

      console.log(
        `[FlappyBirdsScene] Rope ${i} (${indexA}-${indexB}): birdA=${birdA ? `(${birdA.x}, ${birdA.y})` : 'null'}, birdB=${birdB ? `(${birdB.x}, ${birdB.y})` : 'null'}`,
      );

      if (birdA && birdB) {
        const ratio = this.getRatio();
        rope.clear();
        rope.lineStyle(6 * ratio, 0x8b4513, 1); // 고전적인 갈색 밧줄
        rope.beginPath();
        rope.moveTo(birdA.x, birdA.y);
        rope.lineTo(birdB.x, birdB.y);
        rope.strokePath();
      } else {
        console.warn(
          `[FlappyBirdsScene] Rope ${i} 그리기 실패: birdA 또는 birdB가 없음`,
        );
      }
    }

    console.log('[FlappyBirdsScene] 초기 밧줄 그리기 완료');
  }

  update() {
    if (this.isGameOver) {
      return;
    }
    // 선형 보간으로 부드러운 이동
    const ratio = this.getRatio();
    const now = this.time.now;
    const dt = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    // --- 1. My Bird Logic (Client-Side Prediction) ---
    if (this.gameStarted && !this.isGameOver) {
      if (dt > 0) {
        // Physics step approximation (framerate independent)
        const dtRatio = dt / (1000 / 60);

        // Gravity
        this.myVy += FLAPPY_PHYSICS.GRAVITY_Y * dtRatio;
        // Air friction (approx 0.05 per step)
        this.myVy *= Math.pow(1 - 0.05, dtRatio);

        // Position update
        this.myY += this.myVy * dtRatio;

        // Ground collision (clamp)
        const groundY =
          FLAPPY_PHYSICS.FLAPPY_GROUND_Y - FLAPPY_PHYSICS.BIRD_HEIGHT / 2;
        if (this.myY > groundY) {
          this.myY = groundY;
          this.myVy = 0;
        }
        // Ceiling collision (clamp)
        const ceilingY = FLAPPY_PHYSICS.BIRD_HEIGHT / 2;
        if (this.myY < ceilingY) {
          this.myY = ceilingY;
          if (this.myVy < 0) this.myVy = 0;
        }

        // 밧줄 상호작용 예측 반영
        this.predictRopeInteraction();
      }

      // Reconciliation with Server
      this.reconcileWithServer();
    }

    // --- 2. Update Sprites ---
    for (let i = 0; i < this.birdSprites.length; i++) {
      const sprite = this.birdSprites[i];
      const target = this.targetPositions[i];

      if (!target) continue;

      if (String(i) === this.myPlayerId && !this.isGameOver) {
        // My Bird: Use local prediction
        sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3); // X is still server-controlled (camera)
        sprite.y = this.myY * ratio;

        // My Rotation
        const angle = Phaser.Math.Clamp(this.myVy * 10, -30, 90);
        sprite.rotation = Phaser.Math.DegToRad(angle);
      } else {
        // Other Birds: Use improved interpolation
        this.interpolateOtherBird(sprite, target, ratio);
      }
    }

    // 2. 보간 후 밧줄 제약 적용 (시각적 일관성)
    this.enforceClientRopeConstraint();

    // 3. 카메라 추적: 새들의 평균 X를 화면의 1/4 지점에 유지 (게임 시작 후에만)
    if (this.gameStarted && this.birdSprites.length > 0) {
      let totalX = 0;
      for (const sprite of this.birdSprites) {
        totalX += sprite.x;
      }
      const avgX = totalX / this.birdSprites.length;

      // 새들의 평균 위치가 화면 너비의 1/4 지점에 오도록 카메라 이동
      const screenWidth = GAME_WIDTH * ratio;
      const targetCameraX = avgX - screenWidth / 4;

      // 부드러운 카메라 추적
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX,
        targetCameraX,
        0.1,
      );

      // 지면 스크롤 (카메라 위치에 동기화)
      if (this.groundTile) {
        this.groundTile.tilePositionX = this.cameras.main.scrollX;
      }
      // 배경은 scrollFactor(0)으로 카메라를 따라다니므로 별도 처리 불필요
    }

    // 4. 밧줄 그리기
    // 파이프 업데이트
    if (this.targetPipes.length > 0 && this.pipeManager) {
      // 파이프 데이터를 ratio에 맞췄 변환
      const scaledPipes = this.targetPipes.map((p) => ({
        ...p,
        x: p.x * ratio,
        gapY: p.gapY * ratio,
        gap: p.gap * ratio,
        width: p.width * ratio,
      }));
      this.pipeManager.updateFromServer(scaledPipes);
    }

    // 밧줄을 클라이언트 측 새 스프라이트 위치로 직접 그리기 (레이턴시 없음)
    this.drawRopesFromSprites();

    // 디버그 히트박스 그리기
    if (this.showDebug) {
      this.drawDebugHitboxes();
    }
  }

  /**
   * 디버그용 히트박스 시각화
   */
  private drawDebugHitboxes() {
    this.debugGraphics.clear();
    const ratio = this.getRatio();

    // 새 히트박스 (36x36 정사각형, 회전 무시)
    const hitboxSize = 36 * ratio;
    const halfHitbox = hitboxSize / 2;
    this.debugGraphics.lineStyle(2, 0xff00ff, 1); // 마젠타
    for (const sprite of this.birdSprites) {
      this.debugGraphics.strokeRect(
        sprite.x - halfHitbox,
        sprite.y - halfHitbox,
        hitboxSize,
        hitboxSize,
      );
    }

    // 파이프 히트박스
    this.debugGraphics.lineStyle(2, 0x00ffff, 1); // 시안
    for (const pipeData of this.targetPipes) {
      const pipeWidth = pipeData.width * ratio;
      const halfW = pipeWidth / 2;
      const gapY = pipeData.gapY * ratio;
      const gap = pipeData.gap * ratio;
      const gapTop = gapY - gap / 2;
      const gapBottom = gapY + gap / 2;
      const pipeX = pipeData.x * ratio;

      // 위쪽 파이프
      this.debugGraphics.strokeRect(pipeX - halfW, 0, pipeWidth, gapTop);

      // 아래쪽 파이프
      this.debugGraphics.strokeRect(
        pipeX - halfW,
        gapBottom,
        pipeWidth,
        GAME_HEIGHT * ratio - gapBottom,
      );
    }

    // 바닥 히트박스 (y=800)
    this.debugGraphics.lineStyle(2, 0xff0000, 1); // 빨간색
    this.debugGraphics.lineBetween(
      0,
      FLAPPY_GROUND_Y * ratio,
      GAME_WIDTH * ratio,
      FLAPPY_GROUND_Y * ratio,
    );
  }

  /**
   * 클라이언트 측 밧줄 제약 적용 (시각적 일관성용)
   * 보간 후 밧줄 최대 길이를 초과하면 스프라이트 위치 보정
   */
  private enforceClientRopeConstraint(): void {
    const ratio = this.getRatio();
    const maxLength = this.gameConfig.ropeLength * ratio;

    for (const [indexA, indexB] of this.ropeConnections) {
      const spriteA = this.birdSprites[indexA];
      const spriteB = this.birdSprites[indexB];
      if (!spriteA || !spriteB) continue;

      const dx = spriteB.x - spriteA.x;
      const dy = spriteB.y - spriteA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxLength && distance > 0) {
        const nx = dx / distance;
        const ny = dy / distance;
        const excess = distance - maxLength;
        const correction = excess / 2;

        // 양쪽 스프라이트를 당김
        spriteA.x += nx * correction;
        spriteA.y += ny * correction;
        spriteB.x -= nx * correction;
        spriteB.y -= ny * correction;
      }
    }
  }

  /**
   * 클라이언트 측 새 스프라이트 위치 및 RopeRenderer를 이용한 밧줄 그리기
   */
  private drawRopesFromSprites() {
    const ratio = this.getRatio();
    const configRopeLength = this.gameConfig.ropeLength * ratio;

    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      const [indexA, indexB] = this.ropeConnections[i];
      const birdA = this.birdSprites[indexA];
      const birdB = this.birdSprites[indexB];

      if (birdA && birdB) {
        const distance = Phaser.Math.Distance.Between(
          birdA.x,
          birdA.y,
          birdB.x,
          birdB.y,
        );

        // 시각 상태 계산 (70% ~ 100% 길이 사이에서 장력 표현)
        const visualState = RopeRenderer.calculateRopeVisualState(
          distance,
          configRopeLength * 0.7,
          configRopeLength,
        );

        // 현수선(Catenary) 곡선 계산
        const points = RopeRenderer.calculateCatenaryCurve(
          new Phaser.Math.Vector2(birdA.x, birdA.y),
          new Phaser.Math.Vector2(birdB.x, birdB.y),
          configRopeLength,
          20, // 세그먼트 수
        );

        // 장력 변화에 따른 떨림 효과
        const lastTension = this.lastRopeTensions[i] || 0;
        const tensionChange = visualState.tension - lastTension;
        this.addTensionVibration(points, tensionChange);
        this.lastRopeTensions[i] = visualState.tension;

        rope.clear();

        // 1. 그림자 효과
        this.drawRopeShadow(rope, points, visualState.thickness * ratio);

        // 2. 메인 밧줄 그리기
        rope.lineStyle(
          visualState.thickness * ratio,
          visualState.color,
          visualState.alpha,
        );
        rope.strokePoints(points);
      }
    }
  }

  /**
   * 밧줄 그림자 그리기
   */
  private drawRopeShadow(
    graphics: Phaser.GameObjects.Graphics,
    points: Phaser.Math.Vector2[],
    thickness: number,
  ): void {
    const shadowOffset = 3;
    graphics.lineStyle(thickness + 2, 0x000000, 0.2);

    const shadowPoints = points.map(
      (p) => new Phaser.Math.Vector2(p.x + shadowOffset, p.y + shadowOffset),
    );

    graphics.strokePoints(shadowPoints);
  }

  /**
   * 장력 변화 시 떨림 효과 추가
   */
  private addTensionVibration(
    points: Phaser.Math.Vector2[],
    tensionChange: number,
  ): void {
    if (Math.abs(tensionChange) < 0.05) return;

    const vibrationAmount = Math.min(8, Math.abs(tensionChange) * 20);

    for (let i = 1; i < points.length - 1; i++) {
      // 수직 방향으로 랜덤 진동
      points[i].y += (Math.random() - 0.5) * vibrationAmount;
      points[i].x += (Math.random() - 0.5) * (vibrationAmount * 0.5);
    }
  }

  private getPlayersData(): PlayerResultData[] {
    return Array.from({ length: this.playerCount }, (_, i) => ({
      id: `player_${i}`,
      playerName: this.playerNames[i] || `Player ${i + 1}`,
      reportCard: { score: this.currentScore }, // 팀 점수이므로 모든 플레이어가 같은 점수
      color: CONSTANTS.PLAYER_COLORS[i] || '#000000',
      playerIndex: i,
    }));
  }

  /**
   * 씬 종료 시 정리
   */
  shutdown() {
    console.log('[FlappyBirdsScene] shutdown 호출됨');

    // Store 구독 해제
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = undefined;
      console.log('[FlappyBirdsScene] Store 구독 해제 완료');
    }

    // FlappyBird 상태 초기화
    useGameStore.getState().resetFlappyState();

    // Mock 서버 코어 정리
    if (this.mockServerCore) {
      this.mockServerCore.destroy();
      this.mockServerCore = undefined;
      console.log('[FlappyBirdsScene] Mock 서버 코어 정리 완료');

      // MockSocket에서 serverCore 참조 제거
      if (this.socket instanceof MockSocket) {
        this.socket.clearServerCore();
      }
    }

    // 파이프 매니저 정리
    if (this.pipeManager) {
      this.pipeManager.destroy();
      console.log('[FlappyBirdsScene] 파이프 매니저 정리 완료');
    }

    // 소켓 이벤트 리스너 제거
    this.socket.off('update_positions');
    this.socket.off('score_update');
    this.socket.off('game_over');
    this.events.off('updatePlayers');
    console.log('[FlappyBirdsScene] 소켓 이벤트 리스너 제거 완료');
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
