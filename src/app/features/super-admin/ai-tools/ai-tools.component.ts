import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AiToolResponseDto } from '../../../core/models/ai.model';
import { BaseResponse } from '../../../core/models/base-response.model';
import { PageableRequest, PageResponse } from '../../../core/models/page-response.model';
import { AiToolService } from '../../../core/services/ai-tool.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DynamicTableComponent, TableAction, TableColumn } from '../../../shared/components/dynamic-table/dynamic-table.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AiToolFormComponent } from './ai-tool-form.component';

const ROLE_KEYS: Record<string, string> = { CAFE_ADMIN: 'role.cafe_admin', SUPER_ADMIN: 'role.super_admin' };

@Component({
  selector: 'app-ai-tools',
  standalone: true,
  imports: [PageHeaderComponent, DynamicTableComponent, ButtonComponent, IconComponent, AiToolFormComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.ai_tools' | t" [subtitle]="'ai_tools.subtitle' | t">
      <div class="relative w-full sm:w-72">
        <app-icon name="search" [size]="18"
                  class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-espresso-300" />
        <input type="search" [placeholder]="'ai_tools.search_placeholder' | t" (input)="search$.next($any($event.target).value)"
               class="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3.5 pl-10 text-sm placeholder:text-espresso-300
                      focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
      </div>
      <app-button icon="plus" (clicked)="openForm(null)">{{ 'ai_tools.new' | t }}</app-button>
    </app-page-header>

    @if (errorMessage()) {
      <div class="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t" class="text-red-400 hover:text-red-700">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    <app-dynamic-table [columns]="columns" [actions]="actions" [loader]="loader()" [reloadTrigger]="reloadTrigger()"
                       [emptyText]="'ai_tools.empty' | t" />

    @if (formOpen()) {
      <app-ai-tool-form [tool]="editing()" (saved)="onSaved()" (cancelled)="formOpen.set(false)" />
    }
  `
})
export class AiToolsComponent implements OnInit {

  private readonly toolService = inject(AiToolService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly search$ = new Subject<string>();
  protected readonly loader = signal(this.loaderFor(undefined));
  protected readonly reloadTrigger = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<AiToolResponseDto | null>(null);

  protected readonly columns: TableColumn<AiToolResponseDto>[] = [
    { key: 'title', header: 'ai_tools.column.tool', media: (row) => ({ imageUrl: null, title: row.title, subtitle: row.name }) },
    { key: 'endpoint', header: 'API', cell: (row) => `${row.httpMethod} ${row.pathTemplate}` },
    {
      key: 'roles',
      header: 'ai_tools.column.roles',
      cell: (row) => row.allowedRoles.map((role) => (ROLE_KEYS[role] ? this.i18n.t(ROLE_KEYS[role]) : role)).join(', ')
    },
    {
      key: 'confirmation',
      header: 'ai_tools.column.confirmation',
      badge: (row) => row.requiresConfirmation
        ? { label: 'ai_tools.confirmation.form', tone: 'accent' }
        : { label: 'ai_tools.confirmation.auto', tone: 'neutral' }
    },
    {
      key: 'active',
      header: 'common.status.title',
      badge: (row) => row.active
        ? { label: 'common.status.active', tone: 'success' }
        : { label: 'common.status.inactive', tone: 'neutral' }
    }
  ];

  protected readonly actions: TableAction<AiToolResponseDto>[] = [
    { label: 'common.edit', icon: 'pencil', handler: (row) => this.openForm(row) },
    { label: 'common.delete', icon: 'trash', variant: 'danger', handler: (row) => this.delete(row) }
  ];

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.loader.set(this.loaderFor(search.trim() || undefined)));
  }

  protected openForm(tool: AiToolResponseDto | null): void {
    this.editing.set(tool);
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    this.reloadTrigger.update((value) => value + 1);
  }

  private delete(tool: AiToolResponseDto): void {
    if (!confirm(this.i18n.t('ai_tools.confirm_delete', { name: tool.title }))) {
      return;
    }
    this.toolService.delete(tool.name).subscribe({
      next: () => this.reloadTrigger.update((value) => value + 1),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  private loaderFor(search: string | undefined): (pageable: PageableRequest) => Observable<BaseResponse<PageResponse<AiToolResponseDto>>> {
    return (pageable) => this.toolService.get(search, pageable);
  }
}
