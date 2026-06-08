import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SudokuApiService } from './sudoku-api.service';

const BASE = 'http://localhost:3000/api';

describe('SudokuApiService', () => {
  let service: SudokuApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SudokuApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SudokuApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('createSession POSTs to /sessions', async () => {
    const promise = service.createSession('easy');
    http.expectOne(`${BASE}/sessions`).flush({ ok: true, data: { session: {} } });
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('getSessions GETs /sessions', async () => {
    const promise = service.getSessions();
    http.expectOne(`${BASE}/sessions`).flush({ ok: true, data: { sessions: [] } });
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('joinSession POSTs to /sessions/:id/join', async () => {
    const promise = service.joinSession('abc', 'user-1');
    http.expectOne(`${BASE}/sessions/abc/join`).flush({ ok: true, data: {} });
    await promise;
  });

  it('getLeaderboard GETs /sessions/:id/leaderboard', async () => {
    const promise = service.getLeaderboard('abc');
    http.expectOne(`${BASE}/sessions/abc/leaderboard`).flush({ ok: true, data: { leaderboard: [] } });
    await promise;
  });

  it('solveSession POSTs to /sessions/:id/solve', async () => {
    const promise = service.solveSession('abc');
    http.expectOne(`${BASE}/sessions/abc/solve`).flush({ ok: true, data: { solution: [] } });
    await promise;
  });

  describe('submitMove', () => {
    it('POSTs to /sessions/:id/submissions', async () => {
      const promise = service.submitMove('abc', 'user-1', [1, 1], 5);
      http.expectOne(`${BASE}/sessions/abc/submissions`).flush({ ok: true, data: {} });
      const result = await promise;
      expect(result.ok).toBe(true);
    });

    it('returns ApiFailure for 400 responses instead of throwing', async () => {
      const failure = { ok: false, error: 'FIXED_CELL' };
      const promise = service.submitMove('abc', 'user-1', [1, 1], 5);
      http
        .expectOne(`${BASE}/sessions/abc/submissions`)
        .flush(failure, { status: 400, statusText: 'Bad Request' });
      const result = await promise;
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('FIXED_CELL');
    });

    it('returns ApiFailure for 422 responses instead of throwing', async () => {
      const failure = { ok: false, error: 'INVALID_VALUE' };
      const promise = service.submitMove('abc', 'user-1', [1, 1], 5);
      http
        .expectOne(`${BASE}/sessions/abc/submissions`)
        .flush(failure, { status: 422, statusText: 'Unprocessable Entity' });
      const result = await promise;
      expect(result.ok).toBe(false);
    });
  });
});
