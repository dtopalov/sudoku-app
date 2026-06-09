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
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function pointerdown(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
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
      const els = items(fixture);
      component.focusItem(2);
      press(els[2], 'ArrowDown');

      expect(els[2].tabIndex).toBe(0);
    });
  });

  describe('ArrowUp', () => {
    it('moves tabindex 0 to the previous item', () => {
      const els = items(fixture);
      component.focusItem(2);
      press(els[2], 'ArrowUp');

      expect(els[1].tabIndex).toBe(0);
      expect(els[2].tabIndex).toBe(-1);
    });

    it('focuses the previous element', () => {
      const els = items(fixture);
      component.focusItem(1);
      const spy = vi.spyOn(els[0], 'focus');
      press(els[1], 'ArrowUp');
      expect(spy).toHaveBeenCalled();
    });

    it('does not move before the first item', () => {
      const els = items(fixture);
      press(els[0], 'ArrowUp');

      expect(els[0].tabIndex).toBe(0);
    });
  });

  describe('other keys', () => {
    it('ignores non-arrow keys and leaves tabindex unchanged', () => {
      const els = items(fixture);
      press(els[0], 'Enter');
      press(els[0], 'Tab');
      press(els[0], ' ');

      expect(els[0].tabIndex).toBe(0);
    });
  });

  describe('pointerdown', () => {
    it('moves tabindex 0 to the clicked item', () => {
      const els = items(fixture);
      pointerdown(els[2]);

      expect(els[0].tabIndex).toBe(-1);
      expect(els[2].tabIndex).toBe(0);
    });

    it('focuses the clicked item', () => {
      const els = items(fixture);
      const spy = vi.spyOn(els[1], 'focus');
      pointerdown(els[1]);
      expect(spy).toHaveBeenCalled();
    });

    it('works when clicking a child element inside the item', () => {
      const els = items(fixture);
      const span = els[2].querySelector<HTMLElement>('.leaderboard__user')!;
      span.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(els[2].tabIndex).toBe(0);
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
