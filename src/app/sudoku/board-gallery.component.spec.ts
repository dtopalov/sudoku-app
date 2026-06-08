import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardGalleryComponent } from './board-gallery.component';
import { SudokuApiService } from './sudoku-api.service';
import type { SessionSummary } from '../../../shared/sudoku.models';

const SESSIONS: SessionSummary[] = [
  { sessionId: 'aaa111', difficulty: 'easy', createdAt: 3, completedCount: 0 },
  { sessionId: 'bbb222', difficulty: 'hard', createdAt: 2, completedCount: 1 },
  { sessionId: 'ccc333', difficulty: 'medium', createdAt: 1, completedCount: 2 },
];

// load() sorts descending by createdAt, so rendered order is aaa→bbb→ccc

function press(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function rows(fixture: ComponentFixture<BoardGalleryComponent>): HTMLElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.gallery__row')
  );
}

describe('BoardGalleryComponent – keyboard accessibility', () => {
  let fixture: ComponentFixture<BoardGalleryComponent>;
  let component: BoardGalleryComponent;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRouter = { navigate: vi.fn() };

    const mockApi = {
      getSessions: vi.fn().mockResolvedValue({ ok: true, data: { sessions: SESSIONS } }),
    };

    await TestBed.configureTestingModule({
      imports: [BoardGalleryComponent],
      providers: [
        { provide: SudokuApiService, useValue: mockApi },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  describe('Refresh button', () => {
    it('has tabindex="0"', () => {
      const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.gallery__refresh');
      expect(btn?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('initial roving tabindex', () => {
    it('renders one row per session', () => {
      expect(rows(fixture).length).toBe(3);
    });

    it('gives only the first row tabindex 0', () => {
      const els = rows(fixture);
      expect(els[0].tabIndex).toBe(0);
      expect(els[1].tabIndex).toBe(-1);
      expect(els[2].tabIndex).toBe(-1);
    });
  });

  describe('ArrowDown', () => {
    it('moves tabindex 0 to the next row', () => {
      const els = rows(fixture);
      press(els[0], 'ArrowDown');
      fixture.detectChanges();

      expect(els[0].tabIndex).toBe(-1);
      expect(els[1].tabIndex).toBe(0);
    });

    it('focuses the next row element', () => {
      const els = rows(fixture);
      const spy = vi.spyOn(els[1], 'focus');
      press(els[0], 'ArrowDown');
      expect(spy).toHaveBeenCalled();
    });

    it('does not move past the last row', () => {
      component.focusedIndex.set(2);
      fixture.detectChanges();
      const els = rows(fixture);
      press(els[2], 'ArrowDown');
      fixture.detectChanges();

      expect(els[2].tabIndex).toBe(0);
    });
  });

  describe('ArrowUp', () => {
    it('moves tabindex 0 to the previous row', () => {
      component.focusedIndex.set(1);
      fixture.detectChanges();
      const els = rows(fixture);
      press(els[1], 'ArrowUp');
      fixture.detectChanges();

      expect(els[0].tabIndex).toBe(0);
      expect(els[1].tabIndex).toBe(-1);
    });

    it('focuses the previous row element', () => {
      component.focusedIndex.set(1);
      fixture.detectChanges();
      const els = rows(fixture);
      const spy = vi.spyOn(els[0], 'focus');
      press(els[1], 'ArrowUp');
      expect(spy).toHaveBeenCalled();
    });

    it('does not move before the first row', () => {
      const els = rows(fixture);
      press(els[0], 'ArrowUp');
      fixture.detectChanges();

      expect(els[0].tabIndex).toBe(0);
    });
  });

  describe('Enter / Space activation', () => {
    it('Enter navigates to the session', () => {
      const els = rows(fixture);
      press(els[0], 'Enter');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sessions', 'aaa111']);
    });

    it('Space navigates to the session', () => {
      const els = rows(fixture);
      press(els[0], ' ');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sessions', 'aaa111']);
    });
  });

  describe('focus event sync', () => {
    it('updates focusedIndex when a row receives focus directly', () => {
      const els = rows(fixture);
      els[2].dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      expect(component.focusedIndex()).toBe(2);
    });
  });

  describe('focusedIndex resets on reload', () => {
    it('resets to 0 after load()', async () => {
      component.focusedIndex.set(2);
      await component.load();
      fixture.detectChanges();
      expect(component.focusedIndex()).toBe(0);
    });
  });
});
