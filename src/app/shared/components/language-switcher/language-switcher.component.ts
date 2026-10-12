import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/** Interface language picker; hidden while only one language is active. */
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  host: {
    class: 'relative inline-flex',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'open.set(false)'
  },
  styles: `
    .menu {
      animation: menu-in 180ms cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    .menu.up {
      transform-origin: bottom;
    }
    .menu.down {
      transform-origin: top;
    }
    @keyframes menu-in {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .menu { animation: none; }
    }
  `,
  template: `
    @if (i18n.languages().length > 1) {
      <button
        type="button"
        (click)="open.set(!open())"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="'common.language' | t"
        [title]="'common.language' | t"
        class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold uppercase transition active:scale-95"
        [class]="dark()
          ? 'text-espresso-300 hover:bg-espresso-800 hover:text-white'
          : 'border border-line bg-surface text-espresso-700 hover:border-line-strong hover:bg-canvas'"
      >
        <app-icon name="globe" [size]="16" [class.animate-spin]="i18n.switching()" />
        {{ current() }}
      </button>

      @if (open()) {
        <div
          role="menu"
          class="menu absolute z-50 min-w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop"
          [class]="placement() === 'up' ? 'up bottom-full mb-2' : 'down top-full mt-2'"
          [class.right-0]="align() === 'end'"
          [class.left-0]="align() === 'start'"
        >
          @for (language of i18n.languages(); track language.code) {
            <button
              type="button"
              role="menuitemradio"
              [attr.aria-checked]="language.code === i18n.language()"
              (click)="select(language.code)"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-canvas"
              [class.font-semibold]="language.code === i18n.language()"
              [class.text-accent-600]="language.code === i18n.language()"
              [class.text-espresso-700]="language.code !== i18n.language()"
            >
              <span class="w-6 text-xs font-semibold text-espresso-400 uppercase">{{ language.code }}</span>
              <span class="flex-1">{{ language.nativeName || language.name }}</span>
              @if (language.code === i18n.language()) {
                <app-icon name="check" [size]="16" />
              }
            </button>
          }
        </div>
      }
    }
  `
})
export class LanguageSwitcherComponent {

  protected readonly i18n = inject(I18nService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Light text for the dark sidebar and header. */
  readonly dark = input(false);
  readonly placement = input<'up' | 'down'>('down');
  readonly align = input<'start' | 'end'>('end');

  protected readonly open = signal(false);
  protected readonly current = computed(() => this.i18n.language());

  protected select(code: string): void {
    this.open.set(false);
    if (code !== this.i18n.language()) {
      this.i18n.use(code).subscribe({ error: () => undefined });
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
