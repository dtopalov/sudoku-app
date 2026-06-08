import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Difficulty } from '../../../shared/sudoku.models';
import { SudokuStore } from './sudoku.store';
import { SudokuBoardComponent } from './sudoku-board.component';
import { LeaderboardComponent } from './leaderboard.component';
import { SidebarComponent } from './sidebar.component';
import { BoardGalleryComponent } from './board-gallery.component';
import { getErrorMessage } from './utils';

@Component({
  selector: 'app-sudoku-game',
  standalone: true,
  imports: [SudokuBoardComponent, LeaderboardComponent, SidebarComponent, BoardGalleryComponent],
  template: `
    @if (store.state().error) {
      <div class="error-notification">
        <p>{{ errorMessage }}</p>
        <button (click)="store.clearError()">Dismiss</button>
      </div>
    }

    <div class="sudoku-page">
      <div class="sudoku-page__top">
        <div class="sudoku-page__board">
          <app-sudoku-board
            [board]="store.board()"
            [isReadOnly]="store.isReadOnly()"
            [(selectedCellIndex)]="selectedCellIndex"
            (valueEntered)="setCellValue($event)"
            (clearRequested)="clearCell()"
          />
        </div>

        <div class="sudoku-page__sidebar">
          <app-sidebar
            [sessionId]="store.state().sessionId"
            [(difficulty)]="selectedDifficulty"
            [isBusy]="store.isBusy()"
            [isReadOnly]="store.isReadOnly()"
            (createRequested)="createNewSession($event)"
            (solveRequested)="solveBoard()"
          />

          <app-leaderboard
            [entries]="store.leaderboard()"
            [myRank]="store.myRank()"
            [isBusy]="store.isBusy()"
            (refreshRequested)="store.refreshLeaderboard()"
          />
        </div>
      </div>

      <app-board-gallery [activeSessionId]="store.state().sessionId" />
    </div>
  `,
})
export class SudokuGameComponent implements OnInit {
  readonly store = inject(SudokuStore);

  get errorMessage(): string {
    return getErrorMessage(this.store.state().error);
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedDifficulty = signal<Difficulty>('random');
  readonly selectedCellIndex = signal<[number, number]>([1, 1]);

  private readonly defaultUserId = `user-${crypto.randomUUID().slice(0, 8)}`;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('sessionId')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((sessionId) => {
        void this.handleRoute(sessionId);
      });
  }

  private async handleRoute(sessionId: string | null): Promise<void> {
    if (sessionId) {
      await this.store.joinSession(sessionId, this.defaultUserId);
      return;
    }

    const newSessionId = await this.store.createSession(
      this.defaultUserId,
      this.selectedDifficulty()
    );

    if (newSessionId) {
      await this.router.navigate(['/sessions', newSessionId]);
    }
  }

  async createNewSession(difficulty: Difficulty): Promise<void> {
    const sessionId = await this.store.createSession(this.defaultUserId, difficulty);
    if (sessionId) {
      this.selectedCellIndex.set([1, 1]);
      await this.router.navigate(['/sessions', sessionId]);
    }
  }

  async solveBoard(): Promise<void> {
    await this.store.solveBoard();
  }

  async setCellValue(value: number | null): Promise<void> {
    this.store.selectCell(this.selectedCellIndex());
    await this.store.setCellValue(value);
  }

  async clearCell(): Promise<void> {
    this.store.selectCell(this.selectedCellIndex());
    await this.store.clearCell();
  }
}
