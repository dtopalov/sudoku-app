import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SudokuStore } from './sudoku.store';
import { SudokuApiService } from './sudoku-api.service';
import type { PlayerRun, PuzzleSession, SessionSnapshot } from '../../../shared/sudoku.models';

function makeSession(overrides: Partial<PuzzleSession> = {}): PuzzleSession {
  return {
    sessionId: 'session-1',
    difficulty: 'easy',
    initialBoard: [],
    leaderboard: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeRun(overrides: Partial<PlayerRun> = {}): PlayerRun {
  return {
    sessionId: 'session-1',
    userId: 'user-1',
    board: Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => ({
        row: r + 1,
        col: c + 1,
        value: null,
        fixed: false,
      }))
    ),
    startedAt: Date.now(),
    completedAt: null,
    durationMs: null,
    status: 'active',
    ...overrides,
  };
}

const snapshot = (overrides: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
  session: makeSession(),
  run: makeRun(),
  ...overrides,
});

describe('SudokuStore', () => {
  let store: SudokuStore;
  let api: ReturnType<typeof mockApi>;

  function mockApi() {
    return {
      createSession: vi.fn(),
      getSessions: vi.fn(),
      getSession: vi.fn(),
      joinSession: vi.fn(),
      getLeaderboard: vi.fn(),
      solveSession: vi.fn(),
      submitMove: vi.fn(),
    };
  }

  beforeEach(() => {
    api = mockApi();
    TestBed.configureTestingModule({
      providers: [SudokuStore, { provide: SudokuApiService, useValue: api }],
    });
    store = TestBed.inject(SudokuStore);
  });

  describe('joinSession', () => {
    it('populates state on success', async () => {
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });
      await store.joinSession('session-1', 'user-1');

      expect(store.state().sessionId).toBe('session-1');
      expect(store.state().userId).toBe('user-1');
      expect(store.state().runStatus).toBe('active');
      expect(store.state().isLoading).toBe(false);
    });

    it('sets error and clears loading on API failure', async () => {
      api.joinSession.mockResolvedValue({ ok: false, error: 'SESSION_NOT_FOUND' });
      await store.joinSession('bad-id', 'user-1');

      expect(store.state().error).toBe('SESSION_NOT_FOUND');
      expect(store.state().isLoading).toBe(false);
    });
  });

  describe('createSession', () => {
    it('creates then joins, returns sessionId', async () => {
      api.createSession.mockResolvedValue({ ok: true, data: { session: makeSession() } });
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });

      const id = await store.createSession('user-1', 'easy');
      expect(id).toBe('session-1');
    });

    it('returns null on create failure', async () => {
      api.createSession.mockResolvedValue({ ok: false, error: 'FAILED_TO_CREATE_SESSION' });
      const id = await store.createSession('user-1');
      expect(id).toBeNull();
    });
  });

  describe('isReadOnly', () => {
    it('is false for an active run', async () => {
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });
      await store.joinSession('session-1', 'user-1');
      expect(store.isReadOnly()).toBe(false);
    });

    it('is true when run is completed', async () => {
      api.joinSession.mockResolvedValue({
        ok: true,
        data: snapshot({ run: makeRun({ status: 'completed', completedAt: Date.now(), durationMs: 60000 }) }),
      });
      await store.joinSession('session-1', 'user-1');
      expect(store.isReadOnly()).toBe(true);
    });

    it('is true after solveBoard', async () => {
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });
      await store.joinSession('session-1', 'user-1');

      const solution = Array.from({ length: 9 }, () => Array(9).fill(1));
      api.solveSession.mockResolvedValue({ ok: true, data: { solution } });
      await store.solveBoard();

      expect(store.solvedByComputer()).toBe(true);
      expect(store.isReadOnly()).toBe(true);
    });
  });

  describe('myRank', () => {
    it('returns null when no user', () => {
      expect(store.myRank()).toBeNull();
    });

    it('returns 1-based rank for the current user', async () => {
      const leaderboard = [
        { userId: 'alice', durationMs: 60000, completedAt: Date.now() },
        { userId: 'user-1', durationMs: 90000, completedAt: Date.now() },
      ];
      api.joinSession.mockResolvedValue({
        ok: true,
        data: snapshot({ session: makeSession({ leaderboard }) }),
      });
      await store.joinSession('session-1', 'user-1');
      expect(store.myRank()).toBe(2);
    });

    it('returns null when user is not in leaderboard', async () => {
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });
      await store.joinSession('session-1', 'user-1');
      expect(store.myRank()).toBeNull();
    });
  });

  describe('setCellValue', () => {
    beforeEach(async () => {
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });
      await store.joinSession('session-1', 'user-1');
      store.selectCell([1, 1]);
    });

    it('does nothing when board is read-only', async () => {
      api.joinSession.mockResolvedValue({
        ok: true,
        data: snapshot({ run: makeRun({ status: 'completed', completedAt: Date.now(), durationMs: 1 }) }),
      });
      await store.joinSession('session-1', 'user-1');
      await store.setCellValue(5);
      expect(api.submitMove).not.toHaveBeenCalled();
    });

    it('calls submitMove and updates board on success', async () => {
      const updatedRun = makeRun();
      updatedRun.board[0][0].value = 5;
      api.submitMove.mockResolvedValue({ ok: true, data: { run: updatedRun, leaderboard: [] } });

      await store.setCellValue(5);
      expect(api.submitMove).toHaveBeenCalledWith('session-1', 'user-1', [1, 1], 5);
      expect(store.board()[0][0].value).toBe(5);
    });

    it('sets an error on API failure', async () => {
      api.submitMove.mockResolvedValue({ ok: false, error: 'FIXED_CELL' });
      await store.setCellValue(5);
      expect(store.state().error).toBeTruthy();
    });
  });

  describe('solveBoard', () => {
    beforeEach(async () => {
      api.joinSession.mockResolvedValue({ ok: true, data: snapshot() });
      await store.joinSession('session-1', 'user-1');
    });

    it('fills non-fixed cells with the solution', async () => {
      const solution = Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (r * 9 + c + 1) % 9 + 1)
      );
      api.solveSession.mockResolvedValue({ ok: true, data: { solution } });
      await store.solveBoard();

      expect(store.board()[0][0].value).toBe(solution[0][0]);
      expect(store.solvedByComputer()).toBe(true);
    });

    it('sets error on API failure', async () => {
      api.solveSession.mockResolvedValue({ ok: false, error: 'FAILED_TO_SOLVE' });
      await store.solveBoard();
      expect(store.state().error).toBe('FAILED_TO_SOLVE');
      expect(store.solvedByComputer()).toBe(false);
    });
  });
});
