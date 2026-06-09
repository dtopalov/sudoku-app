import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDuration, getErrorMessage, isConflictingNumber, timeAgo } from './utils';
import type { PositionedCell } from '../../../shared/sudoku.models';

// ── isConflictingNumber ───────────────────────────────────────────────────────

function makeBoard(overrides: Partial<PositionedCell>[] = []): PositionedCell[][] {
  const board = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c): PositionedCell => ({
      row: r + 1, col: c + 1, value: null, fixed: false,
    }))
  );
  for (const o of overrides) {
    if (o.row != null && o.col != null) {
      board[o.row - 1][o.col - 1] = { ...board[o.row - 1][o.col - 1], ...o };
    }
  }
  return board;
}

describe('isConflictingNumber', () => {
  it('returns false on an empty board', () => {
    expect(isConflictingNumber(makeBoard(), 1, 1, 5)).toBe(false);
  });

  it('detects a conflict in the same row', () => {
    const board = makeBoard([{ row: 1, col: 5, value: 3 }]);
    expect(isConflictingNumber(board, 1, 1, 3)).toBe(true);
  });

  it('detects a conflict in the same column', () => {
    const board = makeBoard([{ row: 5, col: 1, value: 7 }]);
    expect(isConflictingNumber(board, 1, 1, 7)).toBe(true);
  });

  it('detects a conflict in the same 3×3 box', () => {
    const board = makeBoard([{ row: 2, col: 2, value: 9 }]);
    expect(isConflictingNumber(board, 1, 1, 9)).toBe(true);
  });

  it('does not flag a conflict in a different row, column, and box', () => {
    const board = makeBoard([{ row: 1, col: 5, value: 3 }]);
    expect(isConflictingNumber(board, 4, 1, 3)).toBe(false);
  });

  it('does not flag entering a different value into a cell that already has a value', () => {
    const board = makeBoard([{ row: 1, col: 1, value: 5 }]);
    expect(isConflictingNumber(board, 1, 1, 3)).toBe(false);
  });

  it('returns true when contender matches the cell\'s own current value — caller must guard with early return', () => {
    // isConflictingNumber scans the full row/col/box including the cell itself,
    // so re-entering a cell's existing value appears as a conflict.
    // SudokuGameComponent.setCellValue returns early before reaching this check.
    const board = makeBoard([{ row: 1, col: 1, value: 5 }]);
    expect(isConflictingNumber(board, 1, 1, 5)).toBe(true);
  });

  it('returns false for a number only present in a different box', () => {
    const board = makeBoard([{ row: 4, col: 4, value: 6 }]);
    expect(isConflictingNumber(board, 1, 1, 6)).toBe(false);
  });
});

describe('formatDuration', () => {
  it('formats zero as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 61 seconds', () => {
    expect(formatDuration(61_000)).toBe('1:01');
  });

  it('pads seconds below 10', () => {
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('handles large values', () => {
    expect(formatDuration(3_661_000)).toBe('61:01');
  });
});

describe('getErrorMessage', () => {
  it('returns the mapped message for known codes', () => {
    expect(getErrorMessage('INVALID_MOVE_CONFLICT')).toContain('conflicts');
    expect(getErrorMessage('FAILED_TO_SOLVE')).toContain('auto-solve');
  });

  it('returns a fallback for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('An error occurred. Please try again.');
  });

  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An error occurred. Please try again.');
  });
});

describe('timeAgo', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for recent timestamps', () => {
    expect(timeAgo(NOW - 30_000)).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(timeAgo(NOW - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo(NOW - 3 * 3_600_000)).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(timeAgo(NOW - 2 * 86_400_000)).toBe('2d ago');
  });
});
