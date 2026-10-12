import { Component, forwardRef, input, model } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-toggle',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true
    }
  ],
  template: `
    <label [for]="id" class="flex cursor-pointer items-center justify-between gap-4" [class.cursor-not-allowed]="disabled">
      @if (label() || hint()) {
        <span class="min-w-0">
          <span class="block text-sm font-medium text-espresso-800">{{ label() }}</span>
          @if (hint()) {
            <span class="block text-xs text-espresso-400">{{ hint() }}</span>
          }
        </span>
      }
      <input
        [id]="id"
        type="checkbox"
        class="peer sr-only"
        [checked]="checked()"
        [disabled]="disabled"
        [attr.aria-label]="ariaLabel() || null"
        (change)="onChange($event)"
        (blur)="onTouched()"
      />
      <span class="relative h-6 w-11 shrink-0 rounded-full bg-espresso-100 transition peer-checked:bg-accent-500
                   peer-focus-visible:ring-4 peer-focus-visible:ring-accent-100 peer-disabled:opacity-50
                   after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface
                   after:shadow after:transition peer-checked:after:translate-x-5"></span>
    </label>
  `
})
export class ToggleComponent implements ControlValueAccessor {

  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly checked = model<boolean>(false);

  readonly id = `app-toggle-${nextId++}`;

  protected disabled = false;

  private onChangeFn: (value: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onChange(event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
    this.onChangeFn(value);
  }
}
