import {
  afterNextRender,
  Component,
  EnvironmentInjector,
  inject,
  input,
  model,
  output,
  runInInjectionContext,
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
    <table class="sudoku-table" role="grid">
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
                [class.sudoku-cell--selected]="isSelected(cell)"
                [class.sudoku-cell--fixed]="cell.fixed"
                [class.sudoku-cell--readonly]="isReadOnly()"
                role="gridcell"
                [attr.tabindex]="isSelected(cell) ? 0 : undefined"
                (click)="onCellClick(cell)"
                (keydown)="onKeyDown($event, cell.fixed)">
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
  private readonly environmentInjector = inject(EnvironmentInjector);

  isSelected(cell: PositionedCell): boolean {
    return cell.row === this.selectedCellIndex()[0] && cell.col === this.selectedCellIndex()[1];
  }

  onCellClick(cell: PositionedCell): void {
    this.selectedCellIndex.set([cell.row, cell.col]);
    runInInjectionContext(this.environmentInjector, () =>
      afterNextRender(() =>
        (document.querySelector('.sudoku-cell--selected') as HTMLElement | null)?.focus()
      )
    );
  }

  onKeyDown(e: KeyboardEvent, isCellFixed: boolean): void {
    const isNumber = /^[0-9]$/i.test(e.key);
    const isClearValueKey = CLEAR_KEYS.some((k) => k === e.key);
    const isNavKey = NAVIGATION_KEYS.some((k) => k === e.key);

    if (!isNumber && !isClearValueKey && !isNavKey) return;

    if (isNavKey) {
      this.navigateBoard(e.key);
      return;
    }

    if (isCellFixed || this.isReadOnly()) return;

    if (isNumber && +e.key !== 0 && this.isConflictingNumber(+e.key)) {
      this.store.setInvalidMoveError();
      return;
    }

    this.valueEntered.emit(isClearValueKey || +e.key === 0 ? null : +e.key);
  }

  private isConflictingNumber(contender: number): boolean {
    const board = this.board();
    const [selectedRow, selectedCol] = this.selectedCellIndex();

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

  private navigateBoard(key: string): void {
    let direction = [0, 0];

    switch (key) {
      case Keys.ArrowLeft:  direction = [0, -1];  break;
      case Keys.ArrowUp:    direction = [-1, 0];  break;
      case Keys.ArrowRight: direction = [0, 1];   break;
      case Keys.ArrowDown:  direction = [1, 0];   break;
      case Keys.PageUp:     direction = [-1, 1];  break;
      case Keys.PageDown:   direction = [1, 1];   break;
      case Keys.End:        direction = [1, -1];  break;
      case Keys.Home:       direction = [-1, -1]; break;
    }

    const [currentRow, currentCol] = this.selectedCellIndex();
    const targetRow = Math.min(Math.max(currentRow + direction[0], 1), 9);
    const targetCol = Math.min(Math.max(currentCol + direction[1], 1), 9);

    this.selectedCellIndex.set([targetRow, targetCol]);
    runInInjectionContext(this.environmentInjector, () =>
      afterNextRender(() =>
        (document.querySelector('.sudoku-cell--selected') as HTMLElement | null)?.focus()
      )
    );
  }
}
