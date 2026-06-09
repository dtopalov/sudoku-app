import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SudokuBoardComponent } from './sudoku-board.component';
import type { PositionedCell } from '../../../shared/sudoku.models';

// ── Board fixture helper ──────────────────────────────────────────────────────

function makeBoard(overrides: Partial<PositionedCell>[] = []): PositionedCell[][] {
  const board = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c): PositionedCell => ({
      row: r + 1, col: c + 1, value: null, fixed: false,
    }))
  );
  for (const o of overrides) {
    if (o.row != null && o.col != null) {
      board[o.row - 1][o.col - 1] = { ...board[o.row - 1][o.col - 1], ...o };
    }
  }
  return board;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function getCell(fixture: ComponentFixture<SudokuBoardComponent>, row: number, col: number): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `.sudoku-cell[data-row="${row}"][data-col="${col}"]`
  )!;
}

function pointerdown(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
}

function press(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('SudokuBoardComponent', () => {
  let fixture: ComponentFixture<SudokuBoardComponent>;
  let component: SudokuBoardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SudokuBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SudokuBoardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('board', makeBoard());
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  });

  // ── 1. Structure ─────────────────────────────────────────────────────────────

  describe('Structure', () => {
    it('renders 81 .sudoku-cell elements', () => {
      const cells = (fixture.nativeElement as HTMLElement).querySelectorAll('.sudoku-cell');
      expect(cells.length).toBe(81);
    });

    it('each cell has data-row and data-col attributes', () => {
      const cells = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.sudoku-cell');
      for (const cell of Array.from(cells)) {
        expect(cell.dataset['row']).toBeTruthy();
        expect(cell.dataset['col']).toBeTruthy();
      }
    });

    it('keydown on a cell bubbles up to the table handler', () => {
      const table = (fixture.nativeElement as HTMLElement).querySelector('table')!;
      let called = false;
      table.addEventListener('keydown', () => { called = true; }, { once: true });
      const c = getCell(fixture, 1, 1);
      c.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      expect(called).toBe(true);
    });
  });

  // ── 2. Pointer-down selection ─────────────────────────────────────────────

  describe('Pointer-down selection', () => {
    it('pointerdown on a cell updates selectedCellIndex()', () => {
      pointerdown(getCell(fixture, 3, 5));
      expect(component.selectedCellIndex()).toEqual([3, 5]);
    });

    it('clicked cell gets sudoku-cell--selected class and tabIndex=0', () => {
      const c = getCell(fixture, 2, 4);
      pointerdown(c);
      TestBed.flushEffects();
      fixture.detectChanges();
      expect(c.classList.contains('sudoku-cell--selected')).toBe(true);
      expect(c.tabIndex).toBe(0);
    });

    it('previous cell loses sudoku-cell--selected and tabIndex=0', () => {
      const first = getCell(fixture, 1, 1);
      const second = getCell(fixture, 2, 2);
      pointerdown(first);
      TestBed.flushEffects();
      fixture.detectChanges();
      expect(first.classList.contains('sudoku-cell--selected')).toBe(true);

      pointerdown(second);
      TestBed.flushEffects();
      fixture.detectChanges();
      expect(first.classList.contains('sudoku-cell--selected')).toBe(false);
      expect(first.tabIndex).toBe(-1);
      expect(second.classList.contains('sudoku-cell--selected')).toBe(true);
      expect(second.tabIndex).toBe(0);
    });
  });

  // ── 3. Digit entry ────────────────────────────────────────────────────────

  describe('Digit entry', () => {
    it('pressing digits 1–9 emits valueEntered with the number', () => {
      const emitted: (number | null)[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      for (let d = 1; d <= 9; d++) {
        press(c, String(d));
      }
      expect(emitted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("pressing '0' emits null", () => {
      const emitted: (number | null)[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, '0');
      expect(emitted).toEqual([null]);
    });

    it('non-digit non-nav key does nothing', () => {
      const emitted: unknown[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'a');
      press(c, 'F1');
      expect(emitted).toHaveLength(0);
    });
  });

  // ── 4. Clear keys ─────────────────────────────────────────────────────────

  describe('Clear keys', () => {
    it('Backspace emits null via valueEntered', () => {
      const emitted: (number | null)[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'Backspace');
      expect(emitted).toEqual([null]);
    });

    it('Delete emits null via valueEntered', () => {
      const emitted: (number | null)[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'Delete');
      expect(emitted).toEqual([null]);
    });
  });

  // ── 5. Fixed cells ────────────────────────────────────────────────────────

  describe('Fixed cells', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('board', makeBoard([{ row: 1, col: 1, value: 5, fixed: true }]));
      fixture.detectChanges();
      TestBed.flushEffects();
      fixture.detectChanges();
    });

    it('digit keys are ignored on fixed cells', () => {
      const emitted: unknown[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, '3');
      expect(emitted).toHaveLength(0);
    });

    it('clear keys are ignored on fixed cells', () => {
      const emitted: unknown[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'Backspace');
      expect(emitted).toHaveLength(0);
    });
  });

  // ── 6. Read-only mode ─────────────────────────────────────────────────────

  describe('Read-only mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isReadOnly', true);
      fixture.detectChanges();
    });

    it('digits are ignored when isReadOnly is true', () => {
      const emitted: unknown[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, '5');
      expect(emitted).toHaveLength(0);
    });
  });

  // ── 7. Navigation ─────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('ArrowRight updates selectedCellIndex to [row, col+1]', () => {
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'ArrowRight');
      expect(component.selectedCellIndex()).toEqual([1, 2]);
    });

    it('ArrowLeft updates selectedCellIndex to [row, col-1]', () => {
      const c = getCell(fixture, 1, 5);
      pointerdown(c);
      press(c, 'ArrowLeft');
      expect(component.selectedCellIndex()).toEqual([1, 4]);
    });

    it('ArrowDown updates selectedCellIndex to [row+1, col]', () => {
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'ArrowDown');
      expect(component.selectedCellIndex()).toEqual([2, 1]);
    });

    it('ArrowUp updates selectedCellIndex to [row-1, col]', () => {
      const c = getCell(fixture, 5, 1);
      pointerdown(c);
      press(c, 'ArrowUp');
      expect(component.selectedCellIndex()).toEqual([4, 1]);
    });

    it('ArrowLeft clamps at col=1', () => {
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'ArrowLeft');
      expect(component.selectedCellIndex()).toEqual([1, 1]);
    });

    it('ArrowRight clamps at col=9', () => {
      const c = getCell(fixture, 1, 9);
      pointerdown(c);
      press(c, 'ArrowRight');
      expect(component.selectedCellIndex()).toEqual([1, 9]);
    });

    it('ArrowUp clamps at row=1', () => {
      const c = getCell(fixture, 1, 1);
      pointerdown(c);
      press(c, 'ArrowUp');
      expect(component.selectedCellIndex()).toEqual([1, 1]);
    });

    it('ArrowDown clamps at row=9', () => {
      const c = getCell(fixture, 9, 1);
      pointerdown(c);
      press(c, 'ArrowDown');
      expect(component.selectedCellIndex()).toEqual([9, 1]);
    });
  });
});
