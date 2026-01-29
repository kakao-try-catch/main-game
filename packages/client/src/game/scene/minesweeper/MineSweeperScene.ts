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
import TimerPrefab from '../../utils/TimerPrefab';
import TimerSystem from '../../utils/TimerSystem';
import {
  type TileUpdateEvent,
  type GameInitEvent,
  type ScoreUpdateEvent,
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

  // 타이머 관련
  private timerPrefab!: TimerPrefab;
  private timerSystem!: TimerSystem;

  // 플레이어 관련
  private playerCount: number = 4;
  private players: PlayerData[] = [];
  private currentPlayerIndex: number = 0;
  private myPlayerId: PlayerId = 'id_1';
  private isManualPlayerSwitch: boolean = false; // 수동 플레이어 전환 여부 (테스트용)

  // 남은 지뢰 수
  private remainingMines: number = 0;

  // 플레이어별 깃발 카운트
  private flagCounts: Map<string, number> = new Map();

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
    this.socket.off('score_update');
    this.events.off('updatePlayers');

    this.editorCreate();

    // 타이머 생성
    this.createTimer();

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

    // 기본 플레이어 초기화 (Mock 모드에서 색상이 필요함)
    if (this.players.length === 0) {
      this.players = Array.from({ length: this.playerCount }, (_, i) => ({
        id: `id_${i + 1}`,
        name: `Player ${i + 1}`,
        score: 0,
        color: CONSTANTS.PLAYER_COLORS[i] || '#ffffff',
      }));
      this.tileManager.setPlayerColors(this.players);
      console.log('[MineSweeperScene] 기본 플레이어 초기화 및 색상 설정 완료');
    }

    // Mock 모드인 경우 MockServerCore 생성
    if (isMockMode() && this.socket instanceof MockSocket) {
      this.setupMockServer();
    }

    // 준비 완료 신호
    this.events.emit('scene-ready');

    // 키보드 입력 설정
    this.setupKeyboardInput();

    // 마우스 입력 설정
    this.setupMouseInput();

    console.log(
      `[MineSweeperScene] 생성 완료: ${this.gameConfig.gridCols}x${this.gameConfig.gridRows} 그리드, 지뢰 ${this.gameConfig.mineCount}개`,
    );

    // 타이머 시작
    this.startTimer();
  }

  /**
   * 타이머 생성
   */
  private createTimer(): void {
    const ratio = window.__GAME_RATIO || 1;
    const canvasWidth = this.sys.game.canvas.width;
    const canvasHeight = this.sys.game.canvas.height;
    const timerBarMarginTop = 50 * ratio;
    const timerBarMarginBottom = 50 * ratio;
    const timerBarCanvasHeight =
      canvasHeight - timerBarMarginTop - timerBarMarginBottom;
    const timerBarWidth = 22 * ratio;
    const timerBarMarginRight = 30 * ratio;
    const timerBarX = canvasWidth - timerBarMarginRight - timerBarWidth / 2;
    const timerBarY = timerBarMarginTop + timerBarCanvasHeight;

    this.timerPrefab = new TimerPrefab(
      this,
      timerBarX,
      timerBarY,
      timerBarCanvasHeight,
    );

    // 타이머를 컨테이너에 추가
    this.gameContainer.add(this.timerPrefab);

    console.log('[MineSweeperScene] 타이머 생성 완료');
  }

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    this.timerSystem = new TimerSystem(this, this.timerPrefab);
    this.timerSystem.start(this.gameConfig.totalTime);

    // 타이머 완료 이벤트 리스너 등록
    this.events.once('timer:complete', () => {
      this.onGameEnd();
    });

    console.log(
      `[MineSweeperScene] 타이머 시작: ${this.gameConfig.totalTime}초`,
    );
  }

  /**
   * 게임 종료 처리
   */
  private onGameEnd(): void {
    console.log('[MineSweeperScene] 게임 종료 - 타이머 완료');

    if (isMockMode() && this.mockServerCore) {
      // Mock 모드: 클라이언트에서 직접 정산
      console.log('[MineSweeperScene] Mock 모드 - 깃발 기반 최종 정산 시작');
      const scoreUpdates = this.mockServerCore.calculateFinalScores();

      // 정산 결과 로그
      for (const [playerId, update] of scoreUpdates.entries()) {
        console.log(
          `[MineSweeperScene] ${playerId} 최종 정산: ${update.scoreChange > 0 ? '+' : ''}${update.scoreChange}점 (정답 깃발: ${update.correctFlags}, 오답 깃발: ${update.incorrectFlags})`,
        );
      }

      // 점수 업데이트 이벤트가 처리될 시간을 주기 위해 약간의 딜레이 후 게임 종료
      setTimeout(() => {
        this.emitGameEnd(scoreUpdates);
      }, 100);
    } else {
      // 실제 서버 모드: 서버에 타임업 알림
      console.log('[MineSweeperScene] 서버 모드 - game_time_up 이벤트 전송');
      this.socket.emit('game_time_up', {
        timestamp: Date.now(),
      });
      // 서버에서 final_settlement와 game_end 이벤트를 보낼 것임
      // 여기서는 아무것도 하지 않음 (서버 응답 대기)
    }
  }

  /**
   * 게임 종료 이벤트 발생
   */
  private emitGameEnd(
    scoreUpdates?: Map<
      string,
      { scoreChange: number; correctFlags: number; incorrectFlags: number }
    >,
  ): void {
    // 플레이어 데이터에 playerIndex와 깃발 통계 추가
    const playersWithIndex = this.players.map((player, index) => {
      const update = scoreUpdates?.get(player.id);
      return {
        ...player,
        playerIndex: index,
        correctFlags: update?.correctFlags ?? 0,
        totalFlags: (update?.correctFlags ?? 0) + (update?.incorrectFlags ?? 0),
      };
    });

    // React로 게임 종료 이벤트 전달
    this.events.emit('gameEnd', { players: playersWithIndex });
    console.log('🎮 게임 종료! React로 이벤트 전달', playersWithIndex);
  }

  /**
   * 게임 종료 이벤트 발생 (서버에서 받은 깃발 통계 사용)
   */
  private emitGameEndWithFlagStats(
    flagStatsMap: Map<string, { correctFlags: number; totalFlags: number }>,
  ): void {
    // 플레이어 데이터에 playerIndex와 깃발 통계 추가
    const playersWithIndex = this.players.map((player, index) => {
      const stats = flagStatsMap.get(player.id);
      return {
        ...player,
        playerIndex: index,
        correctFlags: stats?.correctFlags ?? 0,
        totalFlags: stats?.totalFlags ?? 0,
      };
    });

    // React로 게임 종료 이벤트 전달
    this.events.emit('gameEnd', { players: playersWithIndex });
    console.log('🎮 게임 종료! React로 이벤트 전달', playersWithIndex);
  }

  /**
   * 키보드 입력 설정
   */
  private setupKeyboardInput(): void {
    // D 키로 디버그 모드 토글
    this.input.keyboard?.on('keydown-D', () => {
      if (this.tileManager) {
        // Mock 모드에서는 서버 내부 데이터를 전달하여 디버그 표시
        const debugTiles = this.mockServerCore?.getDebugTiles();
        this.tileManager.toggleDebugMode(debugTiles);
      }
    });

    // 1-4 키로 플레이어 전환 (Mock 모드 테스트용)
    if (isMockMode()) {
      this.input.keyboard?.on('keydown-ONE', () => {
        this.switchPlayer(0);
      });

      this.input.keyboard?.on('keydown-TWO', () => {
        this.switchPlayer(1);
      });

      this.input.keyboard?.on('keydown-THREE', () => {
        this.switchPlayer(2);
      });

      this.input.keyboard?.on('keydown-FOUR', () => {
        this.switchPlayer(3);
      });
    }

    console.log(
      '[MineSweeperScene] 키보드 입력 설정 완료 (D: 디버그 모드, 1-4: 플레이어 전환)',
    );
  }

  /**
   * 플레이어 전환 (테스트용)
   */
  private switchPlayer(playerIndex: number): void {
    if (playerIndex >= 0 && playerIndex < this.playerCount) {
      this.currentPlayerIndex = playerIndex;
      this.isManualPlayerSwitch = true; // 수동 전환 플래그 설정

      // 실제 플레이어 ID 사용 (players 배열에서 가져옴)
      if (this.players[playerIndex]) {
        this.myPlayerId = this.players[playerIndex].id as PlayerId;
      } else {
        this.myPlayerId = `id_${playerIndex + 1}` as PlayerId;
      }

      // 플레이어 색상 정보 표시
      const playerColor = this.players[playerIndex]?.color || 'unknown';
      console.log(`[MineSweeperScene] 플레이어 색상: ${playerColor}`);
    }
  }

  /**
   * 마우스 입력 설정
   */
  private setupMouseInput(): void {
    // 마우스 클릭 이벤트 리스너
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 타일 위치 가져오기
      const tilePos = this.tileManager.getTileAtPosition(pointer.x, pointer.y);

      if (!tilePos) {
        return; // 그리드 밖 클릭
      }

      const { row, col } = tilePos;

      // 좌클릭: 타일 열기
      if (pointer.leftButtonDown()) {
        this.handleTileClick(row, col, false);
      }
      // 우클릭: 깃발 토글
      else if (pointer.rightButtonDown()) {
        this.handleTileClick(row, col, true);
      }
    });

    // 우클릭 컨텍스트 메뉴 방지
    this.input.mouse?.disableContextMenu();

    console.log(
      '[MineSweeperScene] 마우스 입력 설정 완료 (좌클릭: 열기, 우클릭: 깃발)',
    );
  }

  /**
   * 타일 클릭 처리
   */
  private handleTileClick(
    row: number,
    col: number,
    isRightClick: boolean,
  ): void {
    if (isRightClick) {
      // 우클릭: 깃발 토글
      this.socket.emit('toggle_flag', {
        playerId: this.myPlayerId,
        row,
        col,
      });
      console.log(`[MineSweeperScene] 깃발 토글 요청: (${row}, ${col})`);
    } else {
      // 좌클릭: 타일 열기
      this.socket.emit('reveal_tile', {
        playerId: this.myPlayerId,
        row,
        col,
      });
      console.log(`[MineSweeperScene] 타일 열기 요청: (${row}, ${col})`);
    }
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

      // 남은 지뢰 수 초기화
      if (data.remainingMines !== undefined) {
        this.remainingMines = data.remainingMines;
        this.events.emit('remainingMinesUpdate', this.remainingMines);
        console.log(
          `[MineSweeperScene] 초기 남은 지뢰 수: ${this.remainingMines}`,
        );
      }
    });

    // 타일 업데이트 이벤트
    this.socket.on('tile_update', (data: TileUpdateEvent) => {
      for (const tileUpdate of data.tiles) {
        // 이전 상태 저장 (깃발 카운트 업데이트용)
        const prevTile = this.tileManager.getTile(tileUpdate.row, tileUpdate.col);
        const wasFlagged = prevTile?.state === 'flagged';
        const prevOwner = prevTile?.flaggedBy;

        this.tileManager.updateTileState(
          tileUpdate.row,
          tileUpdate.col,
          tileUpdate.state,
          tileUpdate.adjacentMines,
          tileUpdate.isMine,
          tileUpdate.revealedBy,
          tileUpdate.flaggedBy,
        );

        // 깃발 카운트 업데이트
        if (tileUpdate.state === 'flagged' && tileUpdate.flaggedBy) {
          // 깃발 설치: 해당 플레이어 카운트 증가
          const currentCount = this.flagCounts.get(tileUpdate.flaggedBy) || 0;
          this.flagCounts.set(tileUpdate.flaggedBy, currentCount + 1);
          this.emitFlagCountUpdate();
        } else if (wasFlagged && prevOwner) {
          // 이전에 깃발이 있었는데 제거됨 (hidden 또는 revealed)
          // 해당 플레이어 카운트 감소
          const count = this.flagCounts.get(prevOwner) || 0;
          this.flagCounts.set(prevOwner, Math.max(0, count - 1));
          this.emitFlagCountUpdate();
        }
      }

      // 남은 지뢰 수 업데이트
      if (data.remainingMines !== undefined) {
        this.remainingMines = data.remainingMines;
        this.events.emit('remainingMinesUpdate', this.remainingMines);
        console.log(
          `[MineSweeperScene] 남은 지뢰 수 업데이트: ${this.remainingMines}`,
        );
      }
    });

    // 점수 업데이트 이벤트
    this.socket.on('score_update', (data: any) => {
      console.log('[MineSweeperScene] score_update 수신:', data);

      // 로컬 플레이어 점수 업데이트
      const player = this.players.find((p) => p.id === data.playerId);
      if (player) {
        player.score = data.newScore;

        // React UI에 점수 업데이트 알림
        this.events.emit('scoreUpdate', {
          playerId: data.playerId,
          scoreChange: data.scoreChange,
          newScore: data.newScore,
          reason: data.reason,
        });

        console.log(
          `[MineSweeperScene] ${data.playerId} 점수: ${data.scoreChange > 0 ? '+' : ''}${data.scoreChange} (총: ${data.newScore}) - ${data.reason}`,
        );
      }
    });

    // 게임 종료 이벤트 (서버에서 전송)
    this.socket.on('game_end', (data: any) => {
      console.log('[MineSweeperScene] 서버로부터 game_end 수신:', data);

      // 타이머 정지
      if (this.timerSystem) {
        this.timerSystem.destroy();
      }

      // 승리로 인한 종료인 경우 메시지 표시
      if (data.reason === 'win') {
        console.log('[MineSweeperScene] 🎉 게임 승리! 모든 안전한 타일을 열었습니다!');
      }

      // 서버에서 받은 최종 플레이어 데이터로 업데이트 (있는 경우)
      // 깃발 통계도 함께 저장
      const flagStatsMap = new Map<
        string,
        { correctFlags: number; totalFlags: number }
      >();

      if (data.players) {
        // 서버에서 받은 플레이어 데이터를 로컬 플레이어 배열과 병합
        data.players.forEach((serverPlayer: any) => {
          const localPlayer = this.players.find(
            (p) => p.id === serverPlayer.playerId || p.id === serverPlayer.id,
          );
          if (localPlayer) {
            localPlayer.score = serverPlayer.score;
          }
          // 깃발 통계 저장
          const playerId = serverPlayer.playerId || serverPlayer.id;
          flagStatsMap.set(playerId, {
            correctFlags: serverPlayer.correctFlags ?? 0,
            totalFlags: serverPlayer.totalFlags ?? 0,
          });
        });
      }

      // 게임 종료 처리 (깃발 통계 포함)
      this.emitGameEndWithFlagStats(flagStatsMap);
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
        // 수동 플레이어 전환이 아닌 경우에만 currentPlayerIndex 업데이트
        // (Mock 모드에서 1-4키로 플레이어 전환 시에만 해당)
        if (
          data.currentPlayerIndex !== undefined &&
          !this.isManualPlayerSwitch
        ) {
          this.currentPlayerIndex = data.currentPlayerIndex;

          // 현재 플레이어 ID 설정
          if (this.players[this.currentPlayerIndex]) {
            this.myPlayerId = this.players[this.currentPlayerIndex].id;
          }
        }

        // 플레이어 색상 기본값 설정
        if (this.players.length === 0) {
          this.players = Array.from({ length: this.playerCount }, (_, i) => ({
            id: `id_${i + 1}`,
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

          const timeChanged = newConfig.totalTime !== this.gameConfig.totalTime;

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

            // Mock 모드에서 서버 코어도 동일한 설정으로 재초기화
            if (isMockMode() && this.socket instanceof MockSocket) {
              this.setupMockServer();
            }

            console.log(
              `[MineSweeperScene] 그리드 재생성: ${this.gameConfig.gridCols}x${this.gameConfig.gridRows}, 지뢰 ${this.gameConfig.mineCount}개`,
            );
          }

          // 타이머 재시작 (시간이 변경된 경우)
          if (timeChanged) {
            this.gameConfig = newConfig;
            if (this.timerSystem) {
              this.timerSystem.destroy();
            }
            this.startTimer();
            console.log(
              `[MineSweeperScene] 타이머 재시작: ${this.gameConfig.totalTime}초`,
            );
          }
        }

        // TileManager에 플레이어 색상 전달
        if (this.tileManager) {
          this.tileManager.setPlayerColors(this.players);
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
   * 남은 지뢰 수 가져오기
   */
  public getRemainingMines(): number {
    return this.remainingMines;
  }

  /**
   * 깃발 카운트 업데이트 이벤트 발생
   */
  private emitFlagCountUpdate(): void {
    const flagCountData: Record<string, number> = {};

    // 모든 플레이어의 깃발 카운트 초기화
    for (const player of this.players) {
      flagCountData[player.id] = this.flagCounts.get(player.id) || 0;
    }

    this.events.emit('flagCountUpdate', flagCountData);
    console.log('[MineSweeperScene] flagCountUpdate 이벤트 발생:', flagCountData);
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

    // 타이머 시스템 정리
    if (this.timerSystem) {
      this.timerSystem.destroy();
    }

    // 타일 매니저 정리
    if (this.tileManager) {
      this.tileManager.destroy();
    }

    // 소켓 이벤트 리스너 제거
    this.socket.off('game_init');
    this.socket.off('tile_update');
    this.socket.off('score_update');
    this.socket.off('game_end');
    this.events.off('updatePlayers');

    // 키보드 이벤트 리스너 제거
    this.input.keyboard?.off('keydown-D');
    this.input.keyboard?.off('keydown-ONE');
    this.input.keyboard?.off('keydown-TWO');
    this.input.keyboard?.off('keydown-THREE');
    this.input.keyboard?.off('keydown-FOUR');

    // 마우스 이벤트 리스너 제거
    this.input.off('pointerdown');

    console.log('[MineSweeperScene] shutdown 완료');
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here

// Named export
export { MineSweeperScene };
