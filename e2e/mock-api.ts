import { randomUUID } from 'crypto';
import type { Page, Route } from '@playwright/test';

// A valid sudoku puzzle (0 = empty) and its solution
const PUZZLE: number[][] = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const SOLUTION: number[][] = [
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

interface Cell { value: number | null; fixed: boolean; row: number; col: number; }
interface Session { sessionId: string; difficulty: string; initialBoard: Cell[][]; leaderboard: LeaderboardEntry[]; createdAt: number; }
interface Run { sessionId: string; userId: string; board: Cell[][]; startedAt: number; completedAt: number | null; durationMs: number | null; status: 'active' | 'completed'; }
interface LeaderboardEntry { userId: string; durationMs: number; completedAt: number; }

function rawToCells(raw: number[][]): Cell[][] {
  return raw.map((row, r) =>
    row.map((val, c) => ({ value: val === 0 ? null : val, fixed: val !== 0, row: r + 1, col: c + 1 }))
  );
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map(row => row.map(cell => ({ ...cell })));
}

function isSolved(board: Cell[][]): boolean {
  return board.every(row => row.every(cell => cell.value !== null));
}

function ok<T>(data: T) { return { ok: true, data }; }
function fail(error: string) { return { ok: false, error }; }

export async function setupMockApi(page: Page): Promise<void> {
  const sessions = new Map<string, Session>();
  const runs = new Map<string, Run>();

  function createSession(difficulty = 'random'): Session {
    return {
      sessionId: randomUUID(),
      difficulty,
      initialBoard: rawToCells(PUZZLE),
      leaderboard: [],
      createdAt: Date.now(),
    };
  }

  function getOrCreateRun(session: Session, userId: string): Run {
    const key = `${session.sessionId}:${userId}`;
    if (!runs.has(key)) {
      runs.set(key, {
        sessionId: session.sessionId,
        userId,
        board: cloneBoard(session.initialBoard),
        startedAt: Date.now(),
        completedAt: null,
        durationMs: null,
        status: 'active',
      });
    }
    return runs.get(key)!;
  }

  await page.route('http://localhost:3000/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;
    const rawBody = route.request().postData();
    const body = rawBody ? JSON.parse(rawBody) : {};

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    function respond(data: unknown, status = 200) {
      return route.fulfill({
        status,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(data),
      });
    }

    if (path === '/health') return respond({ ok: true });

    if (path === '/api/sessions') {
      if (method === 'GET') {
        const list = Array.from(sessions.values()).map(s => ({
          sessionId: s.sessionId, difficulty: s.difficulty,
          createdAt: s.createdAt, completedCount: s.leaderboard.length,
        }));
        return respond(ok({ sessions: list }));
      }
      if (method === 'POST') {
        const session = createSession(body?.difficulty);
        sessions.set(session.sessionId, session);
        return respond(ok({ session }), 201);
      }
    }

    const m = path.match(/^\/api\/sessions\/([^/]+)(?:\/(.+))?$/);
    if (!m) return respond(fail('NOT_FOUND'), 404);

    const [, sessionId, sub] = m;
    const session = sessions.get(sessionId);

    if (!sub && method === 'GET') {
      if (!session) return respond(fail('SESSION_NOT_FOUND'), 404);
      return respond(ok({ session }));
    }

    if (sub === 'join' && method === 'POST') {
      if (!session) return respond(fail('SESSION_NOT_FOUND'), 404);
      const userId = body?.userId?.trim();
      if (!userId) return respond(fail('USER_ID_REQUIRED'), 400);
      const run = getOrCreateRun(session, userId);
      return respond(ok({ session, run }));
    }

    if (sub === 'leaderboard' && method === 'GET') {
      if (!session) return respond(fail('SESSION_NOT_FOUND'), 404);
      return respond(ok({ leaderboard: session.leaderboard }));
    }

    if (sub === 'solve' && method === 'POST') {
      if (!session) return respond(fail('SESSION_NOT_FOUND'), 404);
      return respond(ok({ solution: SOLUTION }));
    }

    if (sub === 'submissions' && method === 'POST') {
      if (!session) return respond(fail('SESSION_NOT_FOUND'), 404);
      const userId = body?.userId?.trim();
      if (!userId) return respond(fail('USER_ID_REQUIRED'), 400);
      const [row, col] = body.index as [number, number];
      const value: number = body.value;
      const run = getOrCreateRun(session, userId);
      if (run.status === 'completed') return respond(fail('RUN_ALREADY_COMPLETED'), 400);
      const target = run.board[row - 1][col - 1];
      if (target.fixed) return respond(fail('FIXED_CELL'), 400);
      const next = cloneBoard(run.board);
      next[row - 1][col - 1] = { ...target, value: value || null };
      run.board = next;
      if (isSolved(next)) {
        run.status = 'completed';
        run.completedAt = Date.now();
        run.durationMs = run.completedAt - run.startedAt;
        session.leaderboard.push({ userId, durationMs: run.durationMs, completedAt: run.completedAt });
      }
      return respond(ok({ run, leaderboard: session.leaderboard }));
    }

    return respond(fail('NOT_FOUND'), 404);
  });
}
