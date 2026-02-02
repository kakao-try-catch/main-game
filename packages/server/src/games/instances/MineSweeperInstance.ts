/**
 * MineSweeperInstance - 지뢰찾기 서버 게임 인스턴스
 *
 * MineSweeperMockCore.ts의 로직을 서버용으로 이전한 구현체입니다.
 * GameInstance 인터페이스를 구현하여 GameSession과 통합됩니다.
 */

import { Socket } from 'socket.io';
import { GameInstance } from './GameInstance';
import { GameSession } from '../gameSession';
import {
  GameConfig,
  MineSweeperGamePreset,
  resolveMineSweeperPreset,
} from '../../../../common/src/config';
import { MineSweeperPacketType } from '../../../../common/src/packets';
import {
  TileState,
  type ServerTileData,
  type ClientTileData,
  type MineSweeperConfig,
  type PlayerId,
  type PlayerScoreData,
  type MSGameInitPacket,
  type MSTileUpdatePacket,
  type MSScoreUpdatePacket,
  type MSGameEndPacket,
} from '../../../../common/src/minesweeperPackets';
import { PLAYER_COLORS } from '../../../../common/src/common-type';

/** 연쇄 타일 열기 최대 점수 (지뢰 페널티 제외) */
const MAX_CHAIN_SCORE = 10;

/** 기본 점수 설정 */
const DEFAULT_SCORE_CONFIG = {
  tileRevealScore: 1,
  minePenalty: -20,
  flagCorrectBonus: 10,
  flagWrongPenalty: -10,
  minScore: Number.NEGATIVE_INFINITY,
};

export class MineSweeperInstance implements GameInstance {
  private config: MineSweeperConfig | null = null;
  private tiles: ServerTileData[][] = [];
  private players: Map<PlayerId, PlayerScoreData> = new Map();
  private remainingMines: number = 0;
  private totalTime: number = 180;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(private session: GameSession) {}

  // ========== LIFECYCLE ==========

  initialize(gameConfig: GameConfig): void {
    const preset = gameConfig as MineSweeperGamePreset;
    const resolved = resolveMineSweeperPreset(preset);

    this.config = {
      gridCols: resolved.gridCols,
      gridRows: resolved.gridRows,
      mineCount: resolved.mineCount,
      ...DEFAULT_SCORE_CONFIG,
    };
    this.totalTime = resolved.totalTime;

    // 플레이어 초기화
    this.initializePlayers();

    // 타일 초기화
    this.initializeTiles();

    // 지뢰 배치
    this.placeMines();

    // 인접 지뢰 개수 계산
    this.calculateAdjacentMines();

    // 남은 지뢰 수 초기화
    this.remainingMines = this.config.mineCount;

    console.log(
      `[MineSweeperInstance] 초기화 완료: ${this.config.gridCols}x${this.config.gridRows}, 지뢰 ${this.config.mineCount}개`,
    );
  }

  start(): void {
    if (!this.config) {
      console.error('[MineSweeperInstance] Config not initialized');
      return;
    }

    // MS_GAME_INIT 패킷 전송
    const initPacket: MSGameInitPacket = {
      type: MineSweeperPacketType.MS_GAME_INIT,
      config: this.config,
      tiles: this.getClientTiles(),
      players: Array.from(this.players.values()),
      remainingMines: this.remainingMines,
      timestamp: Date.now(),
    };
    this.broadcast(MineSweeperPacketType.MS_GAME_INIT, initPacket);

    // SET_TIME 패킷 전송
    this.session.broadcastPacket({
      type: 'SET_TIME' as any,
      limitTime: this.totalTime,
      serverStartTime: Date.now(),
    });

    // 타이머 시작
    this.startTimer();

    console.log(`[MineSweeperInstance] 게임 시작, 제한 시간: ${this.totalTime}초`);
  }

  stop(): void {
    this.stopTimer();
    console.log('[MineSweeperInstance] 게임 중지');
  }

  destroy(): void {
    this.stopTimer();
    this.tiles = [];
    this.players.clear();
    this.config = null;
    console.log('[MineSweeperInstance] 정리 완료');
  }

  // ========== PACKET HANDLING ==========

  handlePacket(socket: Socket, _playerIndex: number, packet: any): void {
    const playerId = socket.id;
    console.log(
      `[MineSweeperInstance] handlePacket 호출됨 - type: ${packet.type}, playerId: ${playerId}`,
    );

    switch (packet.type) {
      case MineSweeperPacketType.MS_REVEAL_TILE:
        console.log(
          `[MineSweeperInstance] MS_REVEAL_TILE 처리 시작 - row: ${packet.row}, col: ${packet.col}`,
        );
        this.handleRevealTile(playerId, packet.row, packet.col);
        break;
      case MineSweeperPacketType.MS_TOGGLE_FLAG:
        this.handleToggleFlag(playerId, packet.row, packet.col);
        break;
      default:
        console.warn(`[MineSweeperInstance] Unknown packet type: ${packet.type}`);
    }
  }

