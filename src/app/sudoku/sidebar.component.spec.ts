import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent – keyboard accessibility', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  function buttons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SidebarComponent] }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  it('every visible button has tabindex="0"', () => {
    buttons().forEach((btn) => {
      expect(btn.getAttribute('tabindex')).toBe('0');
    });
  });

  it('disabled buttons keep tabindex="0" — browser handles focusability via disabled attr', () => {
    fixture.componentRef.setInput('isBusy', true);
    fixture.detectChanges();

    buttons().forEach((btn) => {
      expect(btn.getAttribute('tabindex')).toBe('0');
      if (btn.disabled) {
        expect(btn.hasAttribute('disabled')).toBe(true);
      }
    });
  });

  it('confirm buttons have tabindex="0" when confirmation dialog is visible', async () => {
    // open confirmation
    const autoSolve = Array.from(buttons()).find((b) => b.textContent?.includes('Auto-Solve'));
    autoSolve!.click();
    fixture.detectChanges();

    const confirmBtns = Array.from(buttons()).filter(
      (b) => b.textContent?.includes('Solve it') || b.textContent?.includes('Cancel')
    );
    expect(confirmBtns.length).toBe(2);
    confirmBtns.forEach((btn) => {
      expect(btn.getAttribute('tabindex')).toBe('0');
    });
  });
});
