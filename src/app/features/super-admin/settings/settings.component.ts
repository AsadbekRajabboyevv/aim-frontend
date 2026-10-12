import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SettingResponseDto } from '../../../core/models/setting.model';
import { I18nService } from '../../../core/services/i18n.service';
import { SettingService } from '../../../core/services/setting.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SettingFormComponent } from './setting-form.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ButtonComponent, IconComponent, BadgeComponent, PageHeaderComponent, SettingFormComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.settings' | t" [subtitle]="'settings.subtitle' | t">
      <div class="relative w-full sm:w-72">
        <app-icon name="search" [size]="18" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-espresso-300" />
        <input type="search" [placeholder]="'settings.search_placeholder' | t" (input)="search.set($any($event.target).value)"
               class="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3.5 pl-10 text-sm placeholder:text-espresso-300
                      focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
      </div>
      <app-button icon="plus" (clicked)="open(null)">{{ 'settings.new' | t }}</app-button>
    </app-page-header>

    @if (errorMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t"><app-icon name="x" [size]="16" /></button>
      </div>
    }

    <div class="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      @for (setting of filtered(); track setting.key) {
        <div class="flex flex-col gap-3 border-b border-line p-5 last:border-b-0 md:flex-row md:items-center">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-espresso-900">{{ setting.description || setting.key }}</p>
              <app-badge tone="neutral">{{ setting.type }}</app-badge>
              @if (setting.protectedKey) {
                <span class="inline-flex items-center gap-1 text-xs font-medium text-espresso-400" [title]="'settings.system_hint' | t">
                  <app-icon name="lock" [size]="13" /> {{ 'settings.system' | t }}
                </span>
              }
            </div>
            <p class="mt-1 font-mono text-xs text-espresso-400">{{ setting.key }}</p>
          </div>
          <div class="flex items-center gap-3">
            <code class="max-w-xs truncate rounded-lg bg-canvas px-3 py-1.5 font-mono text-sm text-espresso-800" [title]="setting.value">
              {{ setting.value }}
            </code>
            <app-button variant="secondary" size="sm" icon="pencil" [iconOnly]="true" [ariaLabel]="'common.edit' | t" (clicked)="open(setting)" />
            <app-button variant="danger" size="sm" icon="trash" [iconOnly]="true"
                        [ariaLabel]="(setting.protectedKey ? 'settings.cannot_delete_system' : 'common.delete') | t"
                        [disabled]="setting.protectedKey" (clicked)="remove(setting)" />
          </div>
        </div>
      } @empty {
        <div class="px-5 py-14 text-center text-sm text-espresso-400">
          {{ (loading() ? 'common.loading' : 'settings.empty') | t }}
        </div>
      }
    </div>

    @if (formOpen()) {
      <app-setting-form [setting]="editing()" (saved)="onSaved($event)" (cancelled)="formOpen.set(false)" />
    }
  `
})
export class SettingsComponent implements OnInit {

  private readonly settingService = inject(SettingService);
  private readonly i18n = inject(I18nService);

  protected readonly settings = signal<SettingResponseDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly search = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<SettingResponseDto | null>(null);

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return query
      ? this.settings().filter((s) => s.key.includes(query) || (s.description ?? '').toLowerCase().includes(query))
      : this.settings();
  });

  ngOnInit(): void {
    this.settingService.get({}, { page: 0, size: 200, sort: 'key' }).subscribe({
      next: (response) => {
        this.settings.set(response.data?.content ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('settings.error.load'));
      }
    });
  }

  protected open(setting: SettingResponseDto | null): void {
    this.editing.set(setting);
    this.formOpen.set(true);
  }

  protected onSaved(saved: SettingResponseDto): void {
    this.formOpen.set(false);
    const exists = this.settings().some((s) => s.key === saved.key);
    this.settings.update((list) => (exists ? list.map((s) => (s.key === saved.key ? saved : s)) : [...list, saved])
      .sort((a, b) => a.key.localeCompare(b.key)));
  }

  protected remove(setting: SettingResponseDto): void {
    if (!confirm(this.i18n.t('settings.confirm_delete', { key: setting.key }))) {
      return;
    }
    this.settingService.delete(setting.key).subscribe({
      next: () => this.settings.update((list) => list.filter((s) => s.key !== setting.key)),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }
}
