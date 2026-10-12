import { Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-white shadow-sm hover:bg-accent-600 focus-visible:ring-accent-200',
  secondary: 'border border-line-strong bg-surface text-espresso-800 hover:bg-espresso-50 focus-visible:ring-espresso-100',
  danger: 'border border-red-200 bg-surface text-red-600 hover:bg-red-50 focus-visible:ring-red-100',
  ghost: 'text-espresso-500 hover:bg-espresso-50 hover:text-espresso-900 focus-visible:ring-espresso-100'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base'
};

const ICON_ONLY_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
};

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [IconComponent],
  host: { '[class.w-full]': 'block()', '[class.inline-flex]': '!block()', '[class.flex]': 'block()' },
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.title]="ariaLabel() || null"
      (click)="clicked.emit($event)"
      [class]="classes()"
    >
      @if (loading()) {
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      } @else if (icon()) {
        <app-icon [name]="icon()!" [size]="size() === 'lg' ? 20 : 18" />
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {

  readonly type = input<'button' | 'submit'>('button');
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly icon = input<IconName | null>(null);
  readonly iconOnly = input<boolean>(false);
  readonly ariaLabel = input<string>('');
  readonly block = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);

  readonly clicked = output<MouseEvent>();

  protected readonly classes = computed(() => [
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition',
    'focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[this.variant()],
    this.iconOnly() ? ICON_ONLY_SIZE[this.size()] : SIZE_CLASSES[this.size()],
    this.block() ? 'w-full' : ''
  ].join(' '));
}
