import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ROLE_SUPER_ADMIN } from '../../core/constants/api.constants';
import { BaseResponse } from '../../core/models/base-response.model';
import { DiscountFilter, DiscountResponseDto, DiscountStatus } from '../../core/models/discount.model';
import { DropdownDto } from '../../core/models/dropdown.model';
import { PageableRequest, PageResponse } from '../../core/models/page-response.model';
import { CafeService } from '../../core/services/cafe.service';
import { DiscountService } from '../../core/services/discount.service';
import { I18nService } from '../../core/services/i18n.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { uiName, uiPrice } from '../../core/utils/ui-format.util';
import { BadgeTone } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DynamicTableComponent, TableAction, TableColumn } from '../../shared/components/dynamic-table/dynamic-table.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DiscountFormComponent } from './discount-form.component';

const STATUS_BADGES: Record<DiscountStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'discount_status.ACTIVE', tone: 'success' },
  SCHEDULED: { label: 'discount_status.SCHEDULED', tone: 'accent' },
  EXPIRED: { label: 'discount_status.EXPIRED', tone: 'neutral' },
  DISABLED: { label: 'discount_status.DISABLED', tone: 'warning' }
};

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [PageHeaderComponent, DynamicTableComponent, ButtonComponent, IconComponent, DiscountFormComponent, TranslatePipe],
  template: `
    <app-page-header
      [title]="'nav.discounts' | t"
      [subtitle]="(isSuperAdmin ? 'discounts.subtitle_all' : 'discounts.subtitle_mine') | t"
    >
      <app-button icon="plus" [disabled]="cafes().length === 0" (clicked)="openForm(null)">{{ 'discounts.new' | t }}</app-button>
    </app-page-header>

    <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
      <div class="relative md:w-72">
        <app-icon name="search" [size]="18"
                  class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-espresso-300" />
        <input
          type="search"
          [placeholder]="'discounts.search_placeholder' | t"
          (input)="search$.next($any($event.target).value)"
          class="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3.5 pl-10 text-sm placeholder:text-espresso-300
                 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none"
        />
      </div>
      @if (cafes().length > 1) {
        <select [value]="filter().cafeSlug ?? ''" (change)="setFilter({ cafeSlug: $any($event.target).value || undefined })"
                [attr.aria-label]="'cafes.column.cafe' | t" [class]="selectClasses">
          <option value="">{{ 'discounts.all_cafes' | t }}</option>
          @for (cafe of cafes(); track cafe.value) {
            <option [value]="cafe.value" [selected]="cafe.value === filter().cafeSlug">{{ cafe.label }}</option>
          }
        </select>
      }
      <div class="flex gap-2 overflow-x-auto">
        @for (option of statusOptions; track option.value) {
          <button type="button" (click)="setFilter({ status: option.value ?? undefined })"
                  class="h-10 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition"
                  [class]="(filter().status ?? null) === option.value
                    ? 'bg-espresso-900 text-espresso-50'
                    : 'border border-line-strong bg-surface text-espresso-700 hover:bg-espresso-50'">
            {{ option.label | t }}
          </button>
        }
      </div>
    </div>

    @if (errorMessage()) {
      <div class="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t" class="text-red-400 hover:text-red-700">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    <app-dynamic-table
      [columns]="columns"
      [actions]="actions"
      [loader]="loader()"
      [reloadTrigger]="reloadTrigger()"
      [emptyText]="'discounts.empty' | t"
      (loadError)="onLoadError($event)"
    />

    @if (formOpen()) {
      <app-discount-form
        [cafes]="cafes()"
        [discount]="editing()"
        [defaultCafeSlug]="filter().cafeSlug ?? null"
        (saved)="onSaved()"
        (cancelled)="formOpen.set(false)"
      />
    }
  `
})
export class DiscountsComponent implements OnInit {

