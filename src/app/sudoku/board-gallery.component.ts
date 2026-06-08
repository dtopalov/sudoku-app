import { TitleCasePipe } from '@angular/common';
import { Component, ElementRef, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { SessionSummary } from '../../../shared/sudoku.models';
import { SudokuApiService } from './sudoku-api.service';
import { Keys, timeAgo } from './utils';

const MAX_COL = 4;

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
          <table class="gallery__table" (keydown)="onTableKeyDown($event)" (pointerdown)="onTablePointerDown($event)">
            <thead>
              <tr>
                <th class="gallery__cell" tabindex="0"  data-row="0" data-col="0">ID</th>
                <th class="gallery__cell" tabindex="-1" data-row="0" data-col="1">Difficulty</th>
                <th class="gallery__cell" tabindex="-1" data-row="0" data-col="2">Created</th>
                <th class="gallery__cell" tabindex="-1" data-row="0" data-col="3">Completions</th>
                <th class="gallery__cell gallery__cell--cmd"></th>
              </tr>
            </thead>
            <tbody>
              @for (s of sessions(); track s.sessionId; let i = $index) {
                <tr class="gallery__row" [class.gallery__row--active]="s.sessionId === activeSessionId()" [attr.data-session-id]="s.sessionId">
                  <td class="gallery__cell gallery__cell--id" tabindex="-1" [title]="s.sessionId" [attr.data-row]="i + 1" data-col="0">{{ s.sessionId.slice(0, 8) }}</td>
                  <td class="gallery__cell" tabindex="-1" [attr.data-row]="i + 1" data-col="1"><span class="gallery__badge gallery__badge--{{ s.difficulty }}">{{ s.difficulty | titlecase }}</span></td>
                  <td class="gallery__cell gallery__cell--muted" tabindex="-1" [attr.data-row]="i + 1" data-col="2">{{ age(s.createdAt) }}</td>
                  <td class="gallery__cell gallery__cell--count" tabindex="-1" [attr.data-row]="i + 1" data-col="3">{{ s.completedCount }}</td>
                  <td class="gallery__cell gallery__cell--cmd" tabindex="-1" [attr.data-row]="i + 1" data-col="4">
                    <button class="gallery__select-btn" tabindex="-1" (click)="navigate(s.sessionId)">Select</button>
                  </td>
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly sessions = signal<SessionSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private rovingCell: HTMLElement | null = null;

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
        this.resetRovingTabindex();
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

  focusCell(row: number, col: number): void {
    if (this.rovingCell) this.rovingCell.tabIndex = -1;

    const cell = this.host.nativeElement.querySelector<HTMLElement>(
      `.gallery__cell[data-row="${row}"][data-col="${col}"]`
    );
    if (!cell) return;

    cell.tabIndex = 0;
    this.rovingCell = cell;
    cell.focus();
  }

  onTablePointerDown(e: PointerEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]');
    if (!cell) return;
    e.preventDefault();
    this.focusCell(Number(cell.dataset['row']), Number(cell.dataset['col']));
  }

  onTableKeyDown(e: KeyboardEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]');
    if (!cell) return;

    const row = Number(cell.dataset['row']);
    const col = Number(cell.dataset['col']);
    const maxRow = this.sessions().length;
    const maxCol = row === 0 ? 3 : MAX_COL;

    let newRow = row;
    let newCol = col;

    switch (e.key) {
      case Keys.ArrowDown:
        e.preventDefault();
        newRow = Math.min(row + 1, maxRow);
        if (newRow > 0 && newCol > MAX_COL) newCol = MAX_COL;
        break;
      case Keys.ArrowUp:
        e.preventDefault();
        newRow = Math.max(row - 1, 0);
        if (newRow === 0 && newCol > 3) newCol = 3;
        break;
      case Keys.ArrowRight:
        e.preventDefault();
        newCol = Math.min(col + 1, maxCol);
        break;
      case Keys.ArrowLeft:
        e.preventDefault();
        newCol = Math.max(col - 1, 0);
        break;
      case 'Enter':
      case ' ': {
        const sessionId = cell.closest('tr')?.dataset['sessionId'];
        if (sessionId) {
          e.preventDefault();
          this.navigate(sessionId);
        }
        break;
      }
    }

    if (newRow !== row || newCol !== col) {
      this.focusCell(newRow, newCol);
    }
  }

  private resetRovingTabindex(): void {
    if (this.rovingCell) {
      this.rovingCell.tabIndex = -1;
      this.rovingCell = null;
    }
    const first = this.host.nativeElement.querySelector<HTMLElement>('.gallery__cell[data-row="0"][data-col="0"]');
    if (first) {
      first.tabIndex = 0;
      this.rovingCell = first;
    }
  }
}
