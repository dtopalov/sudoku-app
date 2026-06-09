import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardGalleryComponent } from './board-gallery.component';
import { SudokuApiService } from './sudoku-api.service';
import type { SessionSummary } from '../../../shared/sudoku.models';

const SESSIONS: SessionSummary[] = [
  { sessionId: 'aaa111aaa111', difficulty: 'easy', createdAt: 3, completedCount: 0 },
  { sessionId: 'bbb222bbb222', difficulty: 'hard', createdAt: 2, completedCount: 1 },
  { sessionId: 'ccc333ccc333', difficulty: 'medium', createdAt: 1, completedCount: 2 },
];
// sorted descending by createdAt: aaa→bbb→ccc, so data-row 1=aaa, 2=bbb, 3=ccc

function cell(fixture: ComponentFixture<BoardGalleryComponent>, row: number, col: number): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `[data-row="${row}"][data-col="${col}"]`
  )!;
}

function pointerdown(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
}

function press(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('BoardGalleryComponent', () => {
  let fixture: ComponentFixture<BoardGalleryComponent>;
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
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  describe('Structure', () => {
    it('renders a data row for each session', () => {
      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.gallery__row');
      expect(rows.length).toBe(3);
    });

    it('renders all four header cells', () => {
      for (let col = 0; col <= 3; col++) {
        expect(cell(fixture, 0, col)).not.toBeNull();
      }
    });

    it('renders data cells in each session row', () => {
      for (let row = 1; row <= 3; row++) {
        for (let col = 0; col <= 4; col++) {
          expect(cell(fixture, row, col)).not.toBeNull();
        }
      }
    });
  });

  describe('Initial tabindex', () => {
    it('first header cell (row=0, col=0) has tabindex=0 from static template', () => {
      expect(cell(fixture, 0, 0).tabIndex).toBe(0);
    });

    it('remaining header cells have tabindex=-1', () => {
      for (let col = 1; col <= 3; col++) {
        expect(cell(fixture, 0, col).tabIndex).toBe(-1);
      }
    });

    it('all data cells start with tabindex=-1', () => {
      for (let row = 1; row <= 3; row++) {
        for (let col = 0; col <= 4; col++) {
          expect(cell(fixture, row, col).tabIndex).toBe(-1);
        }
      }
    });
  });

  describe('Pointer-down focus', () => {
    it('clicking a cell gives it tabindex=0 and calls focus()', () => {
      const target = cell(fixture, 0, 1);
      const focusSpy = vi.spyOn(target, 'focus');
      pointerdown(target);
      expect(target.tabIndex).toBe(0);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('clicking a second cell moves tabindex=0 to it and removes from the first', () => {
      const first = cell(fixture, 0, 0);
      const second = cell(fixture, 0, 1);
      pointerdown(first);
      expect(first.tabIndex).toBe(0);
      pointerdown(second);
      expect(first.tabIndex).toBe(-1);
      expect(second.tabIndex).toBe(0);
    });

    it('calls e.preventDefault() (event.defaultPrevented === true)', () => {
      const target = cell(fixture, 1, 0);
      const evt = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      target.dispatchEvent(evt);
      expect(evt.defaultPrevented).toBe(true);
    });
  });

  describe('ArrowRight', () => {
    it('moves col+1 within a header row', () => {
      const c0 = cell(fixture, 0, 0);
      const c1 = cell(fixture, 0, 1);
      pointerdown(c0);
      press(c0, 'ArrowRight');
      expect(c1.tabIndex).toBe(0);
    });

    it('previous cell loses tabindex=0', () => {
      const c0 = cell(fixture, 0, 0);
      pointerdown(c0);
      press(c0, 'ArrowRight');
      expect(c0.tabIndex).toBe(-1);
    });

    it('clamps at col=3 for header row', () => {
      const c3 = cell(fixture, 0, 3);
      pointerdown(c3);
      press(c3, 'ArrowRight');
      expect(c3.tabIndex).toBe(0);
    });

    it('moves col+1 within a data row', () => {
      const c0 = cell(fixture, 1, 0);
      const c1 = cell(fixture, 1, 1);
      pointerdown(c0);
      press(c0, 'ArrowRight');
      expect(c1.tabIndex).toBe(0);
    });

    it('clamps at col=4 for data rows', () => {
      const c4 = cell(fixture, 1, 4);
      pointerdown(c4);
      press(c4, 'ArrowRight');
      expect(c4.tabIndex).toBe(0);
    });
  });

  describe('ArrowLeft', () => {
    it('moves col-1', () => {
      const c2 = cell(fixture, 0, 2);
      const c1 = cell(fixture, 0, 1);
      pointerdown(c2);
      press(c2, 'ArrowLeft');
      expect(c1.tabIndex).toBe(0);
    });

    it('clamps at col=0', () => {
      const c0 = cell(fixture, 0, 0);
      pointerdown(c0);
      press(c0, 'ArrowLeft');
      expect(c0.tabIndex).toBe(0);
    });
  });

  describe('ArrowDown', () => {
    it('moves to row+1', () => {
      const c00 = cell(fixture, 0, 0);
      const c10 = cell(fixture, 1, 0);
      pointerdown(c00);
      press(c00, 'ArrowDown');
      expect(c10.tabIndex).toBe(0);
    });

    it('focuses the new cell', () => {
      const c10 = cell(fixture, 1, 0);
      const focusSpy = vi.spyOn(c10, 'focus');
      const c00 = cell(fixture, 0, 0);
      pointerdown(c00);
      press(c00, 'ArrowDown');
      expect(focusSpy).toHaveBeenCalled();
    });

    it('clamps at the last data row', () => {
      const c30 = cell(fixture, 3, 0);
      pointerdown(c30);
      press(c30, 'ArrowDown');
      expect(c30.tabIndex).toBe(0);
    });
  });

  describe('ArrowUp', () => {
    it('moves to row-1', () => {
      const c20 = cell(fixture, 2, 0);
      const c10 = cell(fixture, 1, 0);
      pointerdown(c20);
      press(c20, 'ArrowUp');
      expect(c10.tabIndex).toBe(0);
    });

    it('clamps at row=0', () => {
      const c00 = cell(fixture, 0, 0);
      pointerdown(c00);
      press(c00, 'ArrowUp');
      expect(c00.tabIndex).toBe(0);
    });

    it('clips col to 3 when moving from a data row col=4 into the header', () => {
      const c14 = cell(fixture, 1, 4);
      const c03 = cell(fixture, 0, 3);
      pointerdown(c14);
      press(c14, 'ArrowUp');
      expect(c03.tabIndex).toBe(0);
    });
  });

  describe('Enter/Space activation', () => {
    it('Enter on a data cell navigates to the session', () => {
      const c10 = cell(fixture, 1, 0);
      pointerdown(c10);
      press(c10, 'Enter');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sessions', 'aaa111aaa111']);
    });

    it('Space on a data cell navigates to the session', () => {
      const c10 = cell(fixture, 1, 0);
      pointerdown(c10);
      press(c10, ' ');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/sessions', 'aaa111aaa111']);
    });

    it('Enter on a header cell does NOT navigate', () => {
      const c00 = cell(fixture, 0, 0);
      pointerdown(c00);
      press(c00, 'Enter');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('Space on a header cell does NOT navigate', () => {
      const c00 = cell(fixture, 0, 0);
      pointerdown(c00);
      press(c00, ' ');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Refresh button', () => {
    it('has tabindex="0"', () => {
      const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.gallery__refresh');
      expect(btn?.getAttribute('tabindex')).toBe('0');
    });
  });
});
