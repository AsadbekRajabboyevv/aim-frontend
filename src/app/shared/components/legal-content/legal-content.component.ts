import { Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LegalBlock } from '../../../core/utils/legal-markdown.util';

/** Renders parsed legal Markdown; shared by the public pages and the editor preview. */
@Component({
  selector: 'app-legal-content',
  standalone: true,
  imports: [NgTemplateOutlet],
  host: { class: 'block' },
  template: `
    <ng-template #inline let-segments>
      @for (segment of segments; track $index) {
        @if (segment.bold) {
          <strong class="font-semibold text-espresso-900">{{ segment.text }}</strong>
        } @else {
          {{ segment.text }}
        }
      }
    </ng-template>

    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('h2') {
          <h2 [id]="block.id" class="mt-12 mb-4 flex scroll-mt-24 items-baseline gap-3 font-display font-semibold text-espresso-950 first:mt-0"
              [class]="compact() ? 'text-xl' : 'text-2xl'">
            <span class="font-mono text-sm font-normal text-accent-600 tabular-nums">{{ block.number.toString().padStart(2, '0') }}</span>
            <span><ng-container *ngTemplateOutlet="inline; context: { $implicit: block.segments }" /></span>
          </h2>
        }
        @case ('h3') {
          <h3 class="mt-6 mb-2 font-semibold text-espresso-900">
            <ng-container *ngTemplateOutlet="inline; context: { $implicit: block.segments }" />
          </h3>
        }
        @case ('p') {
          <p class="my-4 leading-[1.75] text-espresso-700">
            <ng-container *ngTemplateOutlet="inline; context: { $implicit: block.segments }" />
          </p>
        }
        @case ('ul') {
          <ul class="my-4 flex flex-col gap-2 pl-5 leading-[1.7] text-espresso-700 marker:text-accent-500 list-disc">
            @for (item of block.items; track $index) {
              <li class="pl-1"><ng-container *ngTemplateOutlet="inline; context: { $implicit: item }" /></li>
            }
          </ul>
        }
        @case ('ol') {
          <ol class="my-4 flex flex-col gap-2 pl-5 leading-[1.7] text-espresso-700 marker:text-espresso-400 list-decimal">
            @for (item of block.items; track $index) {
              <li class="pl-1"><ng-container *ngTemplateOutlet="inline; context: { $implicit: item }" /></li>
            }
          </ol>
        }
      }
    }
  `
})
export class LegalContentComponent {

  readonly blocks = input.required<LegalBlock[]>();
  /** Smaller headings for the editor preview. */
  readonly compact = input(false);
}
