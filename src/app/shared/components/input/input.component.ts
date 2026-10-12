import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent, IconName } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

let nextId = 0;

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label [for]="id" class="text-sm font-medium text-espresso-800">
          {{ label() }}
          @if (required()) {
            <span class="text-accent-600">*</span>
          }
        </label>
      }
      <div class="relative">
        @if (icon()) {
          <app-icon [name]="icon()!" [size]="18"
                    class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-espresso-300" />
        }
        <input
          [id]="id"
          [type]="effectiveType()"
          [placeholder]="placeholder()"
          [attr.autocomplete]="autocomplete() || null"
          [disabled]="disabled"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [class]="inputClasses()"
        />
        @if (type() === 'password') {
          <button
            type="button"
            (click)="revealed.set(!revealed())"
            [attr.aria-label]="(revealed() ? 'common.hide_password' : 'common.show_password') | t"
            class="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-espresso-300 hover:text-espresso-700"
          >
            <app-icon [name]="revealed() ? 'eye-off' : 'eye'" [size]="18" />
          </button>
        }
      </div>
      @if (invalid() && errorMessage()) {
        <span class="text-xs font-medium text-red-600">{{ errorMessage() }}</span>
      } @else if (hint()) {
        <span class="text-xs text-espresso-400">{{ hint() }}</span>
      }
    </div>
  `
})
export class InputComponent implements ControlValueAccessor {

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly icon = input<IconName | null>(null);
  readonly hint = input<string>('');
  readonly autocomplete = input<string>('');
  readonly required = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errorMessage = input<string>('');

  readonly id = `app-input-${nextId++}`;

  protected readonly revealed = signal(false);
  protected value = '';
  protected disabled = false;

  protected readonly effectiveType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type());

  protected readonly inputClasses = computed(() => [
    'h-11 w-full rounded-xl border bg-surface text-sm text-espresso-900 placeholder:text-espresso-300 transition',
    'focus:outline-none focus:ring-4 disabled:bg-espresso-50 disabled:text-espresso-400',
    this.icon() ? 'pl-10' : 'pl-3.5',
    this.type() === 'password' ? 'pr-11' : 'pr-3.5',
    this.invalid()
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-line-strong focus:border-accent-500 focus:ring-accent-100'
  ].join(' '));

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
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
