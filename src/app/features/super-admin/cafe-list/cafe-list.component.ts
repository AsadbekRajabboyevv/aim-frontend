import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { BaseResponse } from '../../../core/models/base-response.model';
import { CafeFilter, CafeResponseDto } from '../../../core/models/cafe.model';
import { PageableRequest, PageResponse } from '../../../core/models/page-response.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { uiName } from '../../../core/utils/ui-format.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { DynamicTableComponent, TableAction, TableColumn } from '../../../shared/components/dynamic-table/dynamic-table.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-cafe-list',
  standalone: true,
  imports: [DynamicTableComponent, ButtonComponent, IconComponent, PageHeaderComponent, StatCardComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'cafes.title' | t" [subtitle]="'cafes.subtitle_all' | t">
      <div class="relative w-full sm:w-80">
        <app-icon name="search" [size]="18"
                  class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-espresso-300" />
        <input
          type="search"
          [placeholder]="'cafes.search_placeholder' | t"
          (input)="search$.next($any($event.target).value)"
          class="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3.5 pl-10 text-sm placeholder:text-espresso-300
                 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none"
        />
      </div>
      <app-button icon="plus" (clicked)="createCafe()">{{ 'cafes.new' | t }}</app-button>
    </app-page-header>

    <div class="mb-8 grid gap-4 sm:grid-cols-3">
      <app-stat-card [label]="'cafes.stats.total' | t" icon="store" tone="accent" [value]="stats().total" />
      <app-stat-card [label]="'common.status.active' | t" icon="trending-up" tone="success" [value]="stats().active" />
      <app-stat-card [label]="'common.status.inactive' | t" icon="pause-circle" tone="neutral" [value]="stats().inactive" />
    </div>

    <app-dynamic-table
      [columns]="columns"
      [actions]="actions"
      [loader]="loader()"
      [reloadTrigger]="reloadTrigger()"
      [emptyText]="'cafes.empty' | t"
    />
  `
})
export class CafeListComponent implements OnInit {

  private readonly cafeService = inject(CafeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly search$ = new Subject<string>();
  protected readonly reloadTrigger = signal(0);
  protected readonly stats = signal<{ total: number | null; active: number | null; inactive: number | null }>({
    total: null, active: null, inactive: null
  });

  protected readonly columns: TableColumn<CafeResponseDto>[] = [
    {
      key: 'name',
      header: 'cafes.column.cafe',
      media: (row) => ({ imageUrl: row.logoUrl, title: this.displayName(row), subtitle: row.slug })
    },
    { key: 'owner', header: 'cafes.column.owner', person: (row) => row.ownerFullName },
    { key: 'phone', header: 'common.phone', cell: (row) => row.phone || '—' },
    {
      key: 'active',
      header: 'common.status.title',
      badge: (row) => (row.active
        ? { label: 'common.status.active', tone: 'success' }
        : { label: 'common.status.inactive', tone: 'neutral' })
    }
  ];

  protected readonly actions: TableAction<CafeResponseDto>[] = [
    { label: 'cafes.action.menu', icon: 'book-open', handler: (row) => this.router.navigate(['/super-admin/cafes', row.slug, 'menu']) },
    { label: 'cafes.action.stop_list', icon: 'ban', handler: (row) => this.router.navigate(['/super-admin/cafes', row.slug, 'stop-list']) },
    { label: 'cafes.action.qr', icon: 'qr', handler: (row) => this.router.navigate(['/super-admin/cafes', row.slug, 'qr']) },
    { label: 'common.edit', icon: 'pencil', handler: (row) => this.router.navigate(['/super-admin/cafes', row.slug, 'edit']) },
    { label: 'common.delete', icon: 'trash', variant: 'danger', handler: (row) => this.deleteCafe(row) }
  ];

  protected readonly loader = signal(this.loaderFor({}));

  ngOnInit(): void {
    this.loadStats();
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.loader.set(this.loaderFor({ search: search.trim() || undefined })));
  }

  protected createCafe(): void {
    this.router.navigate(['/super-admin/cafes/new']);
  }

  private loaderFor(filter: CafeFilter): (pageable: PageableRequest) => Observable<BaseResponse<PageResponse<CafeResponseDto>>> {
    return (pageable) => this.cafeService.get(filter, pageable);
  }

  private loadStats(): void {
    const firstPage: PageableRequest = { page: 0, size: 1 };
    forkJoin({
      total: this.cafeService.get({}, firstPage),
      active: this.cafeService.get({ active: true }, firstPage),
      inactive: this.cafeService.get({ active: false }, firstPage)
    }).subscribe(({ total, active, inactive }) => this.stats.set({
      total: total.data?.totalElements ?? 0,
      active: active.data?.totalElements ?? 0,
      inactive: inactive.data?.totalElements ?? 0
    }));
  }

  private displayName(cafe: CafeResponseDto): string {
    return uiName(cafe.nameTranslations) || cafe.slug;
  }

  private deleteCafe(cafe: CafeResponseDto): void {
    if (!confirm(this.i18n.t('cafes.confirm_delete', { name: this.displayName(cafe) }))) {
      return;
    }
    this.cafeService.delete(cafe.slug).subscribe(() => {
      this.reloadTrigger.update((value) => value + 1);
      this.loadStats();
    });
  }
}
