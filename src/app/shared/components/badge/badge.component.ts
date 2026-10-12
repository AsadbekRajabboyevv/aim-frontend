import { Component, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'accent';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  neutral: 'bg-espresso-50 text-espresso-500 ring-line-strong',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200'
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  neutral: 'bg-espresso-300',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  accent: 'bg-accent-500'
};

@Component({
  selector: 'app-badge',
  standalone: true,
  host: { class: 'inline-flex' },
  template: `
    <span [class]="classes()">
      <span class="h-1.5 w-1.5 rounded-full" [class]="dotClass()"></span>
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {

  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(() =>
    `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[this.tone()]}`);

  protected readonly dotClass = computed(() => DOT_CLASSES[this.tone()]);
}
