import type {
  Difficulty,
  LeaderboardEntry,
  PositionedCell,
  RawBoard,
  SudokuValue,
} from '../../shared/sudoku.models';

export function rawToCells(board: RawBoard): PositionedCell[][] {
  return board.map((row, rIdx) =>
    row.map((value, cIdx) => ({
      row: rIdx + 1,
      col: cIdx + 1,
      value: value === 0 ? null : value,
      fixed: value !== 0,
    }))
  );
}

export function cellsToRawBoard(board: PositionedCell[][]): RawBoard {
  return board.map((row) => row.map((cell) => (cell.value === null ? 0 : cell.value)));
}

export function cloneBoard(board: PositionedCell[][]): PositionedCell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function upsertLeaderboard(
  leaderboard: LeaderboardEntry[],
  entry: LeaderboardEntry
): LeaderboardEntry[] {
  const existing = leaderboard.find((item) => item.userId === entry.userId);

  if (!existing) {
    return [...leaderboard, entry].sort((a, b) => a.durationMs - b.durationMs);
  }

  if (entry.durationMs < existing.durationMs) {
    return leaderboard
      .map((item) => (item.userId === entry.userId ? entry : item))
      .sort((a, b) => a.durationMs - b.durationMs);
  }

  return leaderboard;
}

export function isValidPosition(index: unknown): index is [number, number] {
  if (!Array.isArray(index) || index.length !== 2) return false;
  const [row, col] = index as [unknown, unknown];
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    (row as number) >= 1 &&
    (row as number) <= 9 &&
    (col as number) >= 1 &&
    (col as number) <= 9
  );
}

export function isValidValue(value: unknown): value is SudokuValue {
  return (
    value === null ||
    (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 9)
  );
}

export function validateDifficulty(value: unknown): Difficulty {
  const valid: Difficulty[] = ['easy', 'medium', 'hard', 'random'];
  return valid.includes(value as Difficulty) ? (value as Difficulty) : 'random';
}

export function checkBoardStatus(board: PositionedCell[][]): 'solved' | 'unsolved' {
  const allFilled = board.every((row) => row.every((cell) => cell.value !== null));
  if (!allFilled) return 'unsolved';

  const isValidSet = (nums: number[]) => new Set(nums).size === 9;
  const rowVals = (r: number) => board[r].map((c) => c.value as number);
  const colVals = (c: number) => board.map((row) => row[c].value as number);
  const boxVals = (br: number, bc: number) => {
    const vals: number[] = [];
    for (let r = br * 3; r < br * 3 + 3; r++)
      for (let c = bc * 3; c < bc * 3 + 3; c++)
        vals.push(board[r][c].value as number);
    return vals;
  };

  for (let i = 0; i < 9; i++) {
    if (!isValidSet(rowVals(i)) || !isValidSet(colVals(i))) return 'unsolved';
  }
  for (let br = 0; br < 3; br++)
    for (let bc = 0; bc < 3; bc++)
      if (!isValidSet(boxVals(br, bc))) return 'unsolved';

  return 'solved';
}