  // ========== INITIALIZATION ==========

  private initializePlayers(): void {
    this.players.clear();
    let index = 0;

    for (const [id, playerState] of this.session.players) {
      this.players.set(id, {
        playerId: id,
        playerName: playerState.playerName,
        playerColor: playerState.color || PLAYER_COLORS[index] || '#ffffff',
        score: 0,
        tilesRevealed: 0,
        minesHit: 0,
        flagsPlaced: 0,
      });
      index++;
    }

    console.log(`[MineSweeperInstance] 플레이어 ${this.players.size}명 초기화`);
  }

  private initializeTiles(): void {
    if (!this.config) return;

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

  private placeMines(): void {
    if (!this.config) return;

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

    console.log(`[MineSweeperInstance] 지뢰 ${minesPlaced}개 배치 완료`);
  }

  private calculateAdjacentMines(): void {
    if (!this.config) return;

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
  }

  // ========== GAME LOGIC ==========

  private handleRevealTile(playerId: PlayerId, row: number, col: number): void {
    console.log(
      `[MineSweeperInstance] handleRevealTile 시작 - playerId: ${playerId}, row: ${row}, col: ${col}`,
    );

    if (!this.config) {
      console.log('[MineSweeperInstance] handleRevealTile 중단 - config 없음');
      return;
    }

    // 유효성 검사
    if (
      row < 0 ||
      row >= this.config.gridRows ||
      col < 0 ||
      col >= this.config.gridCols
    ) {
      console.warn(`[MineSweeperInstance] 잘못된 타일 좌표: (${row}, ${col})`);
      return;
    }

    const tile = this.tiles[row][col];
    console.log(
      `[MineSweeperInstance] 타일 상태 확인 - state: ${tile.state}, isMine: ${tile.isMine}`,
    );

    // 이미 열린 타일은 무시
    if (tile.state === TileState.REVEALED) {
      console.log('[MineSweeperInstance] 이미 열린 타일 - 무시');
      return;
    }

    // Flood Fill로 타일 열기
    console.log('[MineSweeperInstance] revealTileWithFloodFill 호출');
    this.revealTileWithFloodFill(row, col, playerId);
  }

  private revealTileWithFloodFill(
    row: number,
    col: number,
    playerId: PlayerId,
  ): void {
    if (!this.config) return;

    // BFS로 열릴 타일을 거리별로 그룹화
    const tilesByDistance: Map<number, Array<{ row: number; col: number }>> =
      new Map();
    const visited = new Set<string>();
    const queue: Array<{ row: number; col: number; distance: number }> = [
      { row, col, distance: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (
        current.row < 0 ||
        current.row >= this.config.gridRows ||
        current.col < 0 ||
        current.col >= this.config.gridCols
      ) {
        continue;
      }

      const currentTile = this.tiles[current.row][current.col];

      if (currentTile.state === TileState.REVEALED) continue;

      // 거리별로 그룹화
      if (!tilesByDistance.has(current.distance)) {
        tilesByDistance.set(current.distance, []);
      }
      tilesByDistance
        .get(current.distance)!
        .push({ row: current.row, col: current.col });

      // 빈 공간(인접 지뢰 0개)이고 지뢰가 아니면 주변 8방향 타일도 큐에 추가
      if (currentTile.adjacentMines === 0 && !currentTile.isMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newRow = current.row + dr;
            const newCol = current.col + dc;
            const newKey = `${newRow},${newCol}`;
            if (!visited.has(newKey)) {
              queue.push({
                row: newRow,
                col: newCol,
                distance: current.distance + 1,
              });
            }
          }
        }
      }
    }

    // 거리 순서대로 정렬
    const distances = Array.from(tilesByDistance.keys()).sort((a, b) => a - b);

    // 모든 타일을 한 번에 처리
    let totalScoreChange = 0;
    const allUpdates: {
      row: number;
      col: number;
      state: TileState;
      isMine?: boolean;
      adjacentMines?: number;
      revealedBy?: PlayerId;
      flaggedBy?: PlayerId;
      distance?: number;
    }[] = [];

    for (const distance of distances) {
      const tilesAtDistance = tilesByDistance.get(distance)!;

      for (const pos of tilesAtDistance) {
        const tile = this.tiles[pos.row][pos.col];

        // 이미 열린 타일이면 건너뛰기
        if (tile.state === TileState.REVEALED) continue;

        // 타일 열기
        const update = this.revealTileInternal(pos.row, pos.col, playerId);

        // 거리 정보 추가
        allUpdates.push({
          row: update.row,
          col: update.col,
          state: update.state,
          isMine: update.isMine,
          adjacentMines: update.adjacentMines,
          revealedBy: update.revealedBy ?? undefined,
          flaggedBy: update.flaggedBy ?? undefined,
          distance,
        });

        // 점수 계산
        if (tile.isMine) {
          totalScoreChange += this.config.minePenalty;
          this.remainingMines--;
        } else {
          // 최대 점수 제한 적용
          if (totalScoreChange < MAX_CHAIN_SCORE) {
            totalScoreChange += this.config.tileRevealScore;
            if (totalScoreChange > MAX_CHAIN_SCORE) {
              totalScoreChange = MAX_CHAIN_SCORE;
            }
          }
        }
      }
    }

    // 한 번에 모든 타일 업데이트 전송
    console.log(
      `[MineSweeperInstance] revealTileWithFloodFill 완료 - 열린 타일 수: ${allUpdates.length}`,
    );
    if (allUpdates.length > 0) {
      const tileUpdatePacket: MSTileUpdatePacket = {
        type: MineSweeperPacketType.MS_TILE_UPDATE,
        tiles: allUpdates,
        remainingMines: this.remainingMines,
        isSequentialReveal: true,
        timestamp: Date.now(),
      };
      console.log(
        `[MineSweeperInstance] MS_TILE_UPDATE 브로드캐스트 - tiles: ${allUpdates.length}개`,
      );
      this.broadcast(MineSweeperPacketType.MS_TILE_UPDATE, tileUpdatePacket);
    } else {
      console.log('[MineSweeperInstance] 열린 타일 없음 - 브로드캐스트 안함');
    }

    // 점수 업데이트
    const player = this.players.get(playerId);
    if (player && totalScoreChange !== 0) {
      player.score += totalScoreChange;

      const scoreUpdatePacket: MSScoreUpdatePacket = {
        type: MineSweeperPacketType.MS_SCORE_UPDATE,
        playerId,
        scoreChange: totalScoreChange,
        newScore: player.score,
        position: { row, col },
        reason: 'flood_fill',
        timestamp: Date.now(),
      };
      this.broadcast(MineSweeperPacketType.MS_SCORE_UPDATE, scoreUpdatePacket);

      // 세션의 플레이어 점수도 업데이트
      this.updateSessionScore(playerId, player.score);
    }

    console.log(
      `[MineSweeperInstance] Flood Fill 완료: ${allUpdates.length}개 타일`,
    );

    this.checkWinCondition();
  }

