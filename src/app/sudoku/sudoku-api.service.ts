import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  ApiFailure,
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

  createSession(difficulty: Difficulty = 'random') {
    return firstValueFrom(
      this.http.post<ApiResponse<{ session: PuzzleSession }>>(`${this.baseUrl}/sessions`, { difficulty })
    );
  }

  getSessions() {
    return firstValueFrom(
      this.http.get<ApiResponse<SessionListResponse>>(`${this.baseUrl}/sessions`)
    );
  }

  getSession(sessionId: string) {
    return firstValueFrom(
      this.http.get<ApiResponse<{ session: PuzzleSession }>>(`${this.baseUrl}/sessions/${sessionId}`)
    );
  }

  joinSession(sessionId: string, userId: string) {
    return firstValueFrom(
      this.http.post<ApiResponse<SessionSnapshot>>(`${this.baseUrl}/sessions/${sessionId}/join`, { userId })
    );
  }

  getLeaderboard(sessionId: string) {
    return firstValueFrom(
      this.http.get<ApiResponse<{ leaderboard: LeaderboardEntry[] }>>(
        `${this.baseUrl}/sessions/${sessionId}/leaderboard`
      )
    );
  }

  solveSession(sessionId: string) {
    return firstValueFrom(
      this.http.post<ApiResponse<SolveSessionResponse>>(`${this.baseUrl}/sessions/${sessionId}/solve`, {})
    );
  }

  async submitMove(
    sessionId: string,
    userId: string,
    index: [number, number],
    value: SudokuValue
  ): Promise<ApiResponse<SubmitMoveResponse>> {
    try {
      return await firstValueFrom(
        this.http.post<ApiResponse<SubmitMoveResponse>>(
          `${this.baseUrl}/sessions/${sessionId}/submissions`,
          { userId, index, value }
        )
      );
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 422 || error.status === 400 || error.status === 404)
      ) {
        return error.error as ApiFailure;
      }
      throw error;
    }
  }
}
