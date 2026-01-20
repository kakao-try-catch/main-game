
// You can write more code here

/* START OF COMPILED CODE */

import Phaser from 'phaser';
import { getSocket, isMockMode } from '../../network/socketService';
import { MockSocket } from '../../network/MockSocket';
import { MockServerCore } from '../../physics/MockServerCore';
import type { BirdPosition, UpdatePositionsEvent, GameOverEvent, PlayerId } from '../../types/flappybird.types';
import PipeManager from '../../flappybird/PipeManager';

export default class FlappyBirdsScene extends Phaser.Scene {
	private socket: any;
	private mockServerCore?: MockServerCore;
	private myPlayerId: PlayerId = '0';
	private pipeManager?: PipeManager;
	private playerCount: number = 4;

	// 새 스프라이트
	private birdSprites: Phaser.GameObjects.Ellipse[] = [];
	private targetPositions: BirdPosition[] = [];

	// 배경 및 바닥 (무한 스크롤용)
	private groundTile!: Phaser.GameObjects.TileSprite;
	private groundLine!: Phaser.GameObjects.Rectangle;
	private focusX: number = 0; // 카메라 추적용 부드러운 중심점 X

	// 밧줄
	private ropes: Phaser.GameObjects.Graphics[] = [];

	constructor() {
		super("FlappyBirdsScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {
		const width = 1440;
		const height = 896;

		// 고정 배경색 (카메라를 따라다님)
		const background = this.add.rectangle(0, 0, width, height, 0x46D1FD);
		background.setOrigin(0, 0);
		background.setScrollFactor(0);

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	// Write your code here

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

			// 1초 후 물리 엔진 시작 (초기화 시간 확보)
			setTimeout(() => {
				this.mockServerCore?.start();
				console.log('[FlappyBirdsScene] 물리 엔진 시작 (1초 딜레이 후)');
			}, 1000);

			console.log(`[FlappyBirdsScene] Mock 모드로 실행 중 (플레이어: ${this.playerCount}명)`);
		}

		// 초기 게임 객체 생성
		this.setupGame();

		// 입력 처리
		this.setupInput();

		console.log('[FlappyBirdsScene] 씬 생성 완료');
	}

	/**
	 * 게임 객체 초기화 (새, 바닥, 밧줄)
	 */
	private setupGame() {
		// 기존 객체 제거
		this.birdSprites.forEach(bird => bird.destroy());
		this.ropes.forEach(rope => rope.destroy());
		this.birdSprites = [];
		this.ropes = [];
		this.targetPositions = [];

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
		const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];

		for (let i = 0; i < count; i++) {
			const bird = this.add.ellipse(200 + i * 120, 300, 40, 40);
			bird.setStrokeStyle(3, 0xffffff);
			bird.isFilled = true;
			bird.fillColor = colors[i % colors.length];

			this.birdSprites.push(bird);

			// 초기 타겟 위치 설정
			this.targetPositions.push({
				playerId: String(i) as PlayerId,
				x: 200 + i * 120,
				y: 300,
				velocityX: 0,
				velocityY: 0,
				angle: 0
			});
		}

