import { describe, it, expect } from 'vitest';
import {
  rawToCells,
  cellsToRawBoard,
  cloneBoard,
  upsertLeaderboard,
  isValidPosition,
  isValidValue,
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
