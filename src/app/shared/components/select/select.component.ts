import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DropdownDto } from '../../../core/models/dropdown.model';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label [for]="id" class="text-sm font-medium text-espresso-800">{{ label() }}</label>
      }
      <div class="relative">
        <select
          [id]="id"
          [disabled]="disabled"
          [value]="value"
          (change)="onSelectChange($event)"
          (blur)="onTouched()"
          class="h-11 w-full appearance-none rounded-xl border border-line-strong bg-surface pr-10 pl-3.5 text-sm
                 text-espresso-900 transition focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none
                 disabled:bg-espresso-50"
        >
          @if (placeholder()) {
            <option value="" [selected]="!value">{{ placeholder() }}</option>
          }
          @for (option of options(); track option.value) {
            <option [value]="option.value" [selected]="option.value === value">{{ option.label }}</option>
          }
        </select>
        <app-icon name="chevron-right" [size]="16"
                  class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 rotate-90 text-espresso-400" />
      </div>
      @if (hint()) {
        <span class="text-xs text-espresso-400">{{ hint() }}</span>
      }
    </div>
  `
})
export class SelectComponent implements ControlValueAccessor {

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly options = input<DropdownDto[]>([]);

  readonly id = `app-select-${nextId++}`;

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

  protected onSelectChange(event: Event): void {
    this.value = (event.target as HTMLSelectElement).value;
    this.onChange(this.value);
  }
}