  private readonly discountService = inject(DiscountService);
  private readonly cafeService = inject(CafeService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  protected readonly isSuperAdmin = inject(TokenStorageService).getClaims()?.role === ROLE_SUPER_ADMIN;

  protected readonly selectClasses =
    'h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-espresso-900 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none md:w-56';

  protected readonly statusOptions: { value: DiscountStatus | null; label: string }[] = [
    { value: null, label: 'system_messages.group.all' },
    { value: 'ACTIVE', label: 'discount_status.ACTIVE' },
    { value: 'SCHEDULED', label: 'discount_status.SCHEDULED' },
    { value: 'EXPIRED', label: 'discount_status.EXPIRED' },
    { value: 'DISABLED', label: 'discount_status.DISABLED' }
  ];

  protected readonly search$ = new Subject<string>();
  protected readonly cafes = signal<DropdownDto[]>([]);
  protected readonly filter = signal<DiscountFilter>({ cafeSlug: this.route.snapshot.queryParamMap.get('cafe') ?? undefined });
  protected readonly loader = signal(this.loaderFor(this.filter()));
  protected readonly reloadTrigger = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<DiscountResponseDto | null>(null);

  protected readonly columns: TableColumn<DiscountResponseDto>[] = [
    {
      key: 'product',
      header: 'discounts.column.product',
      media: (row) => ({
        imageUrl: row.productImageUrl,
        title: uiName(row.productNameTranslations),
        subtitle: uiName(row.cafeNameTranslations)
      })
    },
    { key: 'price', header: 'discounts.column.price', cell: (row) => `${uiPrice(row.productPrice)} → ${uiPrice(row.discountPrice)}` },
    { key: 'percent', header: 'discounts.column.discount', badge: (row) => ({ label: `−${row.percent}%`, tone: 'danger' }) },
    { key: 'period', header: 'discounts.column.period', cell: (row) => this.period(row) },
    { key: 'status', header: 'common.status.title', badge: (row) => STATUS_BADGES[row.status] }
  ];

  protected readonly actions: TableAction<DiscountResponseDto>[] = [
    { label: 'common.edit', icon: 'pencil', handler: (row) => this.openForm(row) },
    { label: 'common.delete', icon: 'trash', variant: 'danger', handler: (row) => this.delete(row) }
  ];

  ngOnInit(): void {
    this.loadCafes();
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.setFilter({ search: search.trim() || undefined }));
  }

  protected setFilter(patch: Partial<DiscountFilter>): void {
    this.filter.update((filter) => ({ ...filter, ...patch }));
    this.loader.set(this.loaderFor(this.filter()));
  }

  protected openForm(discount: DiscountResponseDto | null): void {
    this.editing.set(discount);
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    this.reloadTrigger.update((value) => value + 1);
  }

  protected onLoadError(error: unknown): void {
    this.errorMessage.set((error as { error?: { message?: string } })?.error?.message ?? this.i18n.t('discounts.error.load'));
  }

  private delete(discount: DiscountResponseDto): void {
    if (!confirm(this.i18n.t('discounts.confirm_delete', { name: uiName(discount.productNameTranslations) }))) {
      return;
    }
    this.discountService.delete(discount.cafeSlug, discount.slug).subscribe({
      next: () => this.reloadTrigger.update((value) => value + 1),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  private period(discount: DiscountResponseDto): string {
    const from = discount.startsAt ? DATE_FORMAT.format(new Date(discount.startsAt)) : null;
    const to = discount.endsAt ? DATE_FORMAT.format(new Date(discount.endsAt)) : null;
    if (from && to) {
      return `${from} — ${to}`;
    }
    if (from) {
      return this.i18n.t('discounts.period.from', { date: from });
    }
    return to ? this.i18n.t('discounts.period.until', { date: to }) : this.i18n.t('discounts.period.unlimited');
  }

  private loadCafes(): void {
    const cafes$: Observable<DropdownDto[]> = this.isSuperAdmin
      ? this.cafeService.getDropdown().pipe(map((response) => response.data ?? []))
      : this.cafeService.getMy().pipe(map((response) => (response.data?.cafes ?? []).map((cafe) => ({
        value: cafe.slug,
        label: uiName(cafe.nameTranslations) || cafe.slug
      }))));
    cafes$.subscribe({
      next: (cafes) => this.cafes.set(cafes),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('cafes.error.load'))
    });
  }

  private loaderFor(filter: DiscountFilter): (pageable: PageableRequest) => Observable<BaseResponse<PageResponse<DiscountResponseDto>>> {
    return (pageable) => this.discountService.get(filter, pageable);
  }
}
