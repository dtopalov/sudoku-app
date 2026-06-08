import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { PositionedCell } from './../../../shared/sudoku.models';
import { SudokuStore } from './sudoku.store';
import { Keys } from './utils';

const CLEAR_KEYS = [Keys.Backspace, Keys.Delete, Keys.Clear];
const NAVIGATION_KEYS = [
  Keys.ArrowLeft,
  Keys.ArrowUp,
  Keys.ArrowRight,
  Keys.ArrowDown,
  Keys.PageUp,
  Keys.PageDown,
  Keys.End,
  Keys.Home,
];

@Component({
  selector: 'app-sudoku-board',
  template: `
    <table class="sudoku-table" role="grid" (keydown)="onTableKeyDown($event)" (pointerdown)="onTablePointerDown($event)">
      <colgroup>
        @for (cell of board()?.[0]; track $index) {
          <col />
        }
      </colgroup>
      <thead>
        <tr>
          @for (cell of board()?.[0] ?? []; track cell.col) {
            <th role="none"><span class="sr-only">0</span></th>
            <th scope="col"><span class="sr-only">{{ cell.col }}</span></th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of board(); track $index; let rowIndex = $index) {
          <tr>
            <td role="rowheader"><span class="sr-only">{{ rowIndex + 1 }}</span></td>
            @for (cell of row; track cell.col) {
              <td
                class="sudoku-cell"
                [class.sudoku-cell--fixed]="cell.fixed"
                [class.sudoku-cell--readonly]="isReadOnly()"
                role="gridcell"
                tabindex="-1"
                [attr.data-row]="cell.row"
                [attr.data-col]="cell.col"
                [attr.data-fixed]="cell.fixed ? '' : null">
                {{ cell.value ?? '' }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class SudokuBoardComponent {
  board = input.required<PositionedCell[][]>();
  isReadOnly = input(false);

  // [row, col] 1-based
  selectedCellIndex = model<[number, number]>([1, 1]);

  valueEntered = output<number | null>();
  clearRequested = output<void>();

  private readonly store = inject(SudokuStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private rovingCell: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const [row, col] = this.selectedCellIndex();
      this.board(); // track board changes so selection is re-applied after rerenders
      this.applySelection(row, col);
    });
  }

  onTablePointerDown(e: PointerEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]');
    if (!cell) return;
    this.focusCell(Number(cell.dataset['row']), Number(cell.dataset['col']));
  }

  onTableKeyDown(e: KeyboardEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]');
    if (!cell) return;

    const row = Number(cell.dataset['row']);
    const col = Number(cell.dataset['col']);
    const isFixed = 'fixed' in cell.dataset;

    const isNumber = /^[0-9]$/i.test(e.key);
    const isClearValueKey = CLEAR_KEYS.some((k) => k === e.key);
    const isNavKey = NAVIGATION_KEYS.some((k) => k === e.key);

    if (!isNumber && !isClearValueKey && !isNavKey) return;

    if (isNavKey) {
      e.preventDefault();
      this.navigateBoard(e.key, row, col);
      return;
    }

    if (isFixed || this.isReadOnly()) return;

    if (isNumber && +e.key !== 0 && this.isConflictingNumber(row, col, +e.key)) {
      this.store.setInvalidMoveError();
      return;
    }

    this.valueEntered.emit(isClearValueKey || +e.key === 0 ? null : +e.key);
  }

  private focusCell(row: number, col: number): void {
    this.applySelection(row, col);
    this.rovingCell?.focus();
    this.selectedCellIndex.set([row, col]);
  }

  private applySelection(row: number, col: number): void {
    if (this.rovingCell) {
      this.rovingCell.tabIndex = -1;
      this.rovingCell.classList.remove('sudoku-cell--selected');
    }
    const cell = this.host.nativeElement.querySelector<HTMLElement>(
      `.sudoku-cell[data-row="${row}"][data-col="${col}"]`
    );
    if (!cell) return;
    cell.tabIndex = 0;
    cell.classList.add('sudoku-cell--selected');
    this.rovingCell = cell;
  }

  private navigateBoard(key: string, currentRow: number, currentCol: number): void {
    let rowDelta = 0;
    let colDelta = 0;

    switch (key) {
      case Keys.ArrowLeft: {
        colDelta = -1;
        break;
      }
      case Keys.ArrowUp: {
        rowDelta = -1;
        break;
      }
      case Keys.ArrowRight: {
        colDelta = 1;
        break;
      }
      case Keys.ArrowDown: {
        rowDelta = 1;
        break;
      }
      case Keys.PageUp: {
        rowDelta = -1;
        colDelta = 1;
        break;
      }
      case Keys.PageDown: {
        rowDelta = 1;
        colDelta = 1;
        break;
      }
      case Keys.End: {
        rowDelta = 1;
        colDelta = -1;
        break;
      }
      case Keys.Home: {
        rowDelta = -1;
        colDelta = -1;
        break;
      }
    }

    this.focusCell(
      Math.min(Math.max(currentRow + rowDelta, 1), 9),
      Math.min(Math.max(currentCol + colDelta, 1), 9),
    );
  }

  private isConflictingNumber(selectedRow: number, selectedCol: number, contender: number): boolean {
    const board = this.board();

    if (board[selectedRow - 1].some((cell) => cell.value === contender)) return true;

    for (let i = 0; i < board.length; i++) {
      if (board[i][selectedCol - 1].value === contender) return true;
    }

    const boxRow = Math.floor((selectedRow - 1) / 3);
    const boxCol = Math.floor((selectedCol - 1) / 3);

    for (let i = boxRow * 3; i < boxRow * 3 + 3; i++) {
      for (let j = boxCol * 3; j < boxCol * 3 + 3; j++) {
        if (board[i][j].value === contender) return true;
      }
    }

    return false;
  }
}
