import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { NumberPadComponent } from './number-pad.component';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDigitBtn(fixture: ComponentFixture<NumberPadComponent>, digit: number): HTMLButtonElement {
  const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button');
  return Array.from(buttons).find((b) => b.textContent?.trim() === String(digit))!;
}

function getEraseBtn(fixture: ComponentFixture<NumberPadComponent>): HTMLButtonElement {
  const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button');
  return Array.from(buttons).find((b) => b.textContent?.trim() === 'Erase')!;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('NumberPadComponent', () => {
  let fixture: ComponentFixture<NumberPadComponent>;
  let component: NumberPadComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberPadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NumberPadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── 1. Structure ─────────────────────────────────────────────────────────

  describe('Structure', () => {
    it('renders 10 buttons (9 digits + erase)', () => {
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
      expect(buttons.length).toBe(10);
    });

    it('renders buttons for digits 1 through 9', () => {
      for (let d = 1; d <= 9; d++) {
        expect(getDigitBtn(fixture, d)).toBeTruthy();
      }
    });

    it('renders an Erase button', () => {
      expect(getEraseBtn(fixture)).toBeTruthy();
    });

    it('digit buttons have aria-label "Enter N"', () => {
      for (let d = 1; d <= 9; d++) {
        const btn = getDigitBtn(fixture, d);
        expect(btn.getAttribute('aria-label')).toBe(`Enter ${d}`);
      }
    });

    it('erase button has aria-label "Erase cell"', () => {
      expect(getEraseBtn(fixture).getAttribute('aria-label')).toBe('Erase cell');
    });
  });

  // ── 2. Digit emission ─────────────────────────────────────────────────────

  describe('Digit emission', () => {
    it('clicking each digit button emits the corresponding number', () => {
      const emitted: (number | null)[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));

      for (let d = 1; d <= 9; d++) {
        getDigitBtn(fixture, d).click();
      }

      expect(emitted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('clicking the Erase button emits null', () => {
      const emitted: (number | null)[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));

      getEraseBtn(fixture).click();

      expect(emitted).toEqual([null]);
    });
  });

  // ── 3. Read-only mode ─────────────────────────────────────────────────────

  describe('Read-only mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isReadOnly', true);
      fixture.detectChanges();
    });

    it('all buttons are disabled when isReadOnly is true', () => {
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button');
      for (const btn of Array.from(buttons)) {
        expect(btn.disabled).toBe(true);
      }
    });

    it('clicking a disabled digit button does not emit', () => {
      const emitted: unknown[] = [];
      component.valueEntered.subscribe((v) => emitted.push(v));

      getDigitBtn(fixture, 5).click();
      getEraseBtn(fixture).click();

      expect(emitted).toHaveLength(0);
    });
  });

  // ── 4. Default (writable) mode ────────────────────────────────────────────

  describe('Default (writable) mode', () => {
    it('buttons are enabled when isReadOnly is false (default)', () => {
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button');
      for (const btn of Array.from(buttons)) {
        expect(btn.disabled).toBe(false);
      }
    });
  });
});
