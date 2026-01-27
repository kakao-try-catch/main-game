// You can write more code here

/* START OF COMPILED CODE */

import Phaser from 'phaser';
import type { Socket } from 'socket.io-client';
import { getSocket, isMockMode } from '../../network/socketService';
import { MockSocket } from '../../network/MockSocket';
import { MineSweeperMockCore } from '../../physics/MineSweeperMockCore';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig';
import { CONSTANTS } from '../../types/common';
import TileManager from './TileManager';
import {
  type TileUpdateEvent,
  type GameInitEvent,
  type PlayerId,
  type MineSweeperGamePreset,
  type ResolvedMineSweeperConfig,
  DEFAULT_MINESWEEPER_PRESET,
  resolveMineSweeperPreset,
} from '../../types/minesweeper.types';

// 플레이어 데이터 인터페이스
interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

export default class MineSweeperScene extends Phaser.Scene {
  // 그리드 설정 (프리셋에서 resolve)
  private gameConfig: ResolvedMineSweeperConfig = resolveMineSweeperPreset(
    DEFAULT_MINESWEEPER_PRESET,
  );

  // 네트워크
  private socket!: Socket | MockSocket;
  private mockServerCore?: MineSweeperMockCore;

  // 타일 매니저
  private tileManager!: TileManager;

  // 플레이어 관련
  private playerCount: number = 4;
  private players: PlayerData[] = [];
  private currentPlayerIndex: number = 0;
  private myPlayerId: PlayerId = 'player_0';

  // UI 컨테이너
  private gameContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('MineSweeperScene');

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  editorCreate(): void {
    const ratio = window.__GAME_RATIO || 1;

    // 게임 전체 컨테이너 생성
    this.gameContainer = this.add.container(0, 0);
    this.gameContainer.setSize(GAME_WIDTH * ratio, GAME_HEIGHT * ratio);

    // 배경
    const background = this.add.rectangle(
      0,
      0,
      GAME_WIDTH * ratio,
      GAME_HEIGHT * ratio,
    );
    background.setOrigin(0, 0);
    background.isFilled = true;
    background.fillColor = 0x2c3e50;
    this.gameContainer.add(background);

    this.events.emit('scene-awake');
  }

  /* START-USER-CODE */

  create() {
    console.log('[MineSweeperScene] create 메서드 시작');

    // 소켓 연결
    this.socket = getSocket();

    // 기존 소켓 이벤트 정리
    this.socket.off('game_init');
    this.socket.off('tile_update');
    this.events.off('updatePlayers');

    this.editorCreate();

    // 타일 매니저 생성 및 초기화
    this.tileManager = new TileManager(this, this.gameContainer, {
      gridCols: this.gameConfig.gridCols,
      gridRows: this.gameConfig.gridRows,
      mineCount: this.gameConfig.mineCount,
    });
    this.tileManager.initialize();

    // 소켓 이벤트 리스너 설정
    this.setupSocketListeners();

    // 플레이어 업데이트 이벤트 리스너
    this.setupEventListeners();

    // Mock 모드인 경우 MockServerCore 생성
    if (isMockMode() && this.socket instanceof MockSocket) {
      this.setupMockServer();
    }

    // 준비 완료 신호
    this.events.emit('scene-ready');

    // 키보드 입력 설정
    this.setupKeyboardInput();

    console.log(
      `[MineSweeperScene] 생성 완료: ${this.gameConfig.gridCols}x${this.gameConfig.gridRows} 그리드, 지뢰 ${this.gameConfig.mineCount}개`,
    );
  }

  /**
   * 키보드 입력 설정
   */
  private setupKeyboardInput(): void {
    // D 키로 디버그 모드 토글
    this.input.keyboard?.on('keydown-D', () => {
      if (this.tileManager) {
        this.tileManager.toggleDebugMode();
      }
    });

    console.log('[MineSweeperScene] 키보드 입력 설정 완료 (D: 디버그 모드)');
  }

  /**
   * Mock 서버 설정
   */
  private setupMockServer(): void {
    // 기존 MockServerCore 파괴
    if (this.mockServerCore) {
      this.mockServerCore.destroy();
    }

    this.mockServerCore = new MineSweeperMockCore(this.socket as MockSocket);

    // 플레이어 수 설정
    this.mockServerCore.setPlayerCount(this.playerCount);

    // 설정 적용
    this.mockServerCore.setConfig({
      gridCols: this.gameConfig.gridCols,
      gridRows: this.gameConfig.gridRows,
      mineCount: this.gameConfig.mineCount,
    });

    // 게임 초기화
    this.mockServerCore.initialize();

    console.log('[MineSweeperScene] Mock 모드로 실행 중');
  }

