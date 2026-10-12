import { Component, DOCUMENT, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LegalDocumentDto, LegalSlug } from '../../core/models/legal.model';
import { I18nService } from '../../core/services/i18n.service';
import { LegalService } from '../../core/services/legal.service';
import { parseLegalMarkdown } from '../../core/utils/legal-markdown.util';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LegalContentComponent } from '../../shared/components/legal-content/legal-content.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const DEFAULT_TITLE = 'AIM';

/** Public Terms of use / Privacy policy page; the text is edited by the super admin. */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent, LanguageSwitcherComponent, ThemeToggleComponent, LegalContentComponent, TranslatePipe],
  host: { class: 'block min-h-screen bg-canvas' },
  template: `
    <header class="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a routerLink="/" class="shrink-0" aria-label="AIM"><app-logo [size]="30" /></a>
        <div class="ml-auto flex items-center gap-2">
          <app-theme-toggle />
          <app-language-switcher />
          <a routerLink="/" class="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-espresso-700 hover:bg-surface hover:text-espresso-900">
            <app-icon name="arrow-left" [size]="16" />
            <span class="hidden sm:inline">{{ 'legal.back_home' | t }}</span>
          </a>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pt-12 pb-24 sm:px-6 lg:pt-16">
      @if (document(); as doc) {
        <div class="max-w-3xl">
          <p class="flex items-center gap-3 text-sm font-medium text-espresso-500">
            <span class="h-px w-8 bg-accent-500"></span>
            {{ 'legal.eyebrow' | t }}
          </p>
          <h1 class="mt-5 font-display text-4xl leading-tight font-semibold tracking-tight text-espresso-950 sm:text-5xl">{{ doc.title }}</h1>
          @if (doc.updatedAt) {
            <p class="mt-4 text-sm text-espresso-400">{{ 'legal.updated' | t: { date: formatDate(doc.updatedAt) } }}</p>
          }
        </div>

        <div class="mt-12 grid gap-10 border-t border-espresso-900 pt-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
          @if (sections().length > 1) {
            <nav class="lg:sticky lg:top-24 lg:self-start" [attr.aria-label]="'legal.contents' | t">
              <p class="text-xs font-semibold tracking-wide text-espresso-400 uppercase">{{ 'legal.contents' | t }}</p>
              <ol class="mt-4 flex flex-col gap-2.5 text-sm">
                @for (section of sections(); track section.id) {
                  <li>
                    <a [href]="'#' + section.id" (click)="scrollTo($event, section.id)"
                       class="flex gap-2.5 text-espresso-500 hover:text-espresso-900">
                      <span class="font-mono text-xs text-espresso-300 tabular-nums">{{ section.number.toString().padStart(2, '0') }}</span>
                      <span>{{ section.text }}</span>
                    </a>
                  </li>
                }
              </ol>
            </nav>
          } @else {
            <div class="hidden lg:block"></div>
          }

          <article class="max-w-[68ch] text-[15.5px]">
            <app-legal-content [blocks]="blocks()" />

            <div class="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
              <a [routerLink]="'/' + other()" class="group inline-flex items-center gap-2 font-medium text-espresso-900">
                {{ (other() === 'privacy' ? 'legal.read_privacy' : 'legal.read_terms') | t }}
                <app-icon name="chevron-right" [size]="18" class="transition group-hover:translate-x-0.5" />
              </a>
              <a routerLink="/" class="text-sm text-espresso-400 hover:text-espresso-700">{{ 'legal.back_home' | t }}</a>
            </div>
          </article>
        </div>
      } @else if (failed()) {
        <div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <app-icon name="alert" [size]="40" class="text-accent-500" />
          <p class="font-display text-2xl text-espresso-900">{{ 'legal.load_error' | t }}</p>
          <a routerLink="/" class="text-sm font-medium text-accent-600 hover:text-accent-700">{{ 'legal.back_home' | t }}</a>
        </div>
      } @else {
        <div class="max-w-3xl animate-pulse">
          <div class="h-4 w-40 rounded bg-espresso-100"></div>
          <div class="mt-6 h-12 w-3/4 rounded bg-espresso-100"></div>
          <div class="mt-12 flex flex-col gap-3">
            @for (line of [1, 2, 3, 4, 5, 6]; track line) {
              <div class="h-4 rounded bg-espresso-100" [style.width.%]="100 - line * 6"></div>
            }
          </div>
        </div>
      }
    </main>

    <footer class="border-t border-line">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-espresso-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>© {{ year }} AIM</span>
        <div class="flex gap-6">
          <a routerLink="/terms" class="hover:text-espresso-900" [class.text-espresso-900]="slug === 'terms'">{{ 'legal.terms' | t }}</a>
          <a routerLink="/privacy" class="hover:text-espresso-900" [class.text-espresso-900]="slug === 'privacy'">{{ 'legal.privacy' | t }}</a>
        </div>
      </div>
    </footer>
  `
})
export class LegalPageComponent implements OnDestroy {

  private readonly legalService = inject(LegalService);
  private readonly i18n = inject(I18nService);
  private readonly dom = inject(DOCUMENT);

  protected readonly slug = inject(ActivatedRoute).snapshot.data['slug'] as LegalSlug;
  protected readonly year = new Date().getFullYear();

  protected readonly document = signal<LegalDocumentDto | null>(null);
  protected readonly failed = signal(false);
  protected readonly blocks = computed(() => parseLegalMarkdown(this.document()?.content ?? ''));
  protected readonly sections = computed(() => this.blocks().flatMap((block) => block.kind === 'h2' ? [block] : []));
  protected readonly other = computed<LegalSlug>(() => this.slug === 'terms' ? 'privacy' : 'terms');

  constructor() {
    // Reloads when the visitor switches the language.
    effect(() => {
      this.i18n.language();
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.dom.title = DEFAULT_TITLE;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru-RU');
  }

  protected scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.dom.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private load(): void {
    this.failed.set(false);
    this.legalService.getPublic(this.slug).subscribe({
      next: (response) => {
        this.document.set(response.data ?? null);
        this.failed.set(!response.data);
        if (response.data?.title) {
          this.dom.title = `${response.data.title} — AIM`;
        }
      },
      error: () => {
        this.document.set(null);
        this.failed.set(true);
      }
    });
  }
}
