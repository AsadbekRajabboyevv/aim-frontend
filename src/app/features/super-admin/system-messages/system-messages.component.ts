import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { SystemMessageResponseDto } from '../../../core/models/system-message.model';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { SystemMessageService } from '../../../core/services/system-message.service';
import { translate } from '../../../core/utils/menu-format.util';
import { defaultLanguageCode } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SystemMessageFormComponent } from './system-message-form.component';

const PAGE_SIZE = 25;

/** Code prefixes the list can be narrowed to. */
// i18n: system_messages.group.ui, system_messages.group.menu, system_messages.group.error, system_messages.group.validation
const GROUPS = ['ui.', 'menu.ui.', 'error.', 'validation.'] as const;
const GROUP_KEYS: Record<(typeof GROUPS)[number], string> = {
  'ui.': 'system_messages.group.ui',
  'menu.ui.': 'system_messages.group.menu',
  'error.': 'system_messages.group.error',
  'validation.': 'system_messages.group.validation'
};

@Component({
  selector: 'app-system-messages',
  standalone: true,
  imports: [ButtonComponent, IconComponent, PageHeaderComponent, SystemMessageFormComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.system_messages' | t" [subtitle]="'system_messages.subtitle' | t">
      <app-button icon="plus" [disabled]="languages().length === 0" (clicked)="open(null)">{{ 'system_messages.new' | t }}</app-button>
    </app-page-header>

    <div class="mb-6 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card xl:flex-row xl:items-center">
      <div class="relative w-full xl:w-72 xl:shrink-0">
        <app-icon name="search" [size]="18" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-espresso-300" />
        <input type="search" [placeholder]="'system_messages.search_placeholder' | t" (input)="search$.next($any($event.target).value)"
               class="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3.5 pl-10 text-sm placeholder:text-espresso-300
                      focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
      </div>
      <div class="flex flex-wrap gap-1 rounded-xl bg-espresso-50 p-1" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="group() === ''" (click)="setGroup('')"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                [class]="group() === '' ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400 hover:text-espresso-700'">
          {{ 'system_messages.group.all' | t }}
        </button>
        @for (prefix of groups; track prefix) {
          <button type="button" role="tab" [attr.aria-selected]="group() === prefix" (click)="setGroup(prefix)"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                  [class]="group() === prefix ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400 hover:text-espresso-700'">
            {{ groupKeys[prefix] | t }}
          </button>
        }
      </div>
      <label class="flex items-center gap-2 text-sm text-espresso-500">
        <span class="whitespace-nowrap">{{ 'system_messages.missing_filter' | t }}</span>
        <select (change)="setMissing($any($event.target).value)"
                class="h-11 rounded-xl border border-line-strong bg-surface px-3 text-sm text-espresso-900
                       focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none">
          <option value="" [selected]="!missingLanguage()">{{ 'system_messages.missing_any' | t }}</option>
          @for (language of languages(); track language.code) {
            <option [value]="language.code" [selected]="missingLanguage() === language.code">
              {{ language.code.toUpperCase() }} — {{ language.nativeName }}{{ language.isActive ? '' : ' (' + ('common.status.inactive' | t) + ')' }}
            </option>
          }
        </select>
      </label>
    </div>

    @if (errorMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t"><app-icon name="x" [size]="16" /></button>
      </div>
    }

    <div class="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      @for (message of messages(); track message.code) {
        <div class="flex flex-col gap-3 border-b border-line p-5 last:border-b-0 md:flex-row md:items-center">
          <div class="min-w-0 flex-1">
            <p class="font-mono text-xs text-espresso-400">{{ message.code }}</p>
            <p class="mt-1 text-espresso-900">{{ preview(message) }}</p>
            @if (missing(message).length) {
              <p class="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                <app-icon name="alert" [size]="13" />
                {{ 'system_messages.missing' | t }}: {{ missing(message).join(', ') }}
              </p>
            }
          </div>
          <div class="flex gap-2">
            <app-button variant="secondary" size="sm" icon="pencil" [iconOnly]="true" [ariaLabel]="'common.edit' | t" (clicked)="open(message)" />
            <app-button variant="danger" size="sm" icon="trash" [iconOnly]="true" [ariaLabel]="'common.delete' | t" (clicked)="remove(message)" />
          </div>
        </div>
      } @empty {
        <div class="px-5 py-14 text-center text-sm text-espresso-400">{{ (loading() ? 'common.loading' : 'system_messages.empty') | t }}</div>
      }

      <div class="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-espresso-500">
        <span>{{ 'common.total' | t }}: <span class="font-semibold text-espresso-800">{{ total() }}</span></span>
        <div class="flex items-center gap-3">
          <app-button variant="secondary" size="sm" icon="chevron-left" [iconOnly]="true" [ariaLabel]="'common.prev_page' | t"
                      [disabled]="page() === 0" (clicked)="goTo(page() - 1)" />
          <span class="tabular-nums">{{ page() + 1 }} / {{ totalPages() || 1 }}</span>
          <app-button variant="secondary" size="sm" icon="chevron-right" [iconOnly]="true" [ariaLabel]="'common.next_page' | t"
                      [disabled]="page() + 1 >= totalPages()" (clicked)="goTo(page() + 1)" />
        </div>
      </div>
    </div>

    @if (formOpen()) {
      <app-system-message-form [message]="editing()" [languages]="languages()" (saved)="onSaved()" (cancelled)="formOpen.set(false)" />
    }
  `
})
export class SystemMessagesComponent implements OnInit {

  private readonly systemMessageService = inject(SystemMessageService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly search$ = new Subject<string>();
  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly messages = signal<SystemMessageResponseDto[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<SystemMessageResponseDto | null>(null);
  private readonly search = signal('');
  protected readonly groups = GROUPS;
  protected readonly groupKeys = GROUP_KEYS;
  protected readonly group = signal<string>('');
  protected readonly missingLanguage = signal('');

  private readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));

  ngOnInit(): void {
    // Inactive languages too: a new language is translated here before it is switched on.
    this.languageService.getAll().subscribe({
      next: (response) => this.languages.set(response.data?.content ?? []),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.load_languages'))
    });
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((search) => {
      this.search.set(search.trim());
      this.goTo(0);
    });
    this.goTo(0);
  }

  protected preview(message: SystemMessageResponseDto): string {
    return translate(message.translations, this.i18n.language(), this.defaultLanguage());
  }

  protected missing(message: SystemMessageResponseDto): string[] {
    return this.languages()
      .filter((language) => !message.translations[language.code]?.trim())
      .map((language) => language.code.toUpperCase());
  }

  protected setGroup(prefix: string): void {
    this.group.set(prefix);
    this.goTo(0);
  }

  protected setMissing(code: string): void {
    this.missingLanguage.set(code);
    this.goTo(0);
  }

  protected open(message: SystemMessageResponseDto | null): void {
    this.editing.set(message);
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    this.goTo(this.page());
    this.i18n.refresh();
  }

  protected remove(message: SystemMessageResponseDto): void {
    if (!confirm(this.i18n.t('system_messages.confirm_delete', { code: message.code }))) {
      return;
    }
    this.systemMessageService.delete(message.code).subscribe({
      next: () => this.goTo(this.page()),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  protected goTo(page: number): void {
    this.loading.set(true);
    const filter = {
      search: this.search() || undefined,
      prefix: this.group() || undefined,
      missingLanguage: this.missingLanguage() || undefined
    };
    this.systemMessageService.get(filter, { page, size: PAGE_SIZE, sort: 'code' }).subscribe({
      next: (response) => {
        const data = response.data;
        this.messages.set(data?.content ?? []);
        this.page.set(data?.page ?? page);
        this.totalPages.set(data?.totalPages ?? 0);
        this.total.set(data?.totalElements ?? 0);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('system_messages.error.load'));
      }
    });
  }
}
