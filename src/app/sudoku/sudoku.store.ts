import { Injectable, computed, inject, signal } from '@angular/core';

import type {
  Difficulty,
  LeaderboardEntry,
  PlayerRun,
  PositionedCell,
  PuzzleSession,
} from '../../../shared/sudoku.models';
import { SudokuApiService } from './sudoku-api.service';
import { getErrorMessage } from './utils';

export interface SudokuViewState {
  userId: string | null;
  sessionId: string | null;
  difficulty: Difficulty | null;

  board: PositionedCell[][];
  // [row, col] 1-based
  selectedCellIndex: [number, number] | null;

  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  runStatus: 'idle' | 'active' | 'completed';

  leaderboard: LeaderboardEntry[];
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  solvedByComputer: boolean;
}

const CLEAR_ERROR_TIMEOUT = 2000;

function emptyBoard(): PositionedCell[][] {
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => ({
      row: r + 1,
      col: c + 1,
      value: null,
      fixed: false,
    }))
  );
}

@Injectable({ providedIn: 'root' })
export class SudokuStore {
  private readonly api = inject(SudokuApiService);

  private readonly stateSignal = signal<SudokuViewState>({
    userId: null,
    sessionId: null,
    difficulty: null,
    board: emptyBoard(),
    selectedCellIndex: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
    runStatus: 'idle',
    leaderboard: [],
    isSubmitting: false,
    isLoading: false,
    error: null,
    solvedByComputer: false,
  });

  readonly state = this.stateSignal.asReadonly();
  readonly board = computed(() => this.stateSignal().board);
  readonly leaderboard = computed(() => this.stateSignal().leaderboard);
  readonly selectedCellIndex = computed(() => this.stateSignal().selectedCellIndex);
  readonly selectedCell = computed(() => {
    const state = this.stateSignal();
    if (state.selectedCellIndex === null) return null;
    const [r, c] = state.selectedCellIndex;
    return state.board[r - 1][c - 1];
  });
  readonly isCompleted = computed(() => this.stateSignal().runStatus === 'completed');
  readonly solvedByComputer = computed(() => this.stateSignal().solvedByComputer);
  readonly isReadOnly = computed(() => this.isCompleted() || this.solvedByComputer());
  readonly isBusy = computed(() => this.stateSignal().isLoading || this.stateSignal().isSubmitting);
  readonly myRank = computed(() => {
    const state = this.stateSignal();
    if (!state.userId) return null;
    const index = state.leaderboard.findIndex((entry) => entry.userId === state.userId);
    return index === -1 ? null : index + 1;
  });

  async createSession(userId: string, difficulty: Difficulty = 'random'): Promise<string | null> {
    this.patchState({ isLoading: true, error: null });

    try {
      const createResponse = await this.api.createSession(difficulty);

      if (!createResponse.ok) {
        this.patchState({ isLoading: false, error: createResponse.error });
        return null;
      }

      const sessionId = createResponse.data.session.sessionId;
      await this.joinSession(sessionId, userId);
      return sessionId;
    } catch {
      this.patchState({ isLoading: false, error: 'FAILED_TO_CREATE_SESSION' });
      return null;
    }
  }

  async joinSession(sessionId: string, userId: string): Promise<void> {
    this.patchState({ isLoading: true, error: null });

    try {
      const response = await this.api.joinSession(sessionId, userId);

      if (!response.ok) {
        this.patchState({ isLoading: false, error: response.error });
        return;
      }

      this.applySessionSnapshot(response.data.session, response.data.run);
      this.patchState({ userId, isLoading: false, error: null, solvedByComputer: false });
    } catch {
      this.patchState({ isLoading: false, error: 'FAILED_TO_JOIN_SESSION' });
    }
  }

  async refreshLeaderboard(): Promise<void> {
    const sessionId = this.stateSignal().sessionId;
    if (!sessionId) return;

    try {
      const response = await this.api.getLeaderboard(sessionId);

      if (!response.ok) {
        this.patchState({ error: response.error });
        return;
      }

      this.patchState({ leaderboard: response.data.leaderboard, error: null });
    } catch {
      this.patchState({ error: 'FAILED_TO_LOAD_LEADERBOARD' });
    }
  }

  async solveBoard(): Promise<void> {
    const sessionId = this.stateSignal().sessionId;
    if (!sessionId) return;

    this.patchState({ isLoading: true, error: null });

    try {
      const response = await this.api.solveSession(sessionId);

      if (!response.ok) {
        this.patchState({ isLoading: false, error: response.error });
        return;
      }

      const solution = response.data.solution;
      this.stateSignal.update((state) => ({
        ...state,
        isLoading: false,
        solvedByComputer: true,
        board: state.board.map((row, r) =>
          row.map((cell, c) =>
            cell.fixed ? cell : { ...cell, value: solution[r][c] === 0 ? null : solution[r][c] }
          )
        ),
      }));
    } catch {
      this.patchState({ isLoading: false, error: 'FAILED_TO_SOLVE' });
    }
  }

  selectCell(index: [number, number]): void {
    const [row, col] = index;
    if (!Number.isInteger(row) || !Number.isInteger(col)) return;
    if (row < 1 || row > 9 || col < 1 || col > 9) return;
    this.patchState({ selectedCellIndex: index });
  }

  async setCellValue(value: number | null): Promise<void> {
    const state = this.stateSignal();
    const index = state.selectedCellIndex;

    if (this.isReadOnly()) return;
    if (!state.sessionId || !state.userId || index === null) return;

    this.patchState({ isSubmitting: true, error: null });

    try {
      const response = await this.api.submitMove(state.sessionId, state.userId, index, value);

      if (!response.ok) {
        this.patchState({ isSubmitting: false, error: getErrorMessage(response.error) });
        return;
      }

      this.applyRun(response.data.run);
      this.patchState({ leaderboard: response.data.leaderboard, isSubmitting: false, error: null });
    } catch {
      this.patchState({ isSubmitting: false, error: 'FAILED_TO_SUBMIT_MOVE' });
    }
  }

  async clearCell(): Promise<void> {
    await this.setCellValue(null);
  }

  setInvalidMoveError(): void {
    this.patchState({ error: 'INVALID_MOVE_CONFLICT' });
    setTimeout(() => this.clearError(), CLEAR_ERROR_TIMEOUT);
  }

  clearError(): void {
    this.patchState({ error: null });
  }

  private applySessionSnapshot(session: PuzzleSession, run: PlayerRun): void {
    this.patchState({
      sessionId: session.sessionId,
      difficulty: session.difficulty,
      leaderboard: session.leaderboard,
    });
    this.applyRun(run);
  }

  private applyRun(run: PlayerRun): void {
    this.patchState({
      board: run.board,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      runStatus: run.status,
    });
  }

  private patchState(partial: Partial<SudokuViewState>): void {
    this.stateSignal.update((current) => ({ ...current, ...partial }));
  }
}
