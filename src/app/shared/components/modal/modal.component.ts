import { Component, HostListener, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div class="palette-light absolute inset-0 bg-espresso-950/50 backdrop-blur-sm" (click)="closed.emit()"></div>
      <div [class]="panelClasses()">
        <header class="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 class="text-lg font-semibold text-espresso-900">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="mt-0.5 text-sm text-espresso-400">{{ subtitle() }}</p>
            }
          </div>
          <button type="button" (click)="closed.emit()" [attr.aria-label]="'common.close' | t"
                  class="rounded-lg p-1.5 text-espresso-300 transition hover:bg-espresso-50 hover:text-espresso-700">
            <app-icon name="x" [size]="20" />
          </button>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <ng-content></ng-content>
        </div>
        <footer class="flex justify-end gap-3 border-t border-line bg-canvas/60 px-6 py-4">
          <ng-content select="[footer]"></ng-content>
        </footer>
      </div>
    </div>
  `
})
export class ModalComponent {

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly size = input<'md' | 'lg'>('md');

  readonly closed = output<void>();

  protected readonly panelClasses = computed(() => [
    'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-pop sm:rounded-3xl',
    this.size() === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg'
  ].join(' '));

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }
}
