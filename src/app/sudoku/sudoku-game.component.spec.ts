import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { SudokuGameComponent } from './sudoku-game.component';
import { SudokuStore } from './sudoku.store';
import { SudokuBoardComponent } from './sudoku-board.component';
import { LeaderboardComponent } from './leaderboard.component';
import { SidebarComponent } from './sidebar.component';
import { BoardGalleryComponent } from './board-gallery.component';
import { NumberPadComponent } from './number-pad.component';
import type { PositionedCell } from '../../../shared/sudoku.models';

// ── Fixture helpers ───────────────────────────────────────────────────────────

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

function makeMockStore() {
  return {
    state: signal({ sessionId: 'test-session', error: null as string | null }),
    board: signal<PositionedCell[][]>(makeBoard()),
    isReadOnly: signal(false),
    isBusy: signal(false),
    leaderboard: signal([]),
    myRank: signal<number | null>(null),
    clearError: vi.fn(),
    setInvalidMoveError: vi.fn(),
    selectCell: vi.fn(),
    setCellValue: vi.fn().mockResolvedValue(undefined),
    clearCell: vi.fn().mockResolvedValue(undefined),
    solveBoard: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(null),
    joinSession: vi.fn().mockResolvedValue(undefined),
    refreshLeaderboard: vi.fn(),
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('SudokuGameComponent – setCellValue', () => {
  let fixture: ComponentFixture<SudokuGameComponent>;
  let component: SudokuGameComponent;
  let mockStore: ReturnType<typeof makeMockStore>;

  beforeEach(async () => {
    mockStore = makeMockStore();

    // Override child component templates to avoid their own dependencies
    for (const Cmp of [SudokuBoardComponent, LeaderboardComponent, SidebarComponent, BoardGalleryComponent, NumberPadComponent]) {
      TestBed.overrideComponent(Cmp, { set: { template: '' } });
    }

    await TestBed.configureTestingModule({
      imports: [SudokuGameComponent],
      providers: [
        { provide: SudokuStore, useValue: mockStore },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SudokuGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  });

  // ── Same value early return ────────────────────────────────────────────────

  it('does nothing when the entered value equals the current cell value', async () => {
    mockStore.board.set(makeBoard([{ row: 1, col: 1, value: 5 }]));
    component.selectedCellIndex.set([1, 1]);

    await component.setCellValue(5);

    expect(mockStore.setInvalidMoveError).not.toHaveBeenCalled();
    expect(mockStore.setCellValue).not.toHaveBeenCalled();
  });

  it('does nothing when erasing an already-empty cell', async () => {
    component.selectedCellIndex.set([1, 1]); // null by default

    await component.setCellValue(null);

    expect(mockStore.setCellValue).not.toHaveBeenCalled();
  });

  // ── Conflict detection ────────────────────────────────────────────────────

  it('reports an invalid move when a conflicting number is entered in the same row', async () => {
    mockStore.board.set(makeBoard([{ row: 1, col: 5, value: 3 }]));
    component.selectedCellIndex.set([1, 1]);

    await component.setCellValue(3);

    expect(mockStore.setInvalidMoveError).toHaveBeenCalled();
    expect(mockStore.setCellValue).not.toHaveBeenCalled();
  });

  it('reports an invalid move when a conflicting number is entered in the same column', async () => {
    mockStore.board.set(makeBoard([{ row: 5, col: 1, value: 7 }]));
    component.selectedCellIndex.set([1, 1]);

    await component.setCellValue(7);

    expect(mockStore.setInvalidMoveError).toHaveBeenCalled();
    expect(mockStore.setCellValue).not.toHaveBeenCalled();
  });

  it('reports an invalid move when a conflicting number is entered in the same box', async () => {
    mockStore.board.set(makeBoard([{ row: 2, col: 2, value: 9 }]));
    component.selectedCellIndex.set([1, 1]);

    await component.setCellValue(9);

    expect(mockStore.setInvalidMoveError).toHaveBeenCalled();
    expect(mockStore.setCellValue).not.toHaveBeenCalled();
  });

  // ── Valid value submission ─────────────────────────────────────────────────

  it('submits a valid non-conflicting digit to the store', async () => {
    mockStore.board.set(makeBoard([{ row: 1, col: 5, value: 3 }]));
    component.selectedCellIndex.set([1, 1]);

    await component.setCellValue(7);

    expect(mockStore.setInvalidMoveError).not.toHaveBeenCalled();
    expect(mockStore.setCellValue).toHaveBeenCalledWith(7);
  });

  it('submits null (erase) to the store when the cell has a value', async () => {
    mockStore.board.set(makeBoard([{ row: 1, col: 1, value: 4 }]));
    component.selectedCellIndex.set([1, 1]);

    await component.setCellValue(null);

    expect(mockStore.setCellValue).toHaveBeenCalledWith(null);
  });
});
