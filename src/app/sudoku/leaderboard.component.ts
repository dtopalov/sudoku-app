import { Component, ElementRef, inject, input, output } from '@angular/core';
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
        <ol class="leaderboard__list" (keydown)="onListKeyDown($event)" (pointerdown)="onListPointerDown($event)">
          @for (entry of entries(); track entry.userId; let rank = $index) {
            <li
              class="leaderboard__item"
              [class.leaderboard__item--mine]="rank + 1 === myRank()"
              [class.leaderboard__item--top3]="rank < 3"
              tabindex="-1"
              [attr.data-index]="rank">
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private rovingItem: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.initRovingTabindex();
  }

  focusItem(index: number): void {
    if (this.rovingItem) {
      this.rovingItem.tabIndex = -1;
    }

    const item = this.host.nativeElement.querySelector<HTMLElement>(
      `.leaderboard__item[data-index="${index}"]`
    );

    if (!item) {
      return;
    }

    item.tabIndex = 0;
    this.rovingItem = item;
    item.focus();
  }

  onListKeyDown(e: KeyboardEvent): void {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');

    if (!item) {
      return;
    }

    const index = Number(item.dataset['index']);
    const count = this.entries().length;

    switch (e.key) {
      case Keys.ArrowDown:
        e.preventDefault();
        this.focusItem(Math.min(index + 1, count - 1));
        break;
      case Keys.ArrowUp:
        e.preventDefault();
        this.focusItem(Math.max(index - 1, 0));
        break;
    }
  }

  onListPointerDown(e: PointerEvent): void {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');

    if (!item) {
      return;
    }

    e.preventDefault();
    this.focusItem(Number(item.dataset['index']));
  }

  private initRovingTabindex(): void {
    if (this.rovingItem) {
      this.rovingItem.tabIndex = -1;
      this.rovingItem = null;
    }

    const firstItem = this.host.nativeElement.querySelector<HTMLElement>(
      '.leaderboard__item[data-index="0"]'
    );

    if (firstItem) {
      firstItem.tabIndex = 0;
      this.rovingItem = firstItem;
    }
  }

  truncate(userId: string): string {
    return userId.length > 14 ? userId.slice(0, 14) + '…' : userId;
  }
}
