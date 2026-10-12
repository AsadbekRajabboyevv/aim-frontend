import { Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

export type StatTone = 'accent' | 'success' | 'neutral' | 'danger';

const TONE_CLASSES: Record<StatTone, string> = {
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-emerald-50 text-emerald-600',
  neutral: 'bg-espresso-50 text-espresso-500',
  danger: 'bg-red-50 text-red-500'
};

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <span [class]="iconClasses()">
        <app-icon [name]="icon()" [size]="24" />
      </span>
      <div>
        <p class="text-sm text-espresso-400">{{ label() }}</p>
        <p class="text-2xl font-bold tabular-nums text-espresso-900">
          @if (value() === null) {
            <span class="inline-block h-7 w-10 animate-pulse rounded bg-espresso-50 align-middle"></span>
          } @else {
            {{ value() }}
          }
        </p>
      </div>
    </div>
  `
})
export class StatCardComponent {

  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly icon = input.required<IconName>();
  readonly tone = input<StatTone>('accent');

  protected readonly iconClasses = computed(() =>
    `flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[this.tone()]}`);
}
