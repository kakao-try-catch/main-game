import { MockSocket } from '../network/MockSocket';
import {
  TileState,
  type ServerTileData,
  type ClientTileData,
  type PlayerScoreData,
  type MineSweeperConfig,
  type PlayerId,
  type RevealTileRequest,
  type ToggleFlagRequest,
  type ClientEventType,
  DEFAULT_MINESWEEPER_CONFIG,
} from '../types/minesweeper.types';
import { CONSTANTS } from '../types/common';

/**
 * MineSweeperMockCore - 지뢰찾기 서버 역할을 대신하는 로컬 게임 로직
 * 실제 서버 개발 완료 시 이 로직을 서버로 이전할 수 있습니다.
 */
export class MineSweeperMockCore {
  private socket: MockSocket;
  private config: MineSweeperConfig;
  private tiles: ServerTileData[][] = [];
  private players: Map<PlayerId, PlayerScoreData> = new Map();
  // 남은 지뢰 수 (총 지뢰 - 깃발 설치 수 - 발견된 지뢰 수)
  private remainingMines: number = 0;

  constructor(socket: MockSocket) {
    this.socket = socket;
    this.socket.setServerCore(this);
    this.config = { ...DEFAULT_MINESWEEPER_CONFIG };

    console.log('[MineSweeperMockCore] 초기화됨');
  }

  /**
   * 플레이어 수 설정
   */
  setPlayerCount(count: number): void {
    const existingPlayers = new Map(this.players);

    this.players.clear();
    for (let i = 0; i < count; i++) {
      const playerId = `id_${i + 1}` as PlayerId;
      const existingPlayer = existingPlayers.get(playerId);

      this.players.set(playerId, {
        playerId: playerId,
        playerName: existingPlayer?.playerName || `Player ${i + 1}`,
        playerColor:
          existingPlayer?.playerColor ||
          CONSTANTS.PLAYER_COLORS[i] ||
          '#ffffff',
        score: existingPlayer?.score || 0,
        tilesRevealed: existingPlayer?.tilesRevealed || 0,
        minesHit: existingPlayer?.minesHit || 0,
        flagsPlaced: existingPlayer?.flagsPlaced || 0,
      });
    }
    console.log(`[MineSweeperMockCore] 플레이어 ${count}명 설정 완료`);
  }

  /**
   * 게임 설정 업데이트
   */
  setConfig(config: Partial<MineSweeperConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[MineSweeperMockCore] 설정 업데이트:', this.config);
  }

  /**
   * 게임 초기화
   */
  initialize(): void {
    // 타일 초기화
    this.initializeTiles();

    // 지뢰 배치
    this.placeMines();

    // 인접 지뢰 개수 계산
    this.calculateAdjacentMines();

    // 남은 지뢰 수 초기화
    this.remainingMines = this.config.mineCount;

    // 게임 초기화 이벤트 전송 (지뢰 정보 숨김)
    this.socket.triggerEvent('game_init', {
      config: this.config,
      tiles: this.getClientTiles(),
      players: Array.from(this.players.values()),
      remainingMines: this.remainingMines,
      timestamp: Date.now(),
    });

    console.log(
      `[MineSweeperMockCore] 게임 초기화 완료: ${this.config.gridCols}x${this.config.gridRows}, 지뢰 ${this.config.mineCount}개`,
    );
  }

