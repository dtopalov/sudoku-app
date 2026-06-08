import { Routes } from '@angular/router';
import { SudokuGameComponent } from './sudoku/sudoku-game.component';

export const routes: Routes = [
  { path: '', component: SudokuGameComponent },
  { path: 'sessions/:sessionId', component: SudokuGameComponent },
  { path: '**', redirectTo: '' },
];
