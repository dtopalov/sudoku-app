import { TitleCasePipe } from '@angular/common';
import { Component, input, model, output, signal } from '@angular/core';
import type { Difficulty } from '../../../shared/sudoku.models';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'random'];

@Component({
  selector: 'app-sidebar',
  imports: [TitleCasePipe],
  template: `
    <aside class="sidebar">
      <section class="sidebar__section">
        <h3 class="sidebar__label">Difficulty</h3>
        <div class="sidebar__difficulty">
          @for (d of difficulties; track d) {
            <button
              class="sidebar__diff-btn"
              [class.sidebar__diff-btn--active]="difficulty() === d"
              [attr.disabled]="isBusy() ? true : undefined"
              tabindex="0"
              (click)="difficulty.set(d)">
              {{ d | titlecase }}
            </button>
          }
        </div>
      </section>

      <button
        class="sidebar__btn sidebar__btn--primary"
        [attr.disabled]="isBusy() ? true : undefined"
        tabindex="0"
        (click)="createRequested.emit(difficulty())">
        New Game
      </button>

      <hr class="sidebar__divider" />

      @if (confirmingSolve()) {
        <div class="sidebar__confirm">
          <p class="sidebar__confirm-text">
            Auto-solving won't count toward the leaderboard. Continue?
          </p>
          <div class="sidebar__confirm-actions">
            <button class="sidebar__btn sidebar__btn--danger" tabindex="0" (click)="confirmSolve()">
              Solve it
            </button>
            <button class="sidebar__btn sidebar__btn--ghost" tabindex="0" (click)="confirmingSolve.set(false)">
              Cancel
            </button>
          </div>
        </div>
      } @else {
        <button
          class="sidebar__btn sidebar__btn--ghost"
          [disabled]="isBusy() || isReadOnly() ? true : undefined"
          tabindex="0"
          (click)="confirmingSolve.set(true)">
          Auto-Solve
        </button>
      }

      @if (sessionId()) {
        <div class="sidebar__session">
          <span class="sidebar__session-label">Session</span>
          <span class="sidebar__session-id" [title]="sessionId()!">
            {{ sessionId()!.slice(0, 8) }}
          </span>
          <button class="sidebar__copy" tabindex="0" (click)="copySession()" title="Copy session ID">
            Copy
          </button>
        </div>
      }
    </aside>
  `,
})
export class SidebarComponent {
  sessionId = input<string | null>(null);
  difficulty = model<Difficulty>('random');
  isBusy = input(false);
  isReadOnly = input(false);

  createRequested = output<Difficulty>();
  solveRequested = output<void>();

  readonly difficulties = DIFFICULTIES;
  readonly confirmingSolve = signal(false);

  confirmSolve(): void {
    this.confirmingSolve.set(false);
    this.solveRequested.emit();
  }

  copySession(): void {
    const id = this.sessionId();
    if (id) void navigator.clipboard.writeText(id);
  }
}
