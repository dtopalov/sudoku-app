export type SudokuValue = number | null;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';

export interface Cell {
  value: SudokuValue;
  fixed: boolean;
}

// row and col are 1-based (1..9)
export interface PositionedCell extends Cell {
  row: number;
  col: number;
}

export type RawBoard = number[][];

export interface LeaderboardEntry {
  userId: string;
  durationMs: number;
  completedAt: number;
}

export interface PuzzleSession {
  sessionId: string;
  difficulty: Difficulty;
  initialBoard: PositionedCell[][];
  leaderboard: LeaderboardEntry[];
  createdAt: number;
}

export interface SessionSummary {
  sessionId: string;
  difficulty: Difficulty;
  createdAt: number;
  completedCount: number;
}

export interface PlayerRun {
  sessionId: string;
  userId: string;
  board: PositionedCell[][];
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  status: 'active' | 'completed';
  eligible: boolean;
}

export interface SessionSnapshot {
  session: PuzzleSession;
  run: PlayerRun;
}

export interface CreateSessionRequest {
  difficulty?: Difficulty;
}

export interface JoinSessionRequest {
  userId: string;
}

export interface SubmitMoveRequest {
  userId: string;
  // [row, col] 1-based
  index: [number, number];
  value: SudokuValue;
}

export interface SubmitMoveResponse {
  run: PlayerRun;
  leaderboard: LeaderboardEntry[];
}

export interface SessionListResponse {
  sessions: SessionSummary[];
}

export interface SolveSessionResponse {
  solution: RawBoard;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
