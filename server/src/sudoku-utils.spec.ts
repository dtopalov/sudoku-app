import { describe, it, expect } from 'vitest';
import {
  rawToCells,
  cellsToRawBoard,
  cloneBoard,
  upsertLeaderboard,
  isValidPosition,
  isValidValue,
  checkBoardStatus,
} from './sudoku-utils';
import type { LeaderboardEntry, PositionedCell } from '../../shared/sudoku.models';

// Minimal 2-row raw board for brevity
const RAW: number[][] = [
  [5, 0, 0],
  [0, 3, 0],
];

describe('rawToCells', () => {
  it('converts zeros to null non-fixed cells', () => {
    const cells = rawToCells(RAW);
    expect(cells[0][0]).toEqual({ row: 1, col: 1, value: 5, fixed: true });
    expect(cells[0][1]).toEqual({ row: 1, col: 2, value: null, fixed: false });
  });

  it('assigns 1-based row and col', () => {
    const cells = rawToCells(RAW);
    expect(cells[1][2].row).toBe(2);
    expect(cells[1][2].col).toBe(3);
  });
});

describe('cellsToRawBoard', () => {
  it('converts null back to 0', () => {
    const cells = rawToCells(RAW);
    expect(cellsToRawBoard(cells)).toEqual(RAW);
  });
});

describe('cloneBoard', () => {
  it('produces a deep copy — mutations do not affect the original', () => {
    const cells = rawToCells(RAW);
    const clone = cloneBoard(cells);
    clone[0][0].value = 9;
    expect(cells[0][0].value).toBe(5);
  });
});

describe('upsertLeaderboard', () => {
  const entry = (userId: string, durationMs: number): LeaderboardEntry => ({
    userId,
    durationMs,
    completedAt: Date.now(),
  });

  it('adds a new user and sorts by duration', () => {
    const result = upsertLeaderboard([entry('alice', 120000)], entry('bob', 90000));
    expect(result[0].userId).toBe('bob');
    expect(result[1].userId).toBe('alice');
  });

  it('updates an existing user when new time is faster', () => {
    const board = [entry('alice', 120000)];
    const result = upsertLeaderboard(board, entry('alice', 80000));
    expect(result).toHaveLength(1);
    expect(result[0].durationMs).toBe(80000);
  });

  it('ignores a slower time for an existing user', () => {
    const board = [entry('alice', 80000)];
    const result = upsertLeaderboard(board, entry('alice', 120000));
    expect(result[0].durationMs).toBe(80000);
  });
});

describe('isValidPosition', () => {
  it('accepts valid [1-9, 1-9] tuples', () => {
    expect(isValidPosition([1, 1])).toBe(true);
    expect(isValidPosition([9, 9])).toBe(true);
    expect(isValidPosition([5, 3])).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(isValidPosition([0, 1])).toBe(false);
    expect(isValidPosition([1, 10])).toBe(false);
  });

  it('rejects non-integer values', () => {
    expect(isValidPosition([1.5, 3])).toBe(false);
  });

  it('rejects non-array inputs', () => {
    expect(isValidPosition(null)).toBe(false);
    expect(isValidPosition('1,1')).toBe(false);
    expect(isValidPosition([1])).toBe(false);
  });
});

describe('isValidValue', () => {
  it('accepts null', () => {
    expect(isValidValue(null)).toBe(true);
  });

  it('accepts integers 1-9', () => {
    for (let i = 1; i <= 9; i++) expect(isValidValue(i)).toBe(true);
  });

  it('rejects 0', () => {
    expect(isValidValue(0)).toBe(false);
  });

  it('rejects values outside 1-9', () => {
    expect(isValidValue(10)).toBe(false);
    expect(isValidValue(-1)).toBe(false);
  });

  it('rejects non-integer numbers', () => {
    expect(isValidValue(1.5)).toBe(false);
  });
});

// ── checkBoardStatus ─────────────────────────────────────────────────────────

// A known-valid solved board (standard sudoku solution)
const SOLVED_RAW = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function solvedBoard(): PositionedCell[][] {
  return rawToCells(SOLVED_RAW);
}

function withNull(board: PositionedCell[][], row: number, col: number): PositionedCell[][] {
  const b = board.map((r) => r.map((c) => ({ ...c })));
  b[row][col] = { ...b[row][col], value: null };
  return b;
}

describe('checkBoardStatus', () => {
  it('returns "solved" for a complete, valid board', () => {
    expect(checkBoardStatus(solvedBoard())).toBe('solved');
  });

  it('returns "unsolved" when any cell is empty', () => {
    expect(checkBoardStatus(withNull(solvedBoard(), 0, 0))).toBe('unsolved');
    expect(checkBoardStatus(withNull(solvedBoard(), 8, 8))).toBe('unsolved');
  });

  it('returns "unsolved" when a row has a duplicate', () => {
    const board = solvedBoard();
    // Swap two cells in row 0 so col 0 and col 1 are the same value
    board[0][1] = { ...board[0][1], value: board[0][0].value };
    expect(checkBoardStatus(board)).toBe('unsolved');
  });

  it('returns "unsolved" when a column has a duplicate', () => {
    const board = solvedBoard();
    board[1][0] = { ...board[1][0], value: board[0][0].value };
    expect(checkBoardStatus(board)).toBe('unsolved');
  });

  it('returns "unsolved" when a 3×3 box has a duplicate', () => {
    const board = solvedBoard();
    board[1][1] = { ...board[1][1], value: board[0][0].value };
    expect(checkBoardStatus(board)).toBe('unsolved');
  });
});