  /**
   * 소켓 이벤트 리스너 설정
   */
  private setupSocketListeners(): void {
    // 게임 초기화 이벤트
    this.socket.on('game_init', (data: GameInitEvent) => {
      console.log('[MineSweeperScene] game_init 수신:', data);

      // 서버에서 받은 타일 데이터로 TileManager 동기화
      if (data.tiles && this.tileManager) {
        this.tileManager.syncTilesFromServer(data.tiles);
      }
    });

    // 타일 업데이트 이벤트
    this.socket.on('tile_update', (data: TileUpdateEvent) => {
      for (const tileUpdate of data.tiles) {
        this.tileManager.updateTileState(
          tileUpdate.row,
          tileUpdate.col,
          tileUpdate.state,
          tileUpdate.adjacentMines,
          tileUpdate.isMine,
        );
      }
    });
  }

  /**
   * 이벤트 리스너 설정 (React에서 수신)
   */
  private setupEventListeners(): void {
    this.events.on(
      'updatePlayers',
      (data: {
        playerCount?: number;
        players?: PlayerData[];
        currentPlayerIndex?: number;
        preset?: MineSweeperGamePreset;
      }) => {
        console.log('[MineSweeperScene] updatePlayers 이벤트 수신:', data);

        // 플레이어 수 업데이트
        if (data.playerCount !== undefined) {
          this.playerCount = data.playerCount;
        }
        if (data.players !== undefined) {
          this.players = data.players;
        }
        if (data.currentPlayerIndex !== undefined) {
          this.currentPlayerIndex = data.currentPlayerIndex;
        }

        // 현재 플레이어 ID 설정
        if (this.players[this.currentPlayerIndex]) {
          this.myPlayerId = this.players[this.currentPlayerIndex].id;
        }

        // 플레이어 색상 기본값 설정
        if (this.players.length === 0) {
          this.players = Array.from({ length: this.playerCount }, (_, i) => ({
            id: `player_${i}`,
            name: `Player ${i + 1}`,
            score: 0,
            color: CONSTANTS.PLAYER_COLORS[i] || '#ffffff',
          }));
        }

        // 프리셋 적용
        if (data.preset) {
          const newConfig = resolveMineSweeperPreset(data.preset);
          console.log('[MineSweeperScene] 새 프리셋 적용:', newConfig);

          // 설정이 변경되었는지 확인
          const configChanged =
            newConfig.gridCols !== this.gameConfig.gridCols ||
            newConfig.gridRows !== this.gameConfig.gridRows ||
            newConfig.mineCount !== this.gameConfig.mineCount;

          if (configChanged) {
            this.gameConfig = newConfig;

            // 타일 매니저 재생성
            if (this.tileManager) {
              this.tileManager.destroy();
            }
            this.tileManager = new TileManager(this, this.gameContainer, {
              gridCols: this.gameConfig.gridCols,
              gridRows: this.gameConfig.gridRows,
              mineCount: this.gameConfig.mineCount,
            });
            this.tileManager.initialize();
            this.tileManager.setPlayerColors(this.players);

            console.log(
              `[MineSweeperScene] 그리드 재생성: ${this.gameConfig.gridCols}x${this.gameConfig.gridRows}, 지뢰 ${this.gameConfig.mineCount}개`,
            );
          }
        }

        // Mock 서버가 있으면 플레이어 정보 업데이트
        if (this.mockServerCore) {
          // 이미 초기화된 경우 재초기화
          this.setupMockServer();
        }

        console.log(
          `[MineSweeperScene] 플레이어 ${this.playerCount}명 설정 완료`,
        );
      },
    );
  }

  /**
   * 타일 매니저 가져오기
   */
  public getTileManager(): TileManager {
    return this.tileManager;
  }

  /**
   * 씬 종료 시 정리
   */
  shutdown() {
    console.log('[MineSweeperScene] shutdown 호출됨');

    // Mock 서버 코어 정리
    if (this.mockServerCore) {
      this.mockServerCore.destroy();
      this.mockServerCore = undefined;

      // MockSocket에서 serverCore 참조 제거
      if (this.socket instanceof MockSocket) {
        this.socket.clearServerCore();
      }
    }

    // 타일 매니저 정리
    if (this.tileManager) {
      this.tileManager.destroy();
    }

    // 소켓 이벤트 리스너 제거
    this.socket.off('game_init');
    this.socket.off('tile_update');
    this.events.off('updatePlayers');

    // 키보드 이벤트 리스너 제거
    this.input.keyboard?.off('keydown-D');

    console.log('[MineSweeperScene] shutdown 완료');
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here

// Named export
export { MineSweeperScene };
