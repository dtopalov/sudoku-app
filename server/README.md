# Sudoku REST API Server

## Purpose

This server is the backend for the Sudoku multiplayer challenge. It lives under `server/src` and runs from the same repository root as the Angular app, using the shared root `package.json`.

Its responsibility is to create puzzle sessions, manage per-user runs, validate submitted moves through Sugoku, and maintain a per-session leaderboard.

## Folder context

```text
/
├─ package.json
├─ src/
│  └─ app/
│     └─ ... Angular application
├─ server/
│  └─ src/
│     └─ sudoku-server.ts
└─ shared/
   └─ sudoku.models.ts
```

## What the server owns
- Session creation
- Session lookup
- Per-user run creation/resume
- Move submission validation
- Leaderboard persistence in memory
- Sugoku API communication

## External dependency
The server uses the Sugoku API for Sudoku operations:
- `GET /board?difficulty=...` to generate a puzzle
- `POST /validate` to validate a board state
- `POST /solve` can be added later for hints or solution reveal features

Important detail: Sugoku `validate` expects `application/x-www-form-urlencoded`, not JSON.

## In-memory state

### Sessions
Each session stores:
- `sessionId`
- `puzzleId`
- `difficulty`
- `initialBoard`
- `leaderboard`
- `createdAt`

### Runs
Each player run stores:
- `sessionId`
- `puzzleId`
- `userId`
- current player board
- `startedAt`
- `completedAt`
- `durationMs`
- `status`

## Endpoints

### `POST /api/sessions`
Creates a new session and fetches a board from Sugoku.

Request body:

```json
{
  "difficulty": "random"
}
```

### `GET /api/sessions/:sessionId`
Returns stored session metadata.

### `POST /api/sessions/:sessionId/join`
Creates or resumes a player run for a session.

Request body:

```json
{
  "userId": "dimitar"
}
```

### `GET /api/sessions/:sessionId/leaderboard`
Returns the current leaderboard for the session.

### `POST /api/sessions/:sessionId/submissions`
Submits one move for one player's board.

Request body:

```json
{
  "userId": "dimitar",
  "index": 10,
  "value": 7
}
```

## Submission lifecycle
1. Find the session.
2. Find or create the player's run.
3. Reject invalid indexes or values.
4. Reject edits to fixed cells.
5. Apply the move to a cloned board.
6. Send the resulting board to Sugoku `validate`.
7. Reject the move if Sugoku returns `broken`.
8. Persist the move if valid.
9. If Sugoku returns `solved`, mark the run complete and update the leaderboard.

## Error codes used by the server
- `FAILED_TO_CREATE_SESSION`
- `SESSION_NOT_FOUND`
- `USER_ID_REQUIRED`
- `INVALID_INDEX`
- `INVALID_VALUE`
- `RUN_ALREADY_COMPLETED`
- `FIXED_CELL`
- `INVALID_MOVE_CONFLICT`
- `FAILED_TO_SUBMIT_MOVE`

## Local run
Run all commands from the repository root.

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npx ts-node server/src/sudoku-server.ts
```

Default URL:

```text
http://localhost:3000
```

## Limitations
- Data is in memory only.
- Restarting the process removes sessions and leaderboard data.
- There is no authentication.
- Leaderboard updates are fetched through REST rather than pushed in real time.
