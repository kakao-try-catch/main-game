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

  // 배경 및 바닥 (무한 스크롤용)
  private groundTile!: Phaser.GameObjects.TileSprite;
  private groundLine!: Phaser.GameObjects.Rectangle;
  // 파이프 데이터 (서버로부터 받은 데이터)
  private targetPipes: PipeData[] = [];

  // 밧줄
  private ropes: Phaser.GameObjects.Graphics[] = [];
  private ropeMidPoints: { y: number; vy: number }[] = []; // 밧줄 중간 지점의 관성 데이터
  private gameStarted: boolean = false; // 게임 시작 여부 (1초 딜레이 동기화)
  private isGameOver: boolean = false; // 게임 오버 여부
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private showDebug: boolean = false;

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
    const ratio = this.getRatio();
    const width = GAME_WIDTH * ratio;
    const height = GAME_HEIGHT * ratio;

    // 고정 배경색 (카메라를 따라다님)
    const background = this.add.rectangle(0, 0, width, height, 0x46d1fd);
    background.setOrigin(0, 0);
    background.setScrollFactor(0);

    this.events.emit('scene-awake');
  }

  /* START-USER-CODE */

  // Write your code here

  preload() {
    // 새 이미지 프리로드
    this.load.image('flappybird_1', 'src/assets/images/flappybird_1.png');
    this.load.image('flappybird_2', 'src/assets/images/flappybird_2.png');
    this.load.image('flappybird_3', 'src/assets/images/flappybird_3.png');
    this.load.image('flappybird_4', 'src/assets/images/flappybird_4.png');
  }

  create() {
    this.editorCreate();

    // 소켓 연결
    this.socket = getSocket();

    // 파이프 매니저 생성
    this.pipeManager = new PipeManager(this);

    // 소켓 이벤트 리스너 (updatePlayers를 먼저 받기 위해 setupSocketListeners 호출)
    this.setupSocketListeners();

    // Mock 모드인 경우 MockServerCore 생성
    if (isMockMode() && this.socket instanceof MockSocket) {
      this.mockServerCore = new MockServerCore(this.socket as MockSocket);
      this.mockServerCore.setPlayerCount(this.playerCount); // 플레이어 수 설정
      this.mockServerCore.initialize();

      // 1초 후 물리 엔진 및 스크롤 시작 (초기화 시간 확보)
      setTimeout(() => {
        this.mockServerCore?.start();
        this.gameStarted = true; // 스크롤 허용
        console.log(
          '[FlappyBirdsScene] 물리 엔진 및 스크롤 시작 (1초 딜레이 후)',
        );
      }, 1000);

      console.log(
        `[FlappyBirdsScene] Mock 모드로 실행 중 (플레이어: ${this.playerCount}명)`,
      );
    } else {
      // Mock 모드가 아닐 경우 즉시 시작 (또는 서버 신호 대기)
      this.gameStarted = true;
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
    this.ropes = [];
    this.targetPositions = [];
    this.ropeMidPoints = []; // 밧줄 관성 데이터 초기화 (누행 방지)
    this.isGameOver = false; // 상태 초기화

    // 새 생성
    this.createBirds(this.playerCount);

    // 바닥 그리기
    this.createGroundUI();

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
    for (let i = 0; i < count; i++) {
      // 플레이어 번호에 맞는 이미지 선택 (1, 2, 3, 4 순환)
      const birdKey = `flappybird_${(i % 4) + 1}`;
      const initialX = (200 + i * 120) * ratio;
      const initialY = 300 * ratio;
      const bird = this.add.sprite(initialX, initialY, birdKey);

      // 드로잉 오더 설정: 첫 번째 플레이어가 맨 앞으로 (index 0의 depth가 가장 높도록)
      bird.setDepth(100 - i);

      // 크기 조정 (기존보다 축소: 80x50)
      bird.setDisplaySize(80 * ratio, 50 * ratio);

      this.birdSprites.push(bird);

      // 초기 타겟 위치 설정 (서버 좌표계 GAME_WIDTH 기준 그대로 저장)
      this.targetPositions.push({
        playerId: String(i) as PlayerId,
        x: 200 + i * 120,
        y: 300,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
      });
    }

    console.log(
      `[FlappyBirdsScene] ${count}개의 새(스프라이트) 생성 완료 (ratio: ${ratio})`,
    );
  }

  /**
   * 바닥 그래픽 생성 (무한 스크롤 TileSprite 방식)
   */
  private createGroundUI() {
    const ratio = this.getRatio();
    const width = GAME_WIDTH * ratio;
    const groundY = FLAPPY_GROUND_Y * ratio;
    const groundHeight = 100 * ratio;

    // 땅의 높이를 100px로 설정 (GAME_HEIGHT - 100 = FLAPPY_GROUND_Y)
    // TileSprite를 사용하여 카메라 이동 시 패턴이 반복되게 함
    this.groundTile = this.add.tileSprite(0, groundY, width, groundHeight, '');
    this.groundTile.setOrigin(0, 0);
    this.groundTile.setScrollFactor(0); // 실제 이동은 update()에서 tilePositionX로 제어

    // 바닥 색상 (패턴 대신 색상 채우기용 텍스처 생성)
    if (!this.textures.exists('groundTexture')) {
      const canvas = this.textures.createCanvas('groundTexture', 64, 128); // 넉넉하게 생성
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = '#DEB887'; // BurlyWood
        ctx.fillRect(0, 0, 64, 128);
        canvas.update();
      }
    }
    this.groundTile.setTexture('groundTexture');
    this.groundTile.setDepth(200); // 모든 요소보다 위쪽

    // 바닥 상단 갈색 선
    this.groundLine = this.add.rectangle(
      0,
      groundY,
      width,
      4 * ratio,
      0x8b4513,
    );
    this.groundLine.setOrigin(0, 0);
    this.groundLine.setScrollFactor(0);
    this.groundLine.setDepth(200);
  }

  /**
   * 밧줄 그래픽 생성
   */
  private createRopes(playerCount: number) {
    const ropeCount = Math.max(0, playerCount - 1);
    for (let i = 0; i < ropeCount; i++) {
      const rope = this.add.graphics();
      rope.setDepth(10); // 새(depth 100~97)보다 뒤쪽에 렌더링
      this.ropes.push(rope);

      // 초기 관성 데이터 초기화
      this.ropeMidPoints.push({ y: 300, vy: 0 });
    }

    console.log(`[FlappyBirdsScene] ${ropeCount}개의 밧줄 생성 완료`);
  }

  /**
   * 소켓 이벤트 리스너 설정
   */
  private setupSocketListeners() {
    // 플레이어 정보 업데이트 (인원수 조절 등)
    this.events.on('updatePlayers', (data: { playerCount?: number }) => {
      console.log(
        `[FlappyBirdsScene] 플레이어 업데이트 수신: ${data.playerCount}명`,
      );
      const oldPlayerCount = this.playerCount;
      this.playerCount = data.playerCount || 4;

      // 인원수가 변경된 경우 게임 객체 재설정
      if (oldPlayerCount !== this.playerCount) {
        if (this.mockServerCore) {
          this.mockServerCore.setPlayerCount(this.playerCount);
          this.mockServerCore.initialize();
        }
        this.setupGame();
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
      console.log(`[FlappyBirdsScene] 점수 업데이트: ${data.score}`);
    });

    // 게임 오버
    this.socket.on('game_over', (data: GameOverEvent) => {
      console.log(
        `[FlappyBirdsScene] 게임 오버: ${data.reason}, 점수: ${data.finalScore}`,
      );
      this.gameStarted = false; // 스크롤 멈춤
      this.isGameOver = true; // 게임 오버 상태 기록

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
    // 스페이스바 - 내 새 (기본)
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.handleFlap(this.myPlayerId);
    });

    // 마우스 클릭 - 내 새 (기본)
    this.input.on('pointerdown', () => {
      this.handleFlap(this.myPlayerId);
    });

    // Q키 - Bird 0 (가장 뒤)
    this.input.keyboard?.on('keydown-Q', () => {
      this.handleFlap('0');
    });

    // W키 - Bird 1
    this.input.keyboard?.on('keydown-W', () => {
      this.handleFlap('1');
    });

    // E키 - Bird 2
    this.input.keyboard?.on('keydown-E', () => {
      this.handleFlap('2');
    });

    // R키 - Bird 3 (가장 앞)
    this.input.keyboard?.on('keydown-R', () => {
      this.handleFlap('3');
    });

    // D키 - 디버그 토글
    this.input.keyboard?.on('keydown-D', () => {
      this.showDebug = !this.showDebug;
      if (!this.showDebug) {
        this.debugGraphics.clear();
      }
      console.log(
        `[FlappyBirdsScene] 디버그 시각화: ${this.showDebug ? 'ON' : 'OFF'}`,
      );
    });

    console.log(
      '[FlappyBirdsScene] 키보드 매핑: Q=Bird0(뒤), W=Bird1, E=Bird2, R=Bird3(앞), Space/Click=내 새',
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

    // 새 스프라이트의 초기 위치를 기반으로 밧줄 그리기
    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      const birdA = this.birdSprites[i];
      const birdB = this.birdSprites[i + 1];

      console.log(
        `[FlappyBirdsScene] Rope ${i}: birdA=${birdA ? `(${birdA.x}, ${birdA.y})` : 'null'}, birdB=${birdB ? `(${birdB.x}, ${birdB.y})` : 'null'}`,
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

  update(_time: number, _delta: number) {
    // 선형 보간으로 부드러운 이동
    const ratio = this.getRatio();
    for (let i = 0; i < this.birdSprites.length; i++) {
      const sprite = this.birdSprites[i];
      const target = this.targetPositions[i];

      if (target) {
        // 서버 데이터를 기반으로 스프라이트 위치 보간 (ratio 적용)
        sprite.x = Phaser.Math.Linear(sprite.x, target.x * ratio, 0.3);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y * ratio, 0.3);

        // 회전 애니메이션 (추락 시 수직으로 더 빨리 꺾이도록 배율 조정)
        let angle = Phaser.Math.Clamp(target.velocityY * 10, -30, 90);

        // 게임 오버 상태에서 바닥 부근에 있으면 수직 상태(90도) 유지
        if (this.isGameOver && sprite.y > 750 * ratio) {
          angle = 90;
        }

        sprite.rotation = Phaser.Math.DegToRad(angle);
      }
    }

    // 3. 지면 스크롤 처리 (새는 고정되고 배경/파이프가 움직이는 모델)
    if (this.gameStarted && !this.isGameOver) {
      const SPEED_PX_PER_SECOND = 90 * ratio; // 서버의 pipeSpeed(1.5/frame)와 동기화

      // 바닥 스크롤 효과 (카메라가 고정되어 있으므로 tilePositionX를 직접 증가)
      if (this.groundTile) {
        this.groundTile.tilePositionX += (SPEED_PX_PER_SECOND * _delta) / 1000;
      }
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
      const birdA = this.birdSprites[i];
      const birdB = this.birdSprites[i + 1];
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
    if (this.mockServerCore) {
      this.mockServerCore.destroy();
    }

    this.socket.off('update_positions');
    this.socket.off('score_update');
    this.socket.off('game_over');
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
