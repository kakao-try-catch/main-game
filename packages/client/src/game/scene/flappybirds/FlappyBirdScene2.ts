// You can write more code here

/* START OF COMPILED CODE */

import { getSocket, isMockMode } from '../../network/socketService';
import { MockSocket } from '../../network/MockSocket';
import { MockServerCore } from '../../physics/MockServerCore';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  FLAPPY_GROUND_Y,
  FLAPPY_GROUND_HEIGHT,
  FLAPPY_GROUND_LINE_THICKNESS,
} from '../../config/gameConfig';
import type {
  BirdPosition,
  UpdatePositionsEvent,
  GameOverEvent,
  PlayerId,
} from '../../types/flappybird.types';
import type { Socket } from 'socket.io-client';

export default class FlappyBirdScene2 extends Phaser.Scene {
  private socket!: Socket | MockSocket;
  private mockServerCore?: MockServerCore;
  private myPlayerId: PlayerId = '0';

  // 새 스프라이트
  private birdSprites: Phaser.GameObjects.Ellipse[] = [];
  private targetPositions: BirdPosition[] = [];

  // 밧줄
  private ropes: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('FlappyBirdScene2');

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  editorCreate(): void {
    // rectangle_1 (배경)
    const rectangle_1 = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);
    rectangle_1.setOrigin(0, 0);
    rectangle_1.isFilled = true;
    rectangle_1.fillColor = 4630671;

