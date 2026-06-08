import { TitleCasePipe } from '@angular/common';
import { Component, ElementRef, inject, input, OnInit, signal, viewChildren } from '@angular/core';
import { Router } from '@angular/router';
import type { SessionSummary } from '../../../shared/sudoku.models';
import { SudokuApiService } from './sudoku-api.service';
import { Keys, timeAgo } from './utils';

@Component({
  selector: 'app-board-gallery',
  imports: [TitleCasePipe],
  template: `
    <section class="gallery">
      <div class="gallery__header">
        <h2 class="gallery__title">All Boards</h2>
        <button class="gallery__refresh" tabindex="0" (click)="load()" [disabled]="loading()">
          Refresh
        </button>
      </div>

      @if (loading()) {
        <p class="gallery__status">Loading&hellip;</p>
      } @else if (error()) {
        <p class="gallery__status gallery__status--error">{{ error() }}</p>
      } @else if (sessions().length === 0) {
        <p class="gallery__status">No boards yet.</p>
      } @else {
        <div class="gallery__scroll">
          <table class="gallery__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Difficulty</th>
                <th>Created</th>
                <th>Completions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of sessions(); track s.sessionId; let i = $index) {
                <tr
                  #row
                  class="gallery__row"
                  [class.gallery__row--active]="s.sessionId === activeSessionId()"
                  (click)="navigate(s.sessionId)"
                  [attr.tabindex]="focusedIndex() === i ? 0 : -1"
                  (focus)="focusedIndex.set(i)"
                  (keydown)="onRowKeyDown($event, s.sessionId, i)">
                  <td class="gallery__cell gallery__cell--id" [title]="s.sessionId">
                    {{ s.sessionId.slice(0, 8) }}
                  </td>
                  <td class="gallery__cell">
                    <span class="gallery__badge gallery__badge--{{ s.difficulty }}">
                      {{ s.difficulty | titlecase }}
                    </span>
                  </td>
                  <td class="gallery__cell gallery__cell--muted">{{ age(s.createdAt) }}</td>
                  <td class="gallery__cell gallery__cell--count">{{ s.completedCount }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class BoardGalleryComponent implements OnInit {
  activeSessionId = input<string | null>(null);

  private readonly api = inject(SudokuApiService);
  private readonly router = inject(Router);

  readonly sessions = signal<SessionSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly focusedIndex = signal(0);

  private readonly rows = viewChildren<ElementRef<HTMLElement>>('row');

  age = timeAgo;

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.api.getSessions();
      if (response.ok) {
        this.sessions.set(
          [...response.data.sessions].sort((a, b) => b.createdAt - a.createdAt)
        );
        this.focusedIndex.set(0);
      } else {
        this.error.set('Failed to load boards.');
      }
    } catch {
      this.error.set('Failed to load boards.');
    } finally {
      this.loading.set(false);
    }
  }

  navigate(sessionId: string): void {
    void this.router.navigate(['/sessions', sessionId]);
  }

  onRowKeyDown(e: KeyboardEvent, sessionId: string, index: number): void {
    if (e.key === Keys.ArrowDown) {
      e.preventDefault();
      const next = Math.min(index + 1, this.rows().length - 1);
      this.focusedIndex.set(next);
      this.rows()[next].nativeElement.focus();
    } else if (e.key === Keys.ArrowUp) {
      e.preventDefault();
      const prev = Math.max(index - 1, 0);
      this.focusedIndex.set(prev);
      this.rows()[prev].nativeElement.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.navigate(sessionId);
    }
  }
}