  private revealTileInternal(
    row: number,
    col: number,
    playerId: PlayerId,
  ): ClientTileData {
    const tile = this.tiles[row][col];

    // 깃발 정보 저장
    const originalFlagger = tile.flaggedBy;

    // 타일 상태 업데이트
    tile.state = TileState.REVEALED;
    tile.revealedBy = playerId;
    tile.flaggedBy = null;

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

  private handleToggleFlag(playerId: PlayerId, row: number, col: number): void {
    if (!this.config) return;

    // 유효성 검사
    if (
      row < 0 ||
      row >= this.config.gridRows ||
      col < 0 ||
      col >= this.config.gridCols
    ) {
      console.warn(`[MineSweeperInstance] 잘못된 타일 좌표: (${row}, ${col})`);
      return;
    }

    const tile = this.tiles[row][col];

    // 이미 열린 타일은 깃발 설치 불가
    if (tile.state === TileState.REVEALED) {
      return;
    }

    let newState: TileState;
    let flaggedBy: PlayerId | null = null;

    if (tile.state === TileState.HIDDEN) {
      // HIDDEN -> FLAGGED
      newState = TileState.FLAGGED;
      flaggedBy = playerId;

      const player = this.players.get(playerId);
      if (player) {
        player.flagsPlaced++;
      }

      this.remainingMines--;
    } else if (tile.state === TileState.FLAGGED) {
      // 다른 플레이어의 깃발인지 확인
      if (tile.flaggedBy !== playerId) {
        console.warn(
          `[MineSweeperInstance] 다른 플레이어의 깃발은 제거 불가: (${row}, ${col})`,
        );
        return;
      }

      // FLAGGED -> HIDDEN
      newState = TileState.HIDDEN;
      flaggedBy = null;

      const player = this.players.get(playerId);
      if (player) {
        player.flagsPlaced--;
      }

      this.remainingMines++;
    } else {
      return;
    }

    // 타일 상태 업데이트
    tile.state = newState;
    tile.flaggedBy = flaggedBy;

    // 타일 업데이트 패킷 전송
    const tileUpdatePacket: MSTileUpdatePacket = {
      type: MineSweeperPacketType.MS_TILE_UPDATE,
      tiles: [
        {
          row,
          col,
          state: newState,
          revealedBy: undefined,
          flaggedBy: flaggedBy ?? undefined,
        },
      ],
      remainingMines: this.remainingMines,
      timestamp: Date.now(),
    };
    this.broadcast(MineSweeperPacketType.MS_TILE_UPDATE, tileUpdatePacket);
  }

  // ========== WIN CONDITION & SCORING ==========

  private checkWinCondition(): void {
    if (!this.config) return;

    let safeTilesCount = 0;
    let revealedSafeTilesCount = 0;

    for (let row = 0; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridCols; col++) {
        const tile = this.tiles[row][col];

        if (!tile.isMine) {
          safeTilesCount++;
          if (tile.state === TileState.REVEALED) {
            revealedSafeTilesCount++;
          }
        }
      }
    }

    // 모든 안전한 타일이 열렸으면 게임 종료
    if (revealedSafeTilesCount === safeTilesCount) {
      console.log('[MineSweeperInstance] 🎉 모든 안전한 타일 열림! 게임 승리!');
      this.triggerGameEnd('win');
    }
  }