		console.log(`[FlappyBirdsScene] ${count}개의 새 생성 완료`);
	}

	/**
	 * 바닥 그래픽 생성 (무한 스크롤 TileSprite 방식)
	 */
	private createGroundUI() {
		// 땅의 높이를 98px로 설정 (896 - 98 = 798)
		// TileSprite를 사용하여 카메라 이동 시 패턴이 반복되게 함
		this.groundTile = this.add.tileSprite(0, 798, 1440, 98, "");
		this.groundTile.setOrigin(0, 0);
		this.groundTile.setScrollFactor(0); // 실제 이동은 update()에서 tilePositionX로 제어

		// 바닥 색상 (패턴 대신 색상 채우기용 텍스처 생성)
		if (!this.textures.exists('groundTexture')) {
			const canvas = this.textures.createCanvas('groundTexture', 64, 98);
			if (canvas) {
				const ctx = canvas.getContext();
				ctx.fillStyle = '#DEB887'; // BurlyWood
				ctx.fillRect(0, 0, 64, 98);
				canvas.update();
			}
		}
		this.groundTile.setTexture('groundTexture');

		// 바닥 상단 갈색 선
		this.groundLine = this.add.rectangle(0, 798, 1440, 4, 0x8B4513);
		this.groundLine.setOrigin(0, 0);
		this.groundLine.setScrollFactor(0);
	}

	/**
	 * 밧줄 그래픽 생성
	 */
	private createRopes(playerCount: number) {
		const ropeCount = Math.max(0, playerCount - 1);
		for (let i = 0; i < ropeCount; i++) {
			const rope = this.add.graphics();
			rope.setDepth(0); // 새와 같은 레벨에 렌더링 (depth -1은 보이지 않음)
			this.ropes.push(rope);
		}

		console.log(`[FlappyBirdsScene] ${ropeCount}개의 밧줄 생성 완료`);
	}

	/**
	 * 소켓 이벤트 리스너 설정
	 */
	private setupSocketListeners() {
		// 플레이어 정보 업데이트 (인원수 조절 등)
		this.events.on('updatePlayers', (data: any) => {
			console.log(`[FlappyBirdsScene] 플레이어 업데이트 수신: ${data.playerCount}명`);
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
		});

		// 게임 오버
		this.socket.on('game_over', (data: GameOverEvent) => {
			console.log(`[FlappyBirdsScene] 게임 오버: ${data.reason}, 점수: ${data.finalScore}`);
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

		console.log('[FlappyBirdsScene] 키보드 매핑: Q=Bird0(뒤), W=Bird1, E=Bird2, R=Bird3(앞), Space/Click=내 새');
	}

	/**
	 * Flap 처리
	 */
	private handleFlap(playerId: PlayerId) {
		this.socket.emit('flap', {
			playerId: playerId,
			timestamp: Date.now()
		});
		console.log(`[FlappyBirdsScene] Bird ${playerId} Flap!`);
	}

	/**
	 * 초기 밧줄 그리기 (물리 엔진 시작 전)
	 */
	private drawInitialRopes() {
		console.log('[FlappyBirdsScene] 초기 밧줄 그리기 시작');
		console.log(`[FlappyBirdsScene] ropes.length: ${this.ropes.length}, birdSprites.length: ${this.birdSprites.length}`);

		// 새 스프라이트의 초기 위치를 기반으로 밧줄 그리기
		for (let i = 0; i < this.ropes.length; i++) {
			const rope = this.ropes[i];
			const birdA = this.birdSprites[i];
			const birdB = this.birdSprites[i + 1];

			console.log(`[FlappyBirdsScene] Rope ${i}: birdA=${birdA ? `(${birdA.x}, ${birdA.y})` : 'null'}, birdB=${birdB ? `(${birdB.x}, ${birdB.y})` : 'null'}`);

			if (birdA && birdB) {
				rope.clear();
				rope.lineStyle(4, 0xffffff, 1);
				rope.beginPath();
				rope.moveTo(birdA.x, birdA.y);
				rope.lineTo(birdB.x, birdB.y);
				rope.strokePath();
				console.log(`[FlappyBirdsScene] Rope ${i} 그리기 완료: (${birdA.x}, ${birdA.y}) → (${birdB.x}, ${birdB.y})`);
			} else {
				console.warn(`[FlappyBirdsScene] Rope ${i} 그리기 실패: birdA 또는 birdB가 없음`);
			}
		}

		console.log('[FlappyBirdsScene] 초기 밧줄 그리기 완료');
	}

	update(_time: number, _delta: number) {
		// 1. 파이프 매니저 업데이트 (카메라 위치 기반 재활용 처리)
		if (this.pipeManager) {
			this.pipeManager.update(_delta);
		}

		// 2. 새들 위치 업데이트 및 평균 중심점 계산
		let totalX = 0;
		let birdCount = 0;

		for (let i = 0; i < this.birdSprites.length; i++) {
			const sprite = this.birdSprites[i];
			const target = this.targetPositions[i];

			if (target) {
				// 서버 데이터를 기반으로 스프라이트 위치 보간
				sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.3);
				sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.3);

				// 회전 애니메이션
				const angle = Phaser.Math.Clamp(target.velocityY * 3, -30, 90);
				sprite.rotation = Phaser.Math.DegToRad(angle);

				totalX += sprite.x;
				birdCount++;
			}
		}

		// 3. 카메라 추적 (새들의 평균 위치를 부드럽게 따라감)
		if (birdCount > 0) {
			const avgX = totalX / birdCount;
			// focusX를 새들의 평균 X로 부드럽게 보간 (lerp)
			this.focusX = Phaser.Math.Linear(this.focusX, avgX, 0.1);

			// 새들이 화면의 약 1/3 지점(400px)에 위치하도록 카메라 스크롤 설정
			const centerXOffset = 400;
			this.cameras.main.scrollX = Math.max(0, this.focusX - centerXOffset);

			// 바닥 스크롤 효과 (바닥은 카메라 이동량에 맞춰 타일 위치 변경)
			if (this.groundTile) {
				this.groundTile.tilePositionX = this.cameras.main.scrollX;
			}
		}

		// 4. 밧줄 그리기
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
		if (this.mockServerCore) {
			this.mockServerCore.destroy();
		}

		this.socket.off('update_positions');
		this.socket.off('game_over');
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
