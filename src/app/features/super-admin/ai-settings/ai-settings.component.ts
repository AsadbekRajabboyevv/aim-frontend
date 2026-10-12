import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiProviderSettingsDto, AiSettingsResponseDto } from '../../../core/models/ai.model';
import { AiSettingsService } from '../../../core/services/ai-settings.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface ModelList {
  loading: boolean;
  models: string[];
  error: boolean;
}

/** label: translation key. */
const KEY_HELP: Record<string, { url: string; label: string }> = {
  gemini: { url: 'https://aistudio.google.com/apikey', label: 'ai_settings.key_help.gemini' },
  openai: { url: 'https://platform.openai.com/api-keys', label: 'ai_settings.key_help.openai' }
};

interface ModelDraft {
  model: string;
  titleModel: string;
}

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, ButtonComponent, IconComponent, ToggleComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.ai_settings' | t" [subtitle]="'ai_settings.subtitle' | t">
      <a routerLink="/super-admin/ai-tools"
         class="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-espresso-800 transition hover:bg-espresso-50">
        <app-icon name="wrench" [size]="18" />
        {{ 'nav.ai_tools' | t }}
      </a>
      <app-button icon="check" [loading]="saving()" [disabled]="!settings()" (clicked)="save()">{{ 'common.save' | t }}</app-button>
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

    @if (settings()) {
      <div class="flex max-w-4xl flex-col gap-6">
        <section class="rounded-card border border-line bg-surface p-5 shadow-card">
          <app-toggle [label]="'ai_settings.enabled' | t" [hint]="'ai_settings.enabled_hint' | t"
                      [checked]="enabled()" (checkedChange)="enabled.set($event)" />
        </section>

        @if (activeProvider() && !activeProvider()!.configured) {
          <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <app-icon name="alert" [size]="18" class="mt-px text-amber-600" />
            <span>
              {{ 'ai_settings.no_key_before' | t: { provider: activeProvider()!.displayName } }}
              <code class="rounded bg-surface/70 px-1">{{ envName(activeProvider()!) }}</code>
              {{ 'ai_settings.no_key_after' | t }}
            </span>
          </div>
        }

        <section class="flex flex-col gap-3" role="radiogroup" [attr.aria-label]="'ai_settings.active_provider' | t">
          <h2 class="text-sm font-semibold tracking-wide text-espresso-400 uppercase">{{ 'ai_settings.providers' | t }}</h2>
          @for (provider of settings()!.providers; track provider.id) {
            @let selected = active() === provider.id;
            <article class="rounded-card border-2 bg-surface p-5 shadow-card transition"
                     [class]="selected ? 'border-accent-500' : 'border-transparent'">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <label class="flex cursor-pointer items-center gap-3">
                  <input type="radio" name="ai-provider" class="h-5 w-5 accent-accent-500" [checked]="selected"
                         (change)="active.set(provider.id)" />
                  <span>
                    <span class="block text-base font-semibold text-espresso-900">{{ provider.displayName }}</span>
                    <span class="block text-xs text-espresso-400">{{ (selected ? 'ai_settings.provider_active' : 'ai_settings.provider_select') | t }}</span>
                  </span>
                </label>
                <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                      [class]="provider.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-espresso-50 text-espresso-500'">
                  <app-icon [name]="provider.configured ? 'check' : 'lock'" [size]="13" />
                  {{ (provider.configured ? 'ai_settings.key_set' : 'ai_settings.key_missing') | t }}
                </span>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-espresso-800">{{ 'ai_settings.chat_model' | t }}</span>
                  <input type="text" [attr.list]="'models-' + provider.id" [value]="draft(provider).model"
                         [placeholder]="provider.defaultModel" (input)="setDraft(provider, 'model', $any($event.target).value)"
                         class="h-10 rounded-xl border border-line-strong bg-surface px-3 font-mono text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-espresso-800">{{ 'ai_settings.title_model' | t }}</span>
                  <input type="text" [attr.list]="'models-' + provider.id" [value]="draft(provider).titleModel"
                         [placeholder]="provider.defaultTitleModel" (input)="setDraft(provider, 'titleModel', $any($event.target).value)"
                         class="h-10 rounded-xl border border-line-strong bg-surface px-3 font-mono text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
                </label>
                <datalist [id]="'models-' + provider.id">
                  @for (model of modelLists()[provider.id]?.models ?? []; track model) {
                    <option [value]="model"></option>
                  }
                </datalist>
              </div>

              @if (provider.configured) {
                @let list = modelLists()[provider.id];
                <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  @if (!list || list.loading) {
                    <span class="text-espresso-400">{{ 'ai_settings.models_loading' | t }}</span>
                  } @else if (list.error) {
                    <span class="text-red-600">{{ 'ai_settings.models_error' | t }}</span>
                  } @else {
                    <span class="text-espresso-500">{{ 'ai_settings.models_available' | t: { count: list.models.length } }}</span>
                    @for (field of unknownModels(provider); track field) {
                      <span class="font-medium text-red-600">{{ 'ai_settings.model_unknown' | t: { model: field } }}</span>
                    }
                  }
                </p>
              }

              <p class="mt-3 text-xs text-espresso-400">
                {{ 'ai_settings.key_env_before' | t }}
                <code class="rounded bg-espresso-50 px-1">{{ envName(provider) }}</code>
                {{ 'ai_settings.key_env_after' | t }}
                @if (keyHelp(provider); as help) {
                  {{ 'ai_settings.key_get' | t }}
                  <a [href]="help.url" target="_blank" rel="noopener" class="font-medium text-accent-600 hover:underline">{{ help.label | t }}</a>.
                }
                {{ 'ai_settings.empty_default' | t }}
              </p>
            </article>
          }
        </section>
      </div>
    } @else if (!message()) {
      <div class="h-64 max-w-4xl animate-pulse rounded-card bg-surface"></div>
    }
  `
})
export class AiSettingsComponent implements OnInit {

  private readonly settingsService = inject(AiSettingsService);
  private readonly i18n = inject(I18nService);

  protected readonly settings = signal<AiSettingsResponseDto | null>(null);
  protected readonly enabled = signal(true);
  protected readonly active = signal('');
  protected readonly drafts = signal<Record<string, ModelDraft>>({});
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly modelLists = signal<Record<string, ModelList>>({});

  protected readonly activeProvider = computed(() =>
    this.settings()?.providers.find((provider) => provider.id === this.active()) ?? null);

  ngOnInit(): void {
    this.settingsService.get().subscribe({
      next: (response) => response.data && this.apply(response.data),
      error: (error) => this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('settings.error.load') })
    });
  }

  protected draft(provider: AiProviderSettingsDto): ModelDraft {
    return this.drafts()[provider.id] ?? { model: '', titleModel: '' };
  }

  protected setDraft(provider: AiProviderSettingsDto, field: keyof ModelDraft, value: string): void {
    this.drafts.update((all) => ({ ...all, [provider.id]: { ...this.draft(provider), [field]: value } }));
  }

  protected unknownModels(provider: AiProviderSettingsDto): string[] {
    const list = this.modelLists()[provider.id];
    if (!list || list.loading || list.error || list.models.length === 0) {
      return [];
    }
    const draft = this.draft(provider);
    const chosen = [draft.model.trim() || provider.defaultModel, draft.titleModel.trim() || provider.defaultTitleModel];
    return [...new Set(chosen)].filter((model) => !list.models.includes(model));
  }

  private loadModels(settings: AiSettingsResponseDto): void {
    for (const provider of settings.providers.filter((item) => item.configured)) {
      if (this.modelLists()[provider.id]) {
        continue;
      }
      this.setModelList(provider.id, { loading: true, models: [], error: false });
      this.settingsService.models(provider.id).subscribe({
        next: (response) => this.setModelList(provider.id, { loading: false, models: response.data ?? [], error: false }),
        error: () => this.setModelList(provider.id, { loading: false, models: [], error: true })
      });
    }
  }

  private setModelList(providerId: string, list: ModelList): void {
    this.modelLists.update((all) => ({ ...all, [providerId]: list }));
  }

  protected keyHelp(provider: AiProviderSettingsDto): { url: string; label: string } | null {
    return KEY_HELP[provider.id] ?? null;
  }

  protected envName(provider: AiProviderSettingsDto): string {
    return `${provider.id.toUpperCase()}_API_KEY`;
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    this.settingsService.update({
      enabled: this.enabled(),
      activeProvider: this.active(),
      models: this.drafts()
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.data) {
          this.apply(response.data);
        }
        this.message.set({ ok: true, text: this.i18n.t('common.saved') });
      },
      error: (error) => {
        this.saving.set(false);
        this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('common.error.save') });
      }
    });
  }

  private apply(settings: AiSettingsResponseDto): void {
    this.settings.set(settings);
    this.loadModels(settings);
    this.enabled.set(settings.enabled);
    this.active.set(settings.activeProvider);
    this.drafts.set(Object.fromEntries(settings.providers.map((provider) => [provider.id, {
      model: provider.model === provider.defaultModel ? '' : provider.model,
      titleModel: provider.titleModel === provider.defaultTitleModel ? '' : provider.titleModel
    }])));
  }
}