    this.events.emit('scene-awake');
  }

  /* START-USER-CODE */

  // Write your code here

  create() {
    console.log('[FlappyBirdScene2] create 메서드 시작');

    // 소켓 연결 먼저 (기존 리스너 정리를 위해)
    this.socket = getSocket();

    // 기존 소켓 이벤트 완전 정리 (중복 방지)
    this.socket.off('update_positions');
    this.socket.off('game_over');
    console.log('[FlappyBirdScene2] 기존 소켓 이벤트 리스너 제거 완료');

    // 기존 스프라이트와 그래픽 파괴
    this.birdSprites.forEach((bird) => bird?.destroy());
    this.ropes.forEach((rope) => rope?.destroy());

    // 기존 상태 초기화 (중복 생성 방지)
    this.birdSprites = [];
    this.targetPositions = [];
    this.ropes = [];

    this.editorCreate();

    // Mock 모드인 경우 MockServerCore 생성
    if (isMockMode() && this.socket instanceof MockSocket) {
      // 기존 MockServerCore 파괴
      if (this.mockServerCore) {
        this.mockServerCore.destroy();
        this.mockServerCore = undefined;
      }

      this.mockServerCore = new MockServerCore(this.socket as MockSocket);
      this.mockServerCore.initialize();

      // 1초 후 물리 엔진 시작 (초기화 시간 확보)
      setTimeout(() => {
        this.mockServerCore?.start();
        console.log('[FlappyBirdScene2] 물리 엔진 시작 (1초 딜레이 후)');
      }, 1000);

      console.log('[FlappyBirdScene2] Mock 모드로 실행 중 (1초 후 시작)');
    }

    // 4개의 새 스프라이트 생성
    this.createBirds();

    // 바닥 그리기
    this.createGroundUI();

    // 3개의 밧줄 그래픽 생성
    this.createRopes();

    // 초기 밧줄 그리기 (물리 엔진 시작 전에도 보이도록)
    this.drawInitialRopes();

    // 소켓 이벤트 리스너
    this.setupSocketListeners();

    // 입력 처리
    this.setupInput();

    console.log('[FlappyBirdScene2] 씬 생성 완료');
  }

  /**
   * 4개의 새 생성
   */
  private createBirds() {
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];

    for (let i = 0; i < 4; i++) {
      const bird = this.add.ellipse(200 + i * 120, 300, 40, 40);
      bird.setStrokeStyle(3, 0xffffff);
      bird.isFilled = true;
      bird.fillColor = colors[i];

      this.birdSprites.push(bird);

      // 초기 타겟 위치 설정
      this.targetPositions.push({
        playerId: String(i) as PlayerId,
        x: 200 + i * 120,
        y: 300,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
      });
    }

    console.log('[FlappyBirdScene2] 4개의 새 생성 완료');
  }

  /**
   * 바닥 그래픽 생성 (물리 콜라이더 위치와 동기화)
   */
  private createGroundUI() {
    // 땅의 높이를 100px로 설정 (GAME_HEIGHT - 100 = FLAPPY_GROUND_Y)
    const ground = this.add.rectangle(
      0,
      FLAPPY_GROUND_Y,
      GAME_WIDTH,
      FLAPPY_GROUND_HEIGHT,
    );
    ground.setOrigin(0, 0);
    ground.isFilled = true;
    ground.fillColor = 0xdeb887; // BurlyWood 색상

    // 바닥에 선 추가
    const line = this.add.rectangle(
      0,
      FLAPPY_GROUND_Y,
      GAME_WIDTH,
      FLAPPY_GROUND_LINE_THICKNESS,
    );
    line.setOrigin(0, 0);
    line.isFilled = true;
    line.fillColor = 0x8b4513; // SaddleBrown 색상
  }

  /**
   * 3개의 밧줄 그래픽 생성
   */
  private createRopes() {
    for (let i = 0; i < 3; i++) {
      const rope = this.add.graphics();
      rope.setDepth(0); // 새와 같은 레벨에 렌더링 (depth -1은 보이지 않음)
      this.ropes.push(rope);
    }

    console.log('[FlappyBirdScene2] 3개의 밧줄 생성 완료');
  }

  /**
   * 소켓 이벤트 리스너 설정
   */
  private setupSocketListeners() {
    // 기존 리스너 제거 (중복 등록 방지)
    this.socket.off('update_positions');
    this.socket.off('game_over');

    // 위치 업데이트 수신
    this.socket.on('update_positions', (data: UpdatePositionsEvent) => {
      this.targetPositions = data.birds;
    });

    // 게임 오버
    this.socket.on('game_over', (data: GameOverEvent) => {
      console.log(
        `[FlappyBirdScene2] 게임 오버: ${data.reason}, 점수: ${data.finalScore}`,
      );
      // TODO: 게임 오버 UI 표시
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

    console.log(
      '[FlappyBirdScene2] 키보드 매핑: Q=Bird0(뒤), W=Bird1, E=Bird2, R=Bird3(앞), Space/Click=내 새',
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
    console.log(`[FlappyBirdScene2] Bird ${playerId} Flap!`);
  }

  /**
   * 초기 밧줄 그리기 (물리 엔진 시작 전)
   */
  private drawInitialRopes() {
    console.log('[FlappyBirdScene2] 초기 밧줄 그리기 시작');
    console.log(
      `[FlappyBirdScene2] ropes.length: ${this.ropes.length}, birdSprites.length: ${this.birdSprites.length}`,
    );

    // 새 스프라이트의 초기 위치를 기반으로 밧줄 그리기
    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      const birdA = this.birdSprites[i];
      const birdB = this.birdSprites[i + 1];

      console.log(
        `[FlappyBirdScene2] Rope ${i}: birdA=${birdA ? `(${birdA.x}, ${birdA.y})` : 'null'}, birdB=${birdB ? `(${birdB.x}, ${birdB.y})` : 'null'}`,
      );

      if (birdA && birdB) {
        rope.clear();
        rope.lineStyle(4, 0xffffff, 1);
        rope.beginPath();
        rope.moveTo(birdA.x, birdA.y);
        rope.lineTo(birdB.x, birdB.y);
        rope.strokePath();
        console.log(
          `[FlappyBirdScene2] Rope ${i} 그리기 완료: (${birdA.x}, ${birdA.y}) → (${birdB.x}, ${birdB.y})`,
        );
      } else {
        console.warn(
          `[FlappyBirdScene2] Rope ${i} 그리기 실패: birdA 또는 birdB가 없음`,
        );
      }
    }

    console.log('[FlappyBirdScene2] 초기 밧줄 그리기 완료');
  }

  update() {
    // 선형 보간으로 부드러운 이동
    for (let i = 0; i < this.birdSprites.length; i++) {
      const sprite = this.birdSprites[i];
      const target = this.targetPositions[i];

      if (target) {
        // 위치 보간
        sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.3);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.3);

        // 회전 (속도 기반)
        const angle = Phaser.Math.Clamp(target.velocityY * 3, -30, 90);
        sprite.rotation = Phaser.Math.DegToRad(angle);
      }
    }

    // 밧줄을 클라이언트 측 새 스프라이트 위치로 직접 그리기 (레이턴시 없음)
    this.drawRopesFromSprites();
  }

  /**
   * 클라이언트 측 새 스프라이트 위치로 밧줄 그리기
   */
  private drawRopesFromSprites() {
    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      const birdA = this.birdSprites[i];
      const birdB = this.birdSprites[i + 1];

      if (birdA && birdB) {
        rope.clear();
        rope.lineStyle(4, 0xffffff, 1);
        rope.beginPath();
        rope.moveTo(birdA.x, birdA.y);
        rope.lineTo(birdB.x, birdB.y);
        rope.strokePath();
      }
    }
  }

  /**
   * 씬 종료 시 정리
   */
  shutdown() {
    console.log('[FlappyBirdScene2] shutdown 호출됨');

    // Mock 서버 코어 정리
    if (this.mockServerCore) {
      this.mockServerCore.destroy();
      this.mockServerCore = undefined;
      console.log('[FlappyBirdScene2] Mock 서버 코어 정리 완료');

      // MockSocket에서 serverCore 참조 제거
      if (this.socket instanceof MockSocket) {
        this.socket.clearServerCore();
      }
    }

    // 소켓 이벤트 리스너 제거
    this.socket.off('update_positions');
    this.socket.off('game_over');
    console.log('[FlappyBirdScene2] 소켓 이벤트 리스너 제거 완료');
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
