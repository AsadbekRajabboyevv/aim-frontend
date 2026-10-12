import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { LegalDocumentAdminDto, LegalSlug } from '../../../core/models/legal.model';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { LegalService } from '../../../core/services/legal.service';
import { parseLegalMarkdown } from '../../../core/utils/legal-markdown.util';
import { defaultLanguageCode } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LegalContentComponent } from '../../../shared/components/legal-content/legal-content.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface Draft {
  title: Record<string, string>;
  content: Record<string, string>;
}

const SLUGS: LegalSlug[] = ['terms', 'privacy'];

/** Super admin editor for the Terms of use and the Privacy policy, per language with a live preview. */
@Component({
  selector: 'app-legal-editor',
  standalone: true,
  imports: [PageHeaderComponent, ButtonComponent, IconComponent, LanguageTabsComponent, LegalContentComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.legal' | t" [subtitle]="'legal_admin.subtitle' | t">
      <a [href]="'/' + slug()" target="_blank" rel="noopener"
         class="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-espresso-800 transition hover:bg-espresso-50">
        <app-icon name="external" [size]="18" />
        {{ 'legal_admin.open_page' | t }}
      </a>
      <app-button icon="check" [loading]="saving()" [disabled]="!current() || !dirty()" (clicked)="save()">{{ 'common.save' | t }}</app-button>
    </app-page-header>

    @if (message(); as notice) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
           [class]="notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'">
        <app-icon [name]="notice.ok ? 'check' : 'alert'" [size]="18" class="mt-px" />
        <span class="flex-1">{{ notice.text }}</span>
        <button type="button" (click)="message.set(null)" [attr.aria-label]="'common.close' | t" class="opacity-60 hover:opacity-100">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div class="inline-flex rounded-xl border border-line-strong bg-surface p-1" role="tablist">
        @for (item of slugs; track item) {
          <button type="button" role="tab" [attr.aria-selected]="slug() === item" (click)="selectSlug(item)"
                  class="relative h-9 rounded-lg px-4 text-sm font-medium transition"
                  [class]="slug() === item ? 'bg-espresso-900 text-espresso-50' : 'text-espresso-500 hover:text-espresso-900'">
            {{ 'legal.' + item | t }}
            @if (isDirty(item)) {
              <span class="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent-500"></span>
            }
          </button>
        }
      </div>
      @if (current(); as doc) {
        @if (doc.updatedAt) {
          <p class="text-sm text-espresso-400">
            {{ 'legal_admin.last_change' | t: { date: formatDate(doc.updatedAt) } }}
            @if (doc.updatedBy) { · {{ doc.updatedBy }} }
          </p>
        }
      }
    </div>

    @if (current() && languages().length) {
      <section class="rounded-card border border-line bg-surface shadow-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div class="flex flex-wrap items-center gap-3">
            <app-language-tabs [languages]="languages()" [(active)]="language" [invalidCodes]="emptyCodes()" />
            <span class="text-xs text-espresso-400">{{ 'legal_admin.filled' | t: { filled: filledCount(), total: languages().length } }}</span>
          </div>
          <div class="inline-flex rounded-lg bg-espresso-50 p-0.5 text-xs font-medium xl:hidden">
            <button type="button" (click)="preview.set(false)" class="rounded-md px-3 py-1.5"
                    [class]="!preview() ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400'">{{ 'legal_admin.edit' | t }}</button>
            <button type="button" (click)="preview.set(true)" class="rounded-md px-3 py-1.5"
                    [class]="preview() ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400'">{{ 'legal_admin.preview' | t }}</button>
          </div>
        </div>

        <div class="grid xl:grid-cols-2">
          <div class="flex flex-col gap-4 p-5 xl:flex xl:border-r xl:border-line" [class.hidden]="preview()">
            <label class="flex flex-col gap-1.5">
              <span class="text-sm font-medium text-espresso-800">{{ 'legal_admin.title' | t }}</span>
              <input type="text" [value]="draftTitle()" (input)="setText('title', $any($event.target).value)"
                     class="h-11 rounded-xl border border-line-strong bg-surface px-3 text-espresso-900 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
            </label>
            <label class="flex flex-1 flex-col gap-1.5">
              <span class="text-sm font-medium text-espresso-800">{{ 'legal_admin.content' | t }}</span>
              <textarea [value]="draftContent()" (input)="setText('content', $any($event.target).value)" spellcheck="false"
                        class="min-h-[60vh] flex-1 resize-y rounded-xl border border-line-strong bg-canvas/50 p-4 font-mono text-[13px] leading-relaxed text-espresso-900 focus:border-accent-500 focus:bg-surface focus:ring-4 focus:ring-accent-100 focus:outline-none"></textarea>
            </label>
            <div class="rounded-xl bg-espresso-50 px-4 py-3 text-xs leading-relaxed text-espresso-500">
              <p class="font-semibold text-espresso-700">{{ 'legal_admin.syntax_title' | t }}</p>
              <p class="mt-1 font-mono">## {{ 'legal_admin.syntax_heading' | t }} · ### {{ 'legal_admin.syntax_subheading' | t }} · - {{ 'legal_admin.syntax_list' | t }} · 1. {{ 'legal_admin.syntax_numbered' | t }} · **{{ 'legal_admin.syntax_bold' | t }}**</p>
              <p class="mt-1">{{ 'legal_admin.syntax_hint' | t }}</p>
            </div>
          </div>

          <div class="min-w-0 bg-canvas/40 p-6 sm:p-8 xl:block" [class.hidden]="!preview()">
            <p class="text-xs font-semibold tracking-wide text-espresso-400 uppercase">{{ 'legal_admin.preview' | t }}</p>
            @if (draftTitle() || draftContent()) {
              <h1 class="mt-4 mb-8 font-display text-3xl font-semibold text-espresso-950">{{ draftTitle() }}</h1>
              <div class="text-[15px]"><app-legal-content [blocks]="previewBlocks()" [compact]="true" /></div>
            } @else {
              <p class="mt-10 text-center text-sm text-espresso-400">{{ 'legal_admin.empty_language' | t }}</p>
            }
          </div>
        </div>
      </section>
    } @else if (!message()) {
      <div class="h-96 animate-pulse rounded-card bg-surface"></div>
    }
  `
})
export class LegalEditorComponent implements OnInit {

  private readonly legalService = inject(LegalService);
  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  protected readonly slugs = SLUGS;
  protected readonly slug = signal<LegalSlug>('terms');
  protected readonly language = signal('');
  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly preview = signal(false);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  private readonly documents = signal<Partial<Record<LegalSlug, LegalDocumentAdminDto>>>({});
  private readonly drafts = signal<Partial<Record<LegalSlug, Draft>>>({});

  protected readonly current = computed(() => this.documents()[this.slug()] ?? null);
  private readonly draft = computed(() => this.drafts()[this.slug()] ?? null);
  protected readonly draftTitle = computed(() => this.draft()?.title[this.language()] ?? '');
  protected readonly draftContent = computed(() => this.draft()?.content[this.language()] ?? '');
  protected readonly previewBlocks = computed(() => parseLegalMarkdown(this.draftContent()));
  protected readonly dirty = computed(() => this.isDirty(this.slug()));

  /** Languages with no title or no text yet, marked on the tabs. */
  protected readonly emptyCodes = computed(() => {
    const draft = this.draft();
    return this.languages()
      .filter((language) => !draft?.title[language.code]?.trim() || !draft?.content[language.code]?.trim())
      .map((language) => language.code);
  });
  protected readonly filledCount = computed(() => this.languages().length - this.emptyCodes().length);

  ngOnInit(): void {
    this.languageService.getAll().subscribe({
      next: (response) => {
        const languages = response.data?.content ?? [];
        this.languages.set(languages);
        this.language.set(languages.find((language) => language.code === this.i18n.language())?.code ?? defaultLanguageCode(languages));
      },
      error: (error) => this.fail(error)
    });
    this.legalService.getAll().subscribe({
      next: (response) => {
        for (const doc of response.data ?? []) {
          this.apply(doc);
        }
      },
      error: (error) => this.fail(error)
    });
  }

  protected selectSlug(slug: LegalSlug): void {
    this.slug.set(slug);
    this.message.set(null);
  }

  protected isDirty(slug: LegalSlug): boolean {
    const doc = this.documents()[slug];
    const draft = this.drafts()[slug];
    if (!doc || !draft) {
      return false;
    }
    return !sameTexts(doc.titleTranslations, draft.title) || !sameTexts(doc.contentTranslations, draft.content);
  }

  protected setText(field: keyof Draft, value: string): void {
    const slug = this.slug();
    const draft = this.drafts()[slug];
    if (!draft) {
      return;
    }
    this.drafts.update((all) => ({ ...all, [slug]: { ...draft, [field]: { ...draft[field], [this.language()]: value } } }));
  }

  protected save(): void {
    const slug = this.slug();
    const draft = this.drafts()[slug];
    if (!draft) {
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    this.legalService.update(slug, { titleTranslations: clean(draft.title), contentTranslations: clean(draft.content) }).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.data) {
          this.apply(response.data);
        }
        this.message.set({ ok: true, text: this.i18n.t('legal_admin.saved') });
      },
      error: (error) => {
        this.saving.set(false);
        this.fail(error, 'common.error.save');
      }
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  }

  private apply(doc: LegalDocumentAdminDto): void {
    this.documents.update((all) => ({ ...all, [doc.slug]: doc }));
    this.drafts.update((all) => ({ ...all, [doc.slug]: { title: { ...doc.titleTranslations }, content: { ...doc.contentTranslations } } }));
  }

  private fail(error: { error?: { message?: string } } | null, fallbackKey = 'legal_admin.load_error'): void {
    this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t(fallbackKey) });
  }
}

/** Drops empty languages so the backend falls back to the default language for them. */
function clean(texts: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(texts).filter(([, text]) => !!text?.trim()));
}

function sameTexts(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => (a[key] ?? '').trim() === (b[key] ?? '').trim());
}
