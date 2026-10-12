import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, IconComponent, TranslatePipe],
  template: `
    <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div class="min-w-0">
        @if (backLink()) {
          <a [routerLink]="backLink()"
             class="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-espresso-400 hover:text-accent-600">
            <app-icon name="arrow-left" [size]="16" />
            {{ backLabel() || ('common.back' | t) }}
          </a>
        }
        <h1 class="text-2xl font-bold tracking-tight text-espresso-900 md:text-3xl">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-espresso-400 md:text-base">{{ subtitle() }}</p>
        }
        <ng-content select="[meta]"></ng-content>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class PageHeaderComponent {

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly backLink = input<string | null>(null);
  /** Defaults to the common "Back" text. */
  readonly backLabel = input<string>('');
}
