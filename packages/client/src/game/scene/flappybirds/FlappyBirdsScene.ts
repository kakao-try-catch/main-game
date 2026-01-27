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
  UpdatePositionsEvent,
  GameOverEvent,
  PlayerId,
  PipeData,
  ScoreUpdateEvent,
  FlappyBirdGameEndData,
} from '../../types/flappybird.types';
import type { PlayerResultData } from '../../types/common';
import { CONSTANTS } from '../../types/common';
import type { FlappyBirdGamePreset, ResolvedFlappyBirdConfig } from '../../types/FlappyBirdGamePreset';
import { resolveFlappyBirdPreset, DEFAULT_FLAPPYBIRD_PRESET } from '../../types/FlappyBirdGamePreset';
import PipeManager from './PipeManager';

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

  // 밧줄
  private ropes: Phaser.GameObjects.Graphics[] = [];
  private ropeMidPoints: { y: number; vy: number }[] = []; // 밧줄 중간 지점의 관성 데이터
  private ropeConnections: [number, number][] = []; // 밧줄 연결 쌍 (새 인덱스)
  private gameStarted: boolean = false; // 게임 시작 여부 (1초 딜레이 동기화)
  private isGameOver: boolean = false; // 게임 오버 여부
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private showDebug: boolean = false;
  private gameConfig: ResolvedFlappyBirdConfig = resolveFlappyBirdPreset(DEFAULT_FLAPPYBIRD_PRESET);

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
      // Mock 모드가 아닐 경우 즉시 시작 (또는 서버 신호 대기)
      this.gameStarted = true;
      // BootScene에 준비 완료 신호 보내기
      this.events.emit('scene-ready');
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

      // 크기 조정 (기존보다 축소: 80x50)
      bird.setDisplaySize(80 * ratio, 50 * ratio);

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

    // 기본: 수평 일렬 배치
    if (!this.gameConfig.connectAll || count < 3) {
      const startX = 200;
      const startY = 300;
      return Array.from({ length: count }, (_, i) => ({
        x: startX + i * 120,
        y: startY,
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

    console.log(`[FlappyBirdsScene] ${ropeCount}개의 밧줄 생성 완료 (연결: ${this.ropeConnections.map(c => `${c[0]}-${c[1]}`).join(', ')})`);
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
    this.events.on('updatePlayers', (data: { playerCount?: number; players?: { name: string }[]; preset?: FlappyBirdGamePreset }) => {
      console.log(
        `[FlappyBirdsScene] 플레이어 업데이트 수신: ${data.playerCount}명`,
      );
      const oldPlayerCount = this.playerCount;
      this.playerCount = data.playerCount || 4;

      // 플레이어 이름 업데이트
      if (data.players && data.players.length > 0) {
        this.playerNames = data.players.map((p, i) => p.name || `Player ${i + 1}`);
        console.log(`[FlappyBirdsScene] 플레이어 이름 업데이트:`, this.playerNames);
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
          this.gameConfig.connectAll !== newConfig.connectAll
        ) {
          connectAllChanged = this.gameConfig.connectAll !== newConfig.connectAll;
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
    });

    // 위치 업데이트 수신
    this.socket.on('update_positions', (data: UpdatePositionsEvent) => {
      this.targetPositions = data.birds;

      // 파이프 데이터 저장 (update()에서 처리)
      if (data.pipes) {
        this.targetPipes = data.pipes;
      }
    });

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

    // Q키 - Bird 0
    this.input.keyboard?.on('keydown-Q', (e: KeyboardEvent) => {
      onKeydown(e, '0');
    });

    // W키 - Bird 1
    this.input.keyboard?.on('keydown-W', (e: KeyboardEvent) => {
      onKeydown(e, '1');
    });

    // E키 - Bird 2
    this.input.keyboard?.on('keydown-E', (e: KeyboardEvent) => {
      onKeydown(e, '2');
    });

    // R키 - Bird 3
    this.input.keyboard?.on('keydown-R', (e: KeyboardEvent) => {
      onKeydown(e, '3');
    });

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
    this.socket.emit('flap', {
      playerId: playerId,
      timestamp: Date.now(),
    });

    // React로 점프 사운드 재생 이벤트 전달
    this.events.emit('flappyJump');

    console.log(`[FlappyBirdsScene] Bird ${playerId} Flap!`);
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
    // 선형 보간으로 부드러운 이동
    const ratio = this.getRatio();
    for (let i = 0; i < this.birdSprites.length; i++) {
      const sprite = this.birdSprites[i];
      const target = this.targetPositions[i];

      if (target) {
        // 서버 데이터를 기반으로 스프라이트 위치 보간 (ratio 적용)
        sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y * ratio, 0.3);

        // 회전 애니메이션: 기본적으로 서버에서 보낸 각도를 우선 사용하고,
        // 서버 각도가 0이면 velocityY를 기반으로 부드럽게 계산
        let angle = target.angle;
        if (angle === 0) {
          angle = Phaser.Math.Clamp(target.velocityY * 10, -30, 90);
        }

        // 게임 오버 상태에서 바닥 부근에 있으면 확실하게 수직 상태(90도) 유지
        if (this.isGameOver && sprite.y > (FLAPPY_GROUND_Y - 30) * ratio) {
          angle = 90;
        }

        sprite.rotation = Phaser.Math.DegToRad(angle);
      }
    }

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
        0.1
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

    // 새 히트박스 (80x50, radius 10)
    this.debugGraphics.lineStyle(2, 0xff00ff, 1); // 마젠타
    for (const sprite of this.birdSprites) {
      // MockServerCore.ts의 createBirds와 동일한 크기 및 둥근 모서리
      const x = sprite.x - 40; // 80 / 2
      const y = sprite.y - 25; // 50 / 2
      this.debugGraphics.strokeRoundedRect(x, y, 80, 50, 10);
    }

    // 파이프 히트박스
    this.debugGraphics.lineStyle(2, 0x00ffff, 1); // 시안
    for (const pipeData of this.targetPipes) {
      const halfW = pipeData.width / 2;
      const gapTop = pipeData.gapY - pipeData.gap / 2;
      const gapBottom = pipeData.gapY + pipeData.gap / 2;

      // 위쪽 파이프
      this.debugGraphics.strokeRect(
        pipeData.x - halfW,
        0,
        pipeData.width,
        gapTop,
      );

      // 아래쪽 파이프
      this.debugGraphics.strokeRect(
        pipeData.x - halfW,
        gapBottom,
        pipeData.width,
        GAME_HEIGHT - gapBottom,
      );
    }

    // 바닥 히트박스 (y=800)
    this.debugGraphics.lineStyle(2, 0xff0000, 1); // 빨간색
    this.debugGraphics.lineBetween(
      0,
      FLAPPY_GROUND_Y,
      GAME_WIDTH,
      FLAPPY_GROUND_Y,
    );
  }

  /**
   * 클라이언트 측 새 스프라이트 위치 및 관성을 이용한 밧줄 그리기 (느슨할 때만 처짐)
   */
  private drawRopesFromSprites() {
    const ratio = this.getRatio();
    const GRAVITY = 1.5 * ratio; // 밧줄의 자체 중력
    const STIFFNESS = 0.3; // 밧줄 관성 복원력
    const DAMPING = 0.8; // 진동 감춴
    const MAX_ROPE_LENGTH = 120 * ratio; // 밧줄 최대 길이

    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      const [indexA, indexB] = this.ropeConnections[i];
      const birdA = this.birdSprites[indexA];
      const birdB = this.birdSprites[indexB];
      const midPoint = this.ropeMidPoints[i];

      if (birdA && birdB && midPoint) {
        const distance = Phaser.Math.Distance.Between(
          birdA.x,
          birdA.y,
          birdB.x,
          birdB.y,
        );

        // 1. 거리에 따른 처짐량 계산
        // 거리가 MAX_ROPE_LENGTH(120) 보다 짧으면 남는 길이만큼 아래로 처짐 발생
        let sagTarget = 2;

        if (distance < MAX_ROPE_LENGTH) {
          // 밧줄이 느슨할 때 더 뚜렷하게 곡선이 생기도록 보정 계수 상향 (1.4 -> 1.8)
          const baseSag = Math.sqrt(
            Math.pow(MAX_ROPE_LENGTH / 2, 2) - Math.pow(distance / 2, 2),
          );
          sagTarget = baseSag * 1.8;
        }

        // 2. 물리적 타겟 위치 계산
        const targetMidX = (birdA.x + birdB.x) / 2;
        const targetMidY = (birdA.y + birdB.y) / 2 + sagTarget;

        // 3. 관성 물리 시뮬레이션
        const ay = (targetMidY - midPoint.y) * STIFFNESS + GRAVITY;
        midPoint.vy = (midPoint.vy + ay) * DAMPING;
        midPoint.y += midPoint.vy;

        rope.clear();
        rope.lineStyle(6 * ratio, 0x8b4513, 0.9); // 고전적인 갈색 밧줄

        // 2차 베지어 곡선을 사용하여 부드러운 처짐 표현
        const curve = new Phaser.Curves.QuadraticBezier(
          new Phaser.Math.Vector2(birdA.x, birdA.y),
          new Phaser.Math.Vector2(targetMidX, midPoint.y),
          new Phaser.Math.Vector2(birdB.x, birdB.y),
        );

        const points = curve.getPoints(16);
        rope.strokePoints(points);
      }
    }
  }

  /**
   * 플레이어 데이터 생성 (결과 모달용)
   */
  private getPlayersData(): PlayerResultData[] {
    return Array.from({ length: this.playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: this.playerNames[i] || `Player ${i + 1}`,
      score: this.currentScore, // 팀 점수이므로 모든 플레이어가 같은 점수
      color: CONSTANTS.PLAYER_COLORS[i] || '#000000',
      playerIndex: i,
    }));
  }

  /**
   * 씬 종료 시 정리
   */
  shutdown() {
    console.log('[FlappyBirdsScene] shutdown 호출됨');

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
