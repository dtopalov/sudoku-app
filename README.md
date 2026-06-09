# Sudoku Multiplayer Challenge Overview

## What this project is

This repository contains a Sudoku application split into two runtime parts inside a single project root:
- an Angular frontend under `src/app`
- a Node.js + Express REST API under `server/src`

Both parts live in the same repository and use the same root `package.json`.

The multiplayer mode is asynchronous rather than real-time collaborative. Multiple users can join the same puzzle session, solve the same generated board independently, and compare completion times on a shared leaderboard.

## Repository structure

```text
/
├─ package.json
├─ src/
│  └─ app/
│     └─ ... Angular application
├─ server/
│  └─ src/
│     ├─ sudoku-server.ts
│     └─ sudoku-utils.ts
└─ shared/
   └─ sudoku.models.ts
```

## High-level architecture

### Angular frontend
- Lives under `src/app`
- Renders the Sudoku board and leaderboard UI
- Uses a signals-based `SudokuStore`
- Uses `SudokuApiService` for REST communication with the backend
- Includes a mobile-only number pad (`NumberPadComponent`) for tap-based digit entry on small screens
- Validates moves client-side before submission: checks for duplicates in the same row, column, or box; only conflict-free moves are sent to the server

### REST API
- Lives under `server/src`
- Creates Sudoku sessions, fetching generated boards from Sugoku
- Creates or resumes per-user runs for a session
- Validates and applies submitted moves; checks board completion locally without any external call
- Stores session and leaderboard data in memory

### Shared models
- Shared request/response contracts and domain types live in `shared/sudoku.models.ts`
- Both frontend and backend import the same models for consistency

## Main user flow
1. A player creates a new session.
2. The backend fetches a generated board from Sugoku.
3. The frontend receives a `sessionId` and joins the player into that session.
4. Other users can join the same session from the board gallery or by navigating to the same URL.
5. Each player solves the same puzzle independently.
6. The client checks for row/column/box conflicts before sending a move.
7. Valid moves are submitted to the backend, which applies the move and checks locally whether the board is now solved.
8. Once solved, the player's completion time is recorded in the session leaderboard — but only on their first legitimate solve. Auto-solved boards are never recorded.
9. If the player joins the same session again after completing it, they receive a fresh board and can replay freely, but subsequent completions are not timed and do not update the leaderboard.
10. The leaderboard can be re-fetched on reload or revisit.

## Local development

Because the repository uses a shared root `package.json`, commands are run from the root folder.

### Install dependencies

```bash
npm install
```

### Start the REST API

```bash
npm run server
```

Backend URL:

```text
http://localhost:3000
```

### Start the Angular frontend

```bash
npm start
```

Frontend URL:

```text
http://localhost:4200
```

### Run tests

```bash
# Angular unit tests
npm test

# Server unit tests
npm run test:server

# Both
npm run test:all

# End-to-end tests (Playwright starts the frontend automatically; backend is mocked)
npm run test:e2e
```

## Notes
- Session and leaderboard data are stored in memory only.
- Restarting the backend clears active sessions and leaderboard entries.
- Sugoku is only contacted on session creation (board generation) and board solve; all other processing is local.
- Sugoku API calls use a 30-second timeout with up to 3 retry attempts (exponential backoff) for board generation.
- The layout adapts to desktop and mobile screen sizes, with a breakpoint at 992 px width.
