import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  ApiResponse,
  Difficulty,
  LeaderboardEntry,
  PuzzleSession,
  SessionListResponse,
  SessionSnapshot,
  SolveSessionResponse,
  SubmitMoveResponse,
  SudokuValue,
} from '../../../shared/sudoku.models';

@Injectable({ providedIn: 'root' })
export class SudokuApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  createSession(difficulty: Difficulty = 'random'): Promise<ApiResponse<{ session: PuzzleSession }>> {
    return firstValueFrom(
      this.http.post<ApiResponse<{ session: PuzzleSession }>>(`${this.baseUrl}/sessions`, { difficulty })
    );
  }

  getSessions(): Promise<ApiResponse<SessionListResponse>> {
    return firstValueFrom(
      this.http.get<ApiResponse<SessionListResponse>>(`${this.baseUrl}/sessions`)
    );
  }

  joinSession(sessionId: string, userId: string): Promise<ApiResponse<SessionSnapshot>> {
    return firstValueFrom(
      this.http.post<ApiResponse<SessionSnapshot>>(`${this.baseUrl}/sessions/${sessionId}/join`, { userId })
    );
  }

  getLeaderboard(sessionId: string): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[] }>> {
    return firstValueFrom(
      this.http.get<ApiResponse<{ leaderboard: LeaderboardEntry[] }>>(
        `${this.baseUrl}/sessions/${sessionId}/leaderboard`
      )
    );
  }

  solveSession(sessionId: string): Promise<ApiResponse<SolveSessionResponse>> {
    return firstValueFrom(
      this.http.post<ApiResponse<SolveSessionResponse>>(`${this.baseUrl}/sessions/${sessionId}/solve`, {})
    );
  }

  submitMove(
    sessionId: string,
    userId: string,
    index: [number, number],
    value: SudokuValue
  ): Promise<ApiResponse<SubmitMoveResponse>> {
    return firstValueFrom(
      this.http.post<ApiResponse<SubmitMoveResponse>>(
        `${this.baseUrl}/sessions/${sessionId}/submissions`,
        { userId, index, value }
      )
    );
  }
}
