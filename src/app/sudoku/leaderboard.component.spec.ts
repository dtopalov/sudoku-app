import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaderboardComponent } from './leaderboard.component';
import type { LeaderboardEntry } from '../../../shared/sudoku.models';

const ENTRIES: LeaderboardEntry[] = [
  { userId: 'alice', durationMs: 60_000, completedAt: 1 },
  { userId: 'bob', durationMs: 90_000, completedAt: 2 },
  { userId: 'carol', durationMs: 120_000, completedAt: 3 },
];

function press(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function items(fixture: ComponentFixture<LeaderboardComponent>): HTMLElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.leaderboard__item')
  );
}

describe('LeaderboardComponent – keyboard accessibility', () => {
  let fixture: ComponentFixture<LeaderboardComponent>;
  let component: LeaderboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LeaderboardComponent] }).compileComponents();
    fixture = TestBed.createComponent(LeaderboardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entries', ENTRIES);
    fixture.detectChanges();
  });

  describe('Refresh button', () => {
    it('has tabindex="0"', () => {
      const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.leaderboard__refresh');
      expect(btn?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('initial roving tabindex', () => {
    it('gives only the first item tabindex 0', () => {
      const els = items(fixture);
      expect(els[0].tabIndex).toBe(0);
      expect(els[1].tabIndex).toBe(-1);
      expect(els[2].tabIndex).toBe(-1);
    });
  });

  describe('ArrowDown', () => {
    it('moves tabindex 0 to the next item', () => {
      const els = items(fixture);
      press(els[0], 'ArrowDown');
      fixture.detectChanges();

      expect(els[0].tabIndex).toBe(-1);
      expect(els[1].tabIndex).toBe(0);
      expect(els[2].tabIndex).toBe(-1);
    });

    it('focuses the next element', () => {
      const els = items(fixture);
      const spy = vi.spyOn(els[1], 'focus');
      press(els[0], 'ArrowDown');
      expect(spy).toHaveBeenCalled();
    });

    it('does not move past the last item', () => {
      component.focusedIndex.set(2);
      fixture.detectChanges();
      const els = items(fixture);
      press(els[2], 'ArrowDown');
      fixture.detectChanges();

      expect(els[2].tabIndex).toBe(0);
    });
  });

  describe('ArrowUp', () => {
    it('moves tabindex 0 to the previous item', () => {
      component.focusedIndex.set(2);
      fixture.detectChanges();
      const els = items(fixture);
      press(els[2], 'ArrowUp');
      fixture.detectChanges();

      expect(els[1].tabIndex).toBe(0);
      expect(els[2].tabIndex).toBe(-1);
    });

    it('focuses the previous element', () => {
      component.focusedIndex.set(1);
      fixture.detectChanges();
      const els = items(fixture);
      const spy = vi.spyOn(els[0], 'focus');
      press(els[1], 'ArrowUp');
      expect(spy).toHaveBeenCalled();
    });

    it('does not move before the first item', () => {
      const els = items(fixture);
      press(els[0], 'ArrowUp');
      fixture.detectChanges();

      expect(els[0].tabIndex).toBe(0);
    });
  });

  describe('other keys', () => {
    it('ignores non-arrow keys and leaves tabindex unchanged', () => {
      const els = items(fixture);
      press(els[0], 'Enter');
      press(els[0], 'Tab');
      press(els[0], ' ');
      fixture.detectChanges();

      expect(els[0].tabIndex).toBe(0);
    });
  });

  describe('focus event sync', () => {
    it('updates focusedIndex when an item receives focus directly', () => {
      const els = items(fixture);
      els[2].dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      expect(component.focusedIndex()).toBe(2);
    });
  });

  describe('empty state', () => {
    it('renders no list items when entries is empty', () => {
      fixture.componentRef.setInput('entries', []);
      fixture.detectChanges();
      const els = items(fixture);
      expect(els.length).toBe(0);
    });
  });
});
