# Sudoku REST API Server

## Purpose

This server is the backend for the Sudoku multiplayer challenge. It lives under `server/src` and runs from the same repository root as the Angular app, using the shared root `package.json`.

Its responsibility is to create puzzle sessions, manage per-user runs, validate and apply submitted moves, and maintain a per-session leaderboard.

## Folder context

```text
/
├─ package.json
├─ src/
│  └─ app/
│     └─ ... Angular application
├─ server/
│  └─ src/
│     ├─ sudoku-server.ts   — Express app, routes, in-memory state
│     └─ sudoku-utils.ts    — board helpers (checkBoardStatus, clone, upsert leaderboard, …)
└─ shared/
   └─ sudoku.models.ts
```

## What the server owns
- Session creation
- Per-user run creation/resume
- Move submission validation and application
- Board completion check (local — no external call per move)
- Leaderboard persistence in memory
- Sugoku API communication (board generation and board solve only)

## External dependency

The server uses the Sugoku API for two operations:
- `GET /board?difficulty=...` to generate a puzzle board on session creation
- `POST /solve` to return the full solution for a session (used by the auto-solve feature)

Both calls use a 30-second timeout. Board generation additionally retries up to 3 times with exponential backoff. All other server logic — including move validation and board completion checking — runs locally.

Note: Sugoku's `POST /solve` expects `application/x-www-form-urlencoded`, not JSON.

## In-memory state

### Sessions
Each session stores:
- `sessionId`
- `difficulty`
- `initialBoard`
- `leaderboard`
- `createdAt`

### Runs
Each player run stores:
- `sessionId`
- `userId`
- current player board
- `startedAt`
- `completedAt`
- `durationMs`
- `status`
- `eligible` — `true` only for the first run a user creates for a session; `false` for any replay run created after a prior completion

## Endpoints

### `GET /health`
Returns `{ ok: true }`. Used to verify the server is up.

### `GET /api/sessions`
Returns a summary list of all active sessions (id, difficulty, createdAt, completedCount).

### `POST /api/sessions`
Creates a new session and fetches a board from Sugoku.

Request body:

```json
{
  "difficulty": "easy"
}
```

Valid difficulty values: `easy`, `medium`, `hard`, `random` (default: `random`).

### `POST /api/sessions/:sessionId/join`
Creates or resumes a player run for a session. Returns the full session and the player's run.

Request body:

```json
{
  "userId": "alice"
}
```

### `GET /api/sessions/:sessionId/leaderboard`
Returns the current leaderboard for the session.

### `POST /api/sessions/:sessionId/solve`
Returns the full solution for the session's puzzle via Sugoku. Used by the client's auto-solve feature.

### `POST /api/sessions/:sessionId/submissions`
Submits one move for one player's board.

Request body:

```json
{
  "userId": "alice",
  "index": [3, 5],
  "value": 7
}
```

`index` is a 1-based `[row, col]` tuple (both in range 1–9). `value` is an integer 1–9, or `null` to erase a cell.

## Submission lifecycle
1. Find the session.
2. Find or create the player's run. If the existing run is completed, a fresh replay run is created with `eligible: false`; the first run for a user/session is `eligible: true`.
3. Reject if the run is already completed.
4. Reject invalid index or value.
5. Reject edits to fixed cells.
6. Apply the move to a cloned board.
7. Check locally whether the board is now solved (`checkBoardStatus`).
8. If solved, mark the run complete. Only update the leaderboard when `run.eligible` is `true` (first legitimate solve per user per session). Auto-solved boards are never submitted through this endpoint and therefore never recorded.
9. Return the updated run and leaderboard.

## Error codes
- `FAILED_TO_CREATE_SESSION`
- `SESSION_NOT_FOUND`
- `USER_ID_REQUIRED`
- `INVALID_INDEX`
- `INVALID_VALUE`
- `RUN_ALREADY_COMPLETED`
- `FIXED_CELL`
- `FAILED_TO_SUBMIT_MOVE`
- `FAILED_TO_SOLVE`

## Local run
Run all commands from the repository root.

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm run server
```

Default URL:

```text
http://localhost:3000
```

## Limitations
- Data is in memory only.
- Restarting the process removes sessions and leaderboard data.
- There is no authentication; userId is a plain string chosen by the client.
- Leaderboard updates are fetched through REST rather than pushed in real time.
