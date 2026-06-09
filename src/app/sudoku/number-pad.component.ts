import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-number-pad',
  template: `
    <div class="number-pad" role="group" aria-label="Number input">
      @for (n of digits; track n) {
        <button
          class="number-pad__btn"
          type="button"
          [disabled]="isReadOnly()"
          (click)="valueEntered.emit(n)"
          [attr.aria-label]="'Enter ' + n"
        >{{ n }}</button>
      }
      <button
        class="number-pad__btn number-pad__btn--erase"
        type="button"
        [disabled]="isReadOnly()"
        (click)="valueEntered.emit(null)"
        aria-label="Erase cell"
      >Erase</button>
    </div>
  `,
})
export class NumberPadComponent {
  readonly isReadOnly = input(false);
  readonly valueEntered = output<number | null>();

  readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
}