  private triggerGameEnd(reason: 'win' | 'timeout' | 'all_mines_hit'): void {
    this.stopTimer();

    // 최종 정산 수행
    const scoreUpdates = this.calculateFinalScores();

    // 결과 생성
    const results = Array.from(this.players.values())
      .map((player) => {
        const update = scoreUpdates.get(player.playerId);
        return {
          playerId: player.playerId,
          score: player.score,
          tilesRevealed: player.tilesRevealed,
          minesHit: player.minesHit,
          correctFlags: update?.correctFlags ?? 0,
          totalFlags: (update?.correctFlags ?? 0) + (update?.incorrectFlags ?? 0),
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((result, index) => ({ ...result, rank: index + 1 }));

    // 게임 종료 패킷 전송
    const gameEndPacket: MSGameEndPacket = {
      type: MineSweeperPacketType.MS_GAME_END,
      reason,
      results,
      timestamp: Date.now(),
    };
    this.broadcast(MineSweeperPacketType.MS_GAME_END, gameEndPacket);

    // 세션 상태 업데이트
    this.session.status = 'ended';

    console.log(`[MineSweeperInstance] 게임 종료: ${reason}`);
  }

  private calculateFinalScores(): Map<
    PlayerId,
    { scoreChange: number; correctFlags: number; incorrectFlags: number }
  > {
    if (!this.config) {
      return new Map();
    }

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
              update.scoreChange += this.config.flagCorrectBonus;
              update.correctFlags++;
            } else {
              // 실패: 지뢰가 아닌 곳에 깃발
              update.scoreChange += this.config.flagWrongPenalty;
              update.incorrectFlags++;
            }
          }
        }
      }
    }

    // 각 플레이어 점수 업데이트
    for (const [playerId, update] of scoreUpdates.entries()) {
      if (update.scoreChange !== 0) {
        const player = this.players.get(playerId);
        if (player) {
          player.score += update.scoreChange;

          // 점수 업데이트 패킷 전송
          const scoreUpdatePacket: MSScoreUpdatePacket = {
            type: MineSweeperPacketType.MS_SCORE_UPDATE,
            playerId,
            scoreChange: update.scoreChange,
            newScore: player.score,
            position: null,
            reason: 'final_settlement',
            timestamp: Date.now(),
          };
          this.broadcast(MineSweeperPacketType.MS_SCORE_UPDATE, scoreUpdatePacket);

          // 세션 점수 업데이트
          this.updateSessionScore(playerId, player.score);
        }
      }
    }

    return scoreUpdates;
  }

  // ========== TIMER ==========

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const startTime = Date.now();
    const endTime = startTime + this.totalTime * 1000;

    this.timerInterval = setInterval(() => {
      if (Date.now() >= endTime) {
        this.triggerGameEnd('timeout');
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ========== UTILITIES ==========

  private getClientTiles(): ClientTileData[][] {
    return this.tiles.map((row) => row.map((tile) => this.toClientTile(tile)));
  }

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

  private updateSessionScore(playerId: PlayerId, score: number): void {
    const playerState = this.session.players.get(playerId);
    if (playerState) {
      playerState.reportCard.score = score;
    }
  }

  private broadcast(eventType: string, packet: any): void {
    console.log(
      `[MineSweeperInstance] broadcast 호출 - eventType: ${eventType}, roomId: ${this.session.roomId}`,
    );
    this.session.io.to(this.session.roomId).emit(eventType, packet);
    console.log(`[MineSweeperInstance] broadcast 완료 - ${eventType}`);
  }
}