  /**
   * 타일 초기화
   */
  private initializeTiles(): void {
    this.tiles = [];

    for (let row = 0; row < this.config.gridRows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.config.gridCols; col++) {
        this.tiles[row][col] = {
          row,
          col,
          isMine: false,
          adjacentMines: 0,
          state: TileState.HIDDEN,
          revealedBy: null,
          flaggedBy: null,
        };
      }
    }
  }

  /**
   * 랜덤 지뢰 배치
   */
  private placeMines(): void {
    let minesPlaced = 0;
    const totalTiles = this.config.gridRows * this.config.gridCols;
    const maxMines = Math.min(this.config.mineCount, totalTiles - 1);

    while (minesPlaced < maxMines) {
      const row = Math.floor(Math.random() * this.config.gridRows);
      const col = Math.floor(Math.random() * this.config.gridCols);

      if (!this.tiles[row][col].isMine) {
        this.tiles[row][col].isMine = true;
        minesPlaced++;
      }
    }

    console.log(`[MineSweeperMockCore] 지뢰 ${minesPlaced}개 배치 완료`);
  }

  /**
   * 인접 지뢰 개수 계산
   */
  private calculateAdjacentMines(): void {
    for (let row = 0; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridCols; col++) {
        if (!this.tiles[row][col].isMine) {
          let count = 0;

          // 8방향 체크
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;

              const newRow = row + dr;
              const newCol = col + dc;

              if (
                newRow >= 0 &&
                newRow < this.config.gridRows &&
                newCol >= 0 &&
                newCol < this.config.gridCols &&
                this.tiles[newRow][newCol].isMine
              ) {
                count++;
              }
            }
          }

          this.tiles[row][col].adjacentMines = count;
        }
      }
    }

    console.log('[MineSweeperMockCore] 인접 지뢰 개수 계산 완료');
  }

  /**
   * 클라이언트 이벤트 처리 (MockSocket.emit()에서 호출됨)
   */
  handleClientEvent(
    event: ClientEventType,
    data: RevealTileRequest | ToggleFlagRequest,
  ): void {
    switch (event) {
      case 'reveal_tile': {
        const req = data as RevealTileRequest;
        this.handleTileReveal(req.playerId, req.row, req.col);
        break;
      }
      case 'toggle_flag': {
        const req = data as ToggleFlagRequest;
        this.handleFlagToggle(req.playerId, req.row, req.col);
        break;
      }
      default:
        console.log(`[MineSweeperMockCore] 알 수 없는 이벤트: ${event}`);
    }
  }

  /**
   * 클라이언트용 타일 데이터 가져오기 (지뢰 정보 숨김)
   */
  getClientTiles(): ClientTileData[][] {
    return this.tiles.map((row) => row.map((tile) => this.toClientTile(tile)));
  }

  /**
   * 서버 타일을 클라이언트용으로 변환 (REVEALED 상태일 때만 지뢰 정보 노출)
   */
  private toClientTile(tile: ServerTileData): ClientTileData {
    const clientTile: ClientTileData = {
      row: tile.row,
      col: tile.col,
      state: tile.state,
      revealedBy: tile.revealedBy,
      flaggedBy: tile.flaggedBy,
    };

    // REVEALED 상태일 때만 지뢰 정보 제공
    if (tile.state === TileState.REVEALED) {
      clientTile.isMine = tile.isMine;
      clientTile.adjacentMines = tile.adjacentMines;
    }

    return clientTile;
  }

  /**
   * 타일 열기 처리 (좌클릭)
   */
  handleTileReveal(playerId: PlayerId, row: number, col: number): void {
    // 유효성 검사
    if (
      row < 0 ||
      row >= this.config.gridRows ||
      col < 0 ||
      col >= this.config.gridCols
    ) {
      console.warn(`[MineSweeperMockCore] 잘못된 타일 좌표: (${row}, ${col})`);
      return;
    }

    const tile = this.tiles[row][col];

    // 이미 열린 타일은 무시
    if (tile.state === TileState.REVEALED) {
      return;
    }

    // 타일 열기 (빈 공간이면 주변도 함께 열기)
    const tileUpdates = this.revealTileWithFloodFill(row, col, playerId);

    // 발견된 지뢰 수 계산 (열린 타일 중 지뢰인 것)
    const revealedMines = tileUpdates.filter((t) => t.isMine).length;
    if (revealedMines > 0) {
      this.remainingMines -= revealedMines;
      console.log(
        `[MineSweeperMockCore] 지뢰 ${revealedMines}개 발견, 남은 지뢰: ${this.remainingMines}`,
      );
    }

    // 타일 업데이트 이벤트 전송
    this.socket.triggerEvent('tile_update', {
      tiles: tileUpdates,
      remainingMines: this.remainingMines,
      timestamp: Date.now(),
    });

    console.log(
      `[MineSweeperMockCore] 타일 열림: (${row}, ${col}) by ${playerId}, 총 ${tileUpdates.length}개 열림`,
    );
  }

  /**
   * 빈 공간 클릭 시 주변 타일 자동 열기 (Flood Fill)
   */
  private revealTileWithFloodFill(
    row: number,
    col: number,
    playerId: PlayerId,
  ): ClientTileData[] {
    const updates: ClientTileData[] = [];

    // BFS를 위한 큐
    const queue: Array<{ row: number; col: number }> = [{ row, col }];
    const visited = new Set<string>();

    // 점수 계산을 위한 변수
    let totalScoreChange = 0;
    let mineCount = 0;
    let safeCount = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.row},${current.col}`;

      // 이미 방문한 타일은 건너뛰기
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      // 범위 체크
      if (
        current.row < 0 ||
        current.row >= this.config.gridRows ||
        current.col < 0 ||
        current.col >= this.config.gridCols
      ) {
        continue;
      }

      const currentTile = this.tiles[current.row][current.col];

      // 이미 열린 타일은 건너뛰기 (상대방 깃발은 열 수 있음)
      if (currentTile.state === TileState.REVEALED) {
        continue;
      }

      // 타일 열기 (점수 계산은 여기서 하지 않음)
      const update = this.revealTileInternal(
        current.row,
        current.col,
        playerId,
      );
      updates.push(update);

      // 점수 계산
      if (currentTile.isMine) {
        mineCount++;
        totalScoreChange += this.config.minePenalty;
      } else {
        safeCount++;
        totalScoreChange += this.config.tileRevealScore;
      }

      // 빈 공간(인접 지뢰 0개)이고 지뢰가 아니면 주변 8방향 타일도 큐에 추가
      if (currentTile.adjacentMines === 0 && !currentTile.isMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;

            const newRow = current.row + dr;
            const newCol = current.col + dc;
            const newKey = `${newRow},${newCol}`;

            if (!visited.has(newKey)) {
              queue.push({ row: newRow, col: newCol });
            }
          }
        }
      }
    }

    // 플레이어 점수 업데이트
    const player = this.players.get(playerId);
    if (player && updates.length > 0) {
      player.score += totalScoreChange;

      // 점수 업데이트 이벤트 전송
      const reason =
        updates.length > 1
          ? 'flood_fill'
          : mineCount > 0
            ? 'mine_hit'
            : 'safe_tile';

      this.socket.triggerEvent('score_update', {
        playerId,
        scoreChange: totalScoreChange,
        newScore: player.score,
        position: { row, col },
        reason,
        timestamp: Date.now(),
      });

      console.log(
        `[MineSweeperMockCore] 점수 업데이트: ${playerId} ${totalScoreChange > 0 ? '+' : ''}${totalScoreChange} (총: ${player.score}) - ${reason}`,
      );
    }

    return updates;
  }

  /**
   * 깃발 토글 처리 (우클릭)
   */
  handleFlagToggle(playerId: PlayerId, row: number, col: number): void {
    // 유효성 검사
    if (
      row < 0 ||
      row >= this.config.gridRows ||
      col < 0 ||
      col >= this.config.gridCols
    ) {
      console.warn(`[MineSweeperMockCore] 잘못된 타일 좌표: (${row}, ${col})`);
      return;
    }

    const tile = this.tiles[row][col];

    // 이미 열린 타일은 깃발 설치 불가
    if (tile.state === TileState.REVEALED) {
      console.warn(
        `[MineSweeperMockCore] 이미 열린 타일에는 깃발을 설치할 수 없습니다: (${row}, ${col})`,
      );
      return;
    }

    let newState: TileState;
    let flaggedBy: PlayerId | null = null;

    if (tile.state === TileState.HIDDEN) {
      // HIDDEN -> FLAGGED (깃발 설치)
      newState = TileState.FLAGGED;
      flaggedBy = playerId;

      // 플레이어 통계 업데이트
      const player = this.players.get(playerId);
      if (player) {
        player.flagsPlaced++;
      }

      // 남은 지뢰 수 감소 (깃발 설치)
      this.remainingMines--;
      console.log(
        `[MineSweeperMockCore] 깃발 설치: (${row}, ${col}) by ${playerId}, 남은 지뢰: ${this.remainingMines}`,
      );
    } else if (tile.state === TileState.FLAGGED) {
      // 다른 플레이어의 깃발인지 확인
      if (tile.flaggedBy !== playerId) {
        console.warn(
          `[MineSweeperMockCore] 다른 플레이어의 깃발은 제거할 수 없습니다: (${row}, ${col})`,
        );
        return;
      }

      // FLAGGED -> HIDDEN (깃발 제거)
      newState = TileState.HIDDEN;
      flaggedBy = null;

      // 플레이어 통계 업데이트
      const player = this.players.get(playerId);
      if (player) {
        player.flagsPlaced--;
      }

      // 남은 지뢰 수 증가 (깃발 제거)
      this.remainingMines++;
      console.log(
        `[MineSweeperMockCore] 깃발 제거: (${row}, ${col}) by ${playerId}, 남은 지뢰: ${this.remainingMines}`,
      );
    } else {
      return;
    }

    // 타일 상태 업데이트
    tile.state = newState;
    tile.flaggedBy = flaggedBy;

    console.log(
      `[MineSweeperMockCore] tile_update 전송 - flaggedBy: ${flaggedBy}, state: ${newState}`,
    );

    // 타일 업데이트 이벤트 전송 (FLAGGED/HIDDEN 상태이므로 지뢰 정보 숨김)
    this.socket.triggerEvent('tile_update', {
      tiles: [
        {
          row,
          col,
          state: newState,
          revealedBy: null,
          flaggedBy,
        },
      ],
      remainingMines: this.remainingMines,
      timestamp: Date.now(),
    });
  }

  /**
   * 타일 열기 (내부 메서드 - 점수 계산 없이 상태만 변경)
   */
  private revealTileInternal(
    row: number,
    col: number,
    playerId: PlayerId,
  ): ClientTileData {
    const tile = this.tiles[row][col];

    // 깃발 정보 저장 (상태 변경 전에)
    const originalFlagger = tile.flaggedBy;

    // 타일 상태 업데이트
    tile.state = TileState.REVEALED;
    tile.revealedBy = playerId;
    tile.flaggedBy = null; // 깃발 제거

    // 플레이어 통계 업데이트
    const player = this.players.get(playerId);
    if (player) {
      player.tilesRevealed++;

      // 깃발이 있었다면 해당 플레이어의 깃발 카운트 감소
      if (originalFlagger) {
        const flaggerPlayer = this.players.get(originalFlagger);
        if (flaggerPlayer) {
          flaggerPlayer.flagsPlaced--;
        }
      }

      if (tile.isMine) {
        player.minesHit++;
      }
    }

    return {
      row,
      col,
      state: TileState.REVEALED,
      isMine: tile.isMine,
      adjacentMines: tile.adjacentMines,
      revealedBy: playerId,
      flaggedBy: null,
    };
  }

  /**
   * 설정 가져오기
   */
  getConfig(): MineSweeperConfig {
    return this.config;
  }

  /**
   * 디버그용: 서버 내부 타일 데이터 가져오기 (지뢰 정보 포함)
   * ⚠️ 개발/디버그 전용 - 실제 서버에서는 이 메서드를 제공하면 안 됨
   */
  getDebugTiles(): ServerTileData[][] {
    return this.tiles;
  }

  /**
   * 남은 지뢰 수 가져오기
   */
  getRemainingMines(): number {
    return this.remainingMines;
  }

  /**
   * 게임 종료 시 깃발 기반 일괄 정산
   * - 깃발 위치에 실제 지뢰가 있음(성공): 개당 +10점
   * - 깃발 위치에 지뢰가 없음(실패): 개당 -10점
   */
  calculateFinalScores(): Map<
    PlayerId,
    { scoreChange: number; correctFlags: number; incorrectFlags: number }
  > {
    const scoreUpdates = new Map<
      PlayerId,
      { scoreChange: number; correctFlags: number; incorrectFlags: number }
    >();

    // 모든 플레이어 초기화
    for (const playerId of this.players.keys()) {
      scoreUpdates.set(playerId, {
        scoreChange: 0,
        correctFlags: 0,
        incorrectFlags: 0,
      });
    }

    // 모든 타일을 순회하며 깃발 확인
    for (let row = 0; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridCols; col++) {
        const tile = this.tiles[row][col];

        // 깃발이 설치된 타일만 확인
        if (tile.state === TileState.FLAGGED && tile.flaggedBy) {
          const playerId = tile.flaggedBy;
          const update = scoreUpdates.get(playerId);

          if (update) {
            if (tile.isMine) {
              // 성공: 지뢰 위치에 깃발
              update.scoreChange += 10;
              update.correctFlags++;
            } else {
              // 실패: 지뢰가 아닌 곳에 깃발
              update.scoreChange -= 10;
              update.incorrectFlags++;
            }
          }
        }
      }
    }

    // 각 플레이어 점수 업데이트 및 이벤트 전송
    for (const [playerId, update] of scoreUpdates.entries()) {
      if (update.scoreChange !== 0) {
        const player = this.players.get(playerId);
        if (player) {
          player.score += update.scoreChange;

          // 점수 업데이트 이벤트 전송
          this.socket.triggerEvent('score_update', {
            playerId,
            scoreChange: update.scoreChange,
            newScore: player.score,
            position: null,
            reason: 'final_settlement',
            timestamp: Date.now(),
          });

          console.log(
            `[MineSweeperMockCore] 최종 정산: ${playerId} ${update.scoreChange > 0 ? '+' : ''}${update.scoreChange} (정답: ${update.correctFlags}, 오답: ${update.incorrectFlags}) - 총점: ${player.score}`,
          );
        }
      }
    }

    return scoreUpdates;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.tiles = [];
    this.players.clear();
    console.log('[MineSweeperMockCore] 정리 완료');
  }
}
