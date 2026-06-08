import { Component, ElementRef, input, output, signal, viewChildren } from '@angular/core';
import type { LeaderboardEntry } from '../../../shared/sudoku.models';
import { Keys } from './utils';
import { formatDuration } from './utils';

@Component({
  selector: 'app-leaderboard',
  template: `
    <section class="leaderboard">
      <div class="leaderboard__header">
        <h2 class="leaderboard__title">Leaderboard</h2>
        <button
          class="leaderboard__refresh"
          tabindex="0"
          (click)="refreshRequested.emit()"
          [disabled]="isBusy()">
          Refresh
        </button>
      </div>

      @if (entries().length === 0) {
        <p class="leaderboard__empty">No completions yet.</p>
      } @else {
        <ol class="leaderboard__list">
          @for (entry of entries(); track entry.userId; let rank = $index) {
            <li
              #item
              class="leaderboard__item"
              [class.leaderboard__item--mine]="rank + 1 === myRank()"
              [class.leaderboard__item--top3]="rank < 3"
              [attr.tabindex]="focusedIndex() === rank ? 0 : -1"
              (focus)="focusedIndex.set(rank)"
              (keydown)="onKeyDown($event, rank)">
              <span class="leaderboard__rank leaderboard__rank--{{ rank + 1 }}">
                {{ rank + 1 }}
              </span>
              <span class="leaderboard__user" [title]="entry.userId">
                {{ truncate(entry.userId) }}
              </span>
              <span class="leaderboard__time">{{ format(entry.durationMs) }}</span>
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class LeaderboardComponent {
  entries = input.required<LeaderboardEntry[]>();
  myRank = input<number | null>(null);
  isBusy = input(false);

  refreshRequested = output<void>();

  format = formatDuration;

  readonly focusedIndex = signal(0);
  private readonly items = viewChildren<ElementRef<HTMLElement>>('item');

  onKeyDown(e: KeyboardEvent, rank: number): void {
    const all = this.items();
    let next = rank;

    if (e.key === Keys.ArrowDown) {
      next = Math.min(rank + 1, all.length - 1);
    } else if (e.key === Keys.ArrowUp) {
      next = Math.max(rank - 1, 0);
    } else {
      return;
    }

    e.preventDefault();
    this.focusedIndex.set(next);
    all[next].nativeElement.focus();
  }

  truncate(userId: string): string {
    return userId.length > 14 ? userId.slice(0, 14) + '…' : userId;
  }
}
