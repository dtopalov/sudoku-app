import cors from 'cors';
import express from 'express';
import { randomUUID } from 'crypto';

import type {
  ApiResponse,
  CreateSessionRequest,
  Difficulty,
  JoinSessionRequest,
  LeaderboardEntry,
  PlayerRun,
  PuzzleSession,
  RawBoard,
  SessionListResponse,
  SessionSnapshot,
  SessionSummary,
  SolveSessionResponse,
  SubmitMoveRequest,
  SubmitMoveResponse,
} from '../../shared/sudoku.models';
import {
  cellsToRawBoard,
  cloneBoard,
  isValidPosition,
  isValidValue,
  rawToCells,
  upsertLeaderboard,
  checkBoardStatus,
} from './sudoku-utils';

interface SugokuBoardResponse {
  board: RawBoard;
}


interface SugokuSolveResponse {
  solution: RawBoard;
  difficulty: string;
  status: string;
}

const app = express();
const PORT = Number(process.env['PORT'] ?? 3000);
const SUGOKU_BASE_URL = 'https://sugoku.onrender.com';

app.use(cors());
app.use(express.json());

const sessions = new Map<string, PuzzleSession>();
const runs = new Map<string, PlayerRun>();

function toApiSuccess<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function toApiFailure(error: string): ApiResponse<never> {
  return { ok: false, error };
}

function runKey(sessionId: string, userId: string): string {
  return `${sessionId}:${userId}`;
}

const SUGOKU_TIMEOUT_MS = 30_000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;

function sugokuSignal(): AbortSignal {
  return AbortSignal.timeout(SUGOKU_TIMEOUT_MS);
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('UNREACHABLE');
}

async function fetchGeneratedBoard(difficulty: Difficulty): Promise<RawBoard> {
  return withRetry(async () => {
    const response = await fetch(
      `${SUGOKU_BASE_URL}/board?difficulty=${encodeURIComponent(difficulty)}`,
      { signal: sugokuSignal() }
    );
    if (!response.ok) throw new Error('SUGOKU_BOARD_FETCH_FAILED');
    const data = (await response.json()) as SugokuBoardResponse;
    return data.board;
  }, RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS);
}

async function solveBoardWithSugoku(board: RawBoard): Promise<RawBoard> {
  const body = new URLSearchParams({ board: JSON.stringify(board) });
  const response = await fetch(`${SUGOKU_BASE_URL}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: sugokuSignal(),
  });
  if (!response.ok) throw new Error('SUGOKU_SOLVE_FAILED');
  const data = (await response.json()) as SugokuSolveResponse;
  return data.solution;
}

function createSessionRecord(difficulty: Difficulty, board: RawBoard): PuzzleSession {
  return {
    sessionId: randomUUID(),
    difficulty,
    initialBoard: rawToCells(board),
    leaderboard: [],
    createdAt: Date.now(),
  };
}

function getOrCreateRun(session: PuzzleSession, userId: string): PlayerRun {
  const key = runKey(session.sessionId, userId);
  const existingRun = runs.get(key);
  if (existingRun) return existingRun;

  const run: PlayerRun = {
    sessionId: session.sessionId,
    userId,
    board: cloneBoard(session.initialBoard),
    startedAt: Date.now(),
    completedAt: null,
    durationMs: null,
    status: 'active',
  };
  runs.set(key, run);
  return run;
}

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/sessions', (_req, res) => {
  const summaries: SessionSummary[] = Array.from(sessions.values()).map((session) => ({
    sessionId: session.sessionId,
    difficulty: session.difficulty,
    createdAt: session.createdAt,
    completedCount: session.leaderboard.length,
  }));
  res.json(toApiSuccess({ sessions: summaries } satisfies SessionListResponse));
});

app.post('/api/sessions', async (req, res) => {
  try {
    const body = (req.body ?? {}) as CreateSessionRequest;
    const difficulty: Difficulty = body.difficulty ?? 'random';
    const generatedBoard = await fetchGeneratedBoard(difficulty);
    const session = createSessionRecord(difficulty, generatedBoard);
    sessions.set(session.sessionId, session);
    res.status(201).json(toApiSuccess({ session }));
  } catch (err) {
    console.error('Failed to create session:', err);
    res.status(500).json(toApiFailure('FAILED_TO_CREATE_SESSION'));
  }
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    res.status(404).json(toApiFailure('SESSION_NOT_FOUND'));
    return;
  }
  res.json(toApiSuccess({ session }));
});

app.post('/api/sessions/:sessionId/join', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    res.status(404).json(toApiFailure('SESSION_NOT_FOUND'));
    return;
  }

  const body = (req.body ?? {}) as JoinSessionRequest;
  const userId = body.userId?.trim();
  if (!userId) {
    res.status(400).json(toApiFailure('USER_ID_REQUIRED'));
    return;
  }

  const run = getOrCreateRun(session, userId);
  const response: ApiResponse<SessionSnapshot> = toApiSuccess({ session, run });
  res.json(response);
});

app.get('/api/sessions/:sessionId/leaderboard', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    res.status(404).json(toApiFailure('SESSION_NOT_FOUND'));
    return;
  }
  res.json(toApiSuccess({ leaderboard: session.leaderboard }));
});

app.post('/api/sessions/:sessionId/solve', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res.status(404).json(toApiFailure('SESSION_NOT_FOUND'));
      return;
    }
    const solution = await solveBoardWithSugoku(cellsToRawBoard(session.initialBoard));
    res.json(toApiSuccess({ solution } satisfies SolveSessionResponse));
  } catch {
    res.status(500).json(toApiFailure('FAILED_TO_SOLVE'));
  }
});

app.post('/api/sessions/:sessionId/submissions', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res.status(404).json(toApiFailure('SESSION_NOT_FOUND'));
      return;
    }

    const body = (req.body ?? {}) as SubmitMoveRequest;
    const userId = body.userId?.trim();
    if (!userId) {
      res.status(400).json(toApiFailure('USER_ID_REQUIRED'));
      return;
    }

    if (!isValidPosition(body.index)) {
      res.status(400).json(toApiFailure('INVALID_INDEX'));
      return;
    }

    if (!isValidValue(body.value)) {
      res.status(400).json(toApiFailure('INVALID_VALUE'));
      return;
    }

    const run = getOrCreateRun(session, userId);
    if (run.status === 'completed') {
      res.status(400).json(toApiFailure('RUN_ALREADY_COMPLETED'));
      return;
    }

    const [row, col] = body.index;
    const targetCell = run.board[row - 1][col - 1];
    if (targetCell.fixed) {
      res.status(400).json(toApiFailure('FIXED_CELL'));
      return;
    }

    const nextBoard = cloneBoard(run.board);
    nextBoard[row - 1][col - 1] = { ...targetCell, value: body.value };
    run.board = nextBoard;

    if (checkBoardStatus(nextBoard) === 'solved') {
      run.status = 'completed';
      run.completedAt = Date.now();
      run.durationMs = run.completedAt - run.startedAt;
      session.leaderboard = upsertLeaderboard(session.leaderboard, {
        userId: run.userId,
        durationMs: run.durationMs,
        completedAt: run.completedAt,
      } satisfies LeaderboardEntry);
    }

    res.json(toApiSuccess({ run, leaderboard: session.leaderboard } satisfies SubmitMoveResponse));
  } catch {
    res.status(500).json(toApiFailure('FAILED_TO_SUBMIT_MOVE'));
  }
});

app.listen(PORT, () => {
  console.log(`REST Sudoku server listening on http://localhost:${PORT}`);
});
