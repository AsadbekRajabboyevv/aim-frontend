import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-textarea',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label [for]="id" class="text-sm font-medium text-espresso-800">{{ label() }}</label>
      }
      <textarea
        [id]="id"
        [placeholder]="placeholder()"
        [rows]="rows()"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
        class="w-full resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-espresso-900
               placeholder:text-espresso-300 transition focus:border-accent-500 focus:ring-4 focus:ring-accent-100
               focus:outline-none disabled:bg-espresso-50"
      ></textarea>
    </div>
  `
})
export class TextareaComponent implements ControlValueAccessor {

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly rows = input<number>(4);

  readonly id = `app-textarea-${nextId++}`;

  protected value = '';
  protected disabled = false;

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onInput(event: Event): void {
    this.value = (event.target as HTMLTextAreaElement).value;
    this.onChange(this.value);
  }
}
