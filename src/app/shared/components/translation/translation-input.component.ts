import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { Translations } from '../../../core/utils/translation.util';

let nextId = 0;

@Component({
  selector: 'app-translation-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TranslationInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5">
      <label [for]="id" class="text-sm font-medium text-espresso-800">
        {{ label() }} ({{ language()?.nativeName }})
        @if (required()) {
          <span class="text-accent-600">*</span>
        }
      </label>
      @if (multiline()) {
        <textarea
          [id]="id"
          [rows]="rows()"
          [placeholder]="placeholder()"
          [disabled]="disabled"
          [value]="text()"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [class]="fieldClasses()"
        ></textarea>
      } @else {
        <input
          [id]="id"
          type="text"
          [placeholder]="placeholder()"
          [disabled]="disabled"
          [value]="text()"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [class]="fieldClasses()"
        />
      }
      @if (invalid() && errorMessage()) {
        <span class="text-xs font-medium text-red-600">{{ errorMessage() }}</span>
      }
    </div>
  `
})
export class TranslationInputComponent implements ControlValueAccessor {

  readonly language = input.required<LanguageResponseDto | undefined>();
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');
  readonly multiline = input<boolean>(false);
  readonly rows = input<number>(3);
  readonly required = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errorMessage = input<string>('');

  readonly id = `app-translation-${nextId++}`;

  protected disabled = false;
  private readonly value = signal<Translations>({});

  protected readonly text = computed(() => this.value()[this.language()?.code ?? ''] ?? '');

  protected readonly fieldClasses = computed(() => [
    'w-full rounded-xl border bg-surface px-3.5 text-sm text-espresso-900 placeholder:text-espresso-300 transition',
    'focus:outline-none focus:ring-4 disabled:bg-espresso-50',
    this.multiline() ? 'resize-y py-2.5' : 'h-11',
    this.invalid()
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-line-strong focus:border-accent-500 focus:ring-accent-100'
  ].join(' '));

  private onChange: (value: Translations) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: Translations | null): void {
    this.value.set({ ...(value ?? {}) });
  }

  registerOnChange(fn: (value: Translations) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onInput(event: Event): void {
    const code = this.language()?.code;
    if (!code) {
      return;
    }
    const next = { ...this.value(), [code]: (event.target as HTMLInputElement | HTMLTextAreaElement).value };
    this.value.set(next);
    this.onChange(next);
  }
}
