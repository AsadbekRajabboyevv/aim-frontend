import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LanguageFormComponent } from './language-form.component';

@Component({
  selector: 'app-languages',
  standalone: true,
  imports: [ButtonComponent, IconComponent, BadgeComponent, PageHeaderComponent, LanguageFormComponent, RouterLink, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.languages' | t" [subtitle]="'languages.subtitle' | t">
      <app-button icon="plus" (clicked)="open(null)">{{ 'languages.new' | t }}</app-button>
    </app-page-header>

    <div class="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-espresso-500 shadow-card">
      <app-icon name="info" [size]="18" class="mt-px text-accent-600" />
      <div class="flex flex-col gap-1.5">
        <p class="font-semibold text-espresso-800">{{ 'languages.howto.title' | t }}</p>
        <ol class="list-decimal space-y-1 pl-4">
          <li>{{ 'languages.howto.step1' | t }}</li>
          <li>
            {{ 'languages.howto.step2' | t }}
            <a routerLink="/super-admin/system-messages" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'nav.system_messages' | t }}</a>
          </li>
          <li>{{ 'languages.howto.step3' | t }}</li>
        </ol>
      </div>
    </div>

    @if (errorMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t"><app-icon name="x" [size]="16" /></button>
      </div>
    }

    <div class="relative overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-line text-left text-xs font-semibold tracking-wide text-espresso-400 uppercase">
            <th class="px-5 py-3.5">{{ 'common.code' | t }}</th>
            <th class="px-5 py-3.5">{{ 'common.language' | t }}</th>
            <th class="px-5 py-3.5">{{ 'common.status.title' | t }}</th>
            <th class="px-5 py-3.5">{{ 'common.sort_order' | t }}</th>
            <th class="px-5 py-3.5"><span class="sr-only">{{ 'common.actions' | t }}</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          @for (language of languages(); track language.code) {
            <tr class="hover:bg-canvas/70">
              <td class="px-5 py-3.5">
                <span class="rounded-lg bg-espresso-50 px-2.5 py-1 font-mono font-semibold text-espresso-800">{{ language.code.toUpperCase() }}</span>
              </td>
              <td class="px-5 py-3.5">
                <p class="font-semibold text-espresso-900">{{ language.nativeName }}</p>
                <p class="text-xs text-espresso-400">{{ language.name }}</p>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex flex-wrap gap-1.5">
                  @if (language.isDefault) {
                    <app-badge tone="accent">{{ 'languages.default' | t }}</app-badge>
                  }
                  <app-badge [tone]="language.isActive ? 'success' : 'neutral'">{{ (language.isActive ? 'common.status.active' : 'common.status.inactive') | t }}</app-badge>
                </div>
              </td>
              <td class="px-5 py-3.5 tabular-nums text-espresso-500">{{ language.sortOrder }}</td>
              <td class="px-5 py-3.5">
                <div class="flex justify-end gap-2">
                  <app-button variant="secondary" size="sm" icon="pencil" [iconOnly]="true" [ariaLabel]="'common.edit' | t" (clicked)="open(language)" />
                  <app-button variant="danger" size="sm" icon="trash" [iconOnly]="true" [disabled]="language.isDefault"
                              [ariaLabel]="(language.isDefault ? 'languages.cannot_delete_default' : 'common.delete') | t"
                              (clicked)="remove(language)" />
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="px-5 py-14 text-center text-espresso-400">{{ (loading() ? 'common.loading' : 'languages.empty') | t }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (formOpen()) {
      <app-language-form [language]="editing()" [nextSortOrder]="nextSortOrder()" (saved)="onSaved()" (cancelled)="formOpen.set(false)" />
    }
  `
})
export class LanguagesComponent implements OnInit {

  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<LanguageResponseDto | null>(null);

  protected readonly nextSortOrder = computed(() => Math.max(0, ...this.languages().map((l) => l.sortOrder)) + 1);

  ngOnInit(): void {
    this.load();
  }

  protected open(language: LanguageResponseDto | null): void {
    this.editing.set(language);
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    this.load();
    this.i18n.refresh();
  }

  protected remove(language: LanguageResponseDto): void {
    if (!confirm(this.i18n.t('languages.confirm_delete', { name: language.nativeName }))) {
      return;
    }
    this.languageService.delete(language.code).subscribe({
      next: () => {
        this.load();
        this.i18n.refresh();
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  private load(): void {
    this.languageService.getAll().subscribe({
      next: (response) => {
        this.languages.set(response.data?.content ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.load_languages'));
      }
    });
  }
}
