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
│     └─ sudoku-server.ts
└─ shared/
   └─ sudoku.models.ts
```

## High-level architecture

### Angular frontend
- Lives under `src/app`
- Renders the Sudoku board and leaderboard UI
- Uses a signals-based `SudokuStore`
- Uses `SudokuApiService` for REST communication with the backend

### REST API
- Lives under `server/src`
- Creates Sudoku sessions
- Fetches generated boards from Sugoku
- Creates or resumes per-user runs for a session
- Validates moves through Sugoku
- Stores session and leaderboard data in memory

### Shared models
- Shared request/response contracts and domain types live in `shared/sudoku.models.ts`
- Both frontend and backend import the same models for consistency

## Main user flow
1. A player creates a new session.
2. The backend fetches a generated board from Sugoku.
3. The frontend receives a `sessionId` and joins the player into that session.
4. Other users can join using the same session id.
5. Each player solves the same puzzle independently.
6. Each move is submitted to the backend for validation.
7. Once solved, the player's completion time is recorded in the session leaderboard.
8. The leaderboard can be re-fetched on reload or revisit.

## Local development

Because the repository uses a shared root `package.json`, commands are run from the root folder.

### Install dependencies

```bash
npm install
```

### Start the REST API

```bash
npx ts-node server/src/sudoku-server.ts
```

Backend URL:

```text
http://localhost:3000
```

### Start the Angular frontend

```bash
ng serve
```

Frontend URL:

```text
http://localhost:4200
```

## Notes
- Session and leaderboard data are stored in memory only.
- Restarting the backend clears active sessions and leaderboard entries.
- Sugoku validation uses `application/x-www-form-urlencoded` payloads.
- A Socket.IO version can be added in a separate branch as an enhancement for real-time leaderboard updates.
