import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CafeResponseDto } from '../../../core/models/cafe.model';
import { MenuCategoryResponseDto, ProductResponseDto } from '../../../core/models/menu.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { MenuCategoryService } from '../../../core/services/menu-category.service';
import { ProductService } from '../../../core/services/product.service';
import { uiName, uiPrice } from '../../../core/utils/ui-format.util';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

type StopListFilter = 'all' | 'sold-out';

interface CategoryGroup {
  category: MenuCategoryResponseDto;
  products: ProductResponseDto[];
}

@Component({
  selector: 'app-stop-list',
  standalone: true,
  imports: [PageHeaderComponent, ButtonComponent, IconComponent, AvatarComponent, TranslatePipe],
  template: `
    <app-page-header
      [title]="'cafes.action.stop_list' | t"
      [subtitle]="cafeName() ? cafeName() + ' · ' + ('stop_list.sold_out_count' | t: { count: soldOutCount() }) : ''"
      [backLink]="returnLink + '/' + cafeSlug + '/menu'"
      [backLabel]="'stop_list.back' | t"
    >
      <app-button variant="secondary" icon="refresh" [iconOnly]="true" [ariaLabel]="'common.refresh' | t" [loading]="refreshing()"
                  (clicked)="load(false)" />
      <app-button variant="secondary" icon="check" [disabled]="soldOutCount() === 0" [loading]="resetting()"
                  (clicked)="markAllAvailable()">
        {{ 'stop_list.all_available' | t }}
      </app-button>
    </app-page-header>

    @if (errorMessage()) {
      <div class="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t" class="text-red-400 hover:text-red-700">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    <div class="sticky top-16 z-20 -mx-4 mb-5 flex flex-col gap-3 bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
      <div class="relative">
        <app-icon name="search" [size]="20" class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-espresso-300" />
        <input
          type="search"
          [placeholder]="'stop_list.search_placeholder' | t"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
          class="h-12 w-full rounded-2xl border border-line-strong bg-surface pr-4 pl-12 text-base placeholder:text-espresso-300
                 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none"
        />
      </div>
      <div class="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        <button type="button" (click)="filter.set('all')" [class]="chipClasses(filter() === 'all')">
          {{ 'system_messages.group.all' | t }} <span class="tabular-nums opacity-70">{{ totalCount() }}</span>
        </button>
        <button type="button" (click)="filter.set('sold-out')" [class]="chipClasses(filter() === 'sold-out', true)">
          <app-icon name="ban" [size]="15" />
          {{ 'menu_manager.sold_out' | t }} <span class="tabular-nums opacity-70">{{ soldOutCount() }}</span>
        </button>
        <span class="mx-1 w-px shrink-0 bg-line-strong"></span>
        @for (category of categories(); track category.slug) {
          <button type="button" (click)="toggleCategory(category.slug)" [class]="chipClasses(categorySlug() === category.slug)">
            {{ name(category.nameTranslations) }}
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="flex flex-col gap-3">
        @for (placeholder of [0, 1, 2, 3, 4]; track placeholder) {
          <div class="h-18 animate-pulse rounded-2xl bg-surface"></div>
        }
      </div>
    } @else {
      @for (group of groups(); track group.category.slug) {
        <section class="mb-6">
          <h2 class="mb-2 px-1 text-sm font-semibold tracking-wide text-espresso-400 uppercase">
            {{ name(group.category.nameTranslations) }}
          </h2>
          <ul class="flex flex-col gap-2">
            @for (product of group.products; track product.slug) {
              <li>
                <button
                  type="button"
                  (click)="toggle(product)"
                  [attr.aria-pressed]="!product.available"
                  [attr.aria-label]="name(product.nameTranslations) + ': ' + ((product.available ? 'menu_manager.available' : 'menu_manager.sold_out') | t)"
                  class="flex min-h-18 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99]"
                  [class]="product.available
                    ? 'border-line bg-surface hover:border-line-strong'
                    : 'border-red-200 bg-red-50 hover:border-red-300'"
                >
                  <app-avatar [name]="name(product.nameTranslations)" [imageUrl]="product.imageUrl" shape="rounded" [size]="52" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-base font-semibold"
                          [class]="product.available ? 'text-espresso-900' : 'text-red-800 line-through decoration-red-300'">
                      {{ name(product.nameTranslations) }}
                    </span>
                    <span class="block text-sm text-espresso-400">{{ price(product.discountPrice ?? product.price) }}</span>
                  </span>
                  <span class="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold"
                        [class]="product.available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-600 text-white'">
                    @if (pending().has(product.slug)) {
                      <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                    } @else {
                      <app-icon [name]="product.available ? 'check' : 'ban'" [size]="15" [strokeWidth]="2.5" />
                    }
                    {{ (product.available ? 'menu_manager.available' : 'menu_manager.sold_out') | t }}
                  </span>
                </button>
              </li>
            }
          </ul>
        </section>
      } @empty {
        <div class="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-14 text-center shadow-card">
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <app-icon [name]="filter() === 'sold-out' && !search() ? 'check' : 'search'" [size]="26" />
          </span>
          <p class="font-semibold text-espresso-900">
            {{ (filter() === 'sold-out' && !search() ? 'stop_list.all_in_stock' : 'common.no_data') | t }}
          </p>
        </div>
      }
    }
  `
})
export class StopListComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly cafeService = inject(CafeService);
  private readonly categoryService = inject(MenuCategoryService);
  private readonly productService = inject(ProductService);
  private readonly i18n = inject(I18nService);

  protected readonly cafeSlug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly returnLink: string = this.route.snapshot.data['returnLink'] ?? '/';

  protected readonly cafe = signal<CafeResponseDto | null>(null);
  protected readonly categories = signal<MenuCategoryResponseDto[]>([]);
  protected readonly products = signal<ProductResponseDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly resetting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly pending = signal<ReadonlySet<string>>(new Set());

  protected readonly search = signal('');
  protected readonly filter = signal<StopListFilter>('all');
  protected readonly categorySlug = signal<string | null>(null);

  protected readonly cafeName = computed(() => (this.cafe() ? this.name(this.cafe()!.nameTranslations) : ''));
  protected readonly totalCount = computed(() => this.products().length);
  protected readonly soldOutCount = computed(() => this.products().filter((product) => !product.available).length);

  protected readonly groups = computed<CategoryGroup[]>(() => {
    const query = this.search().trim().toLowerCase();
    const soldOutOnly = this.filter() === 'sold-out';
    return this.categories()
      .filter((category) => !this.categorySlug() || category.slug === this.categorySlug())
      .map((category) => ({
        category,
        products: this.products().filter((product) =>
          product.categorySlug === category.slug
          && (!soldOutOnly || !product.available)
          && (!query || Object.values(product.nameTranslations).some((value) => value.toLowerCase().includes(query))))
      }))
      .filter((group) => group.products.length > 0);
  });

  ngOnInit(): void {
    this.load(true);
  }

  @HostListener('document:visibilitychange')
  protected onVisibilityChange(): void {
    if (document.visibilityState === 'visible' && !this.loading()) {
      this.load(false);
    }
  }

  protected name(translations: Record<string, string> | null): string {
    return uiName(translations);
  }

  protected price(value: number): string {
    return uiPrice(value);
  }

  protected chipClasses(active: boolean, danger = false): string {
    return [
      'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition',
      active
        ? (danger ? 'bg-red-600 text-white' : 'bg-espresso-900 text-espresso-50')
        : 'border border-line-strong bg-surface text-espresso-700 hover:bg-espresso-50'
    ].join(' ');
  }

  protected toggleCategory(slug: string): void {
    this.categorySlug.set(this.categorySlug() === slug ? null : slug);
  }

  protected toggle(product: ProductResponseDto): void {
    if (this.pending().has(product.slug)) {
      return;
    }
    const available = !product.available;
    this.replace({ ...product, available });
    this.setPending(product.slug, true);
    this.productService.updateAvailability(this.cafeSlug, product.slug, available).subscribe({
      next: () => this.setPending(product.slug, false),
      error: (error) => {
        this.setPending(product.slug, false);
        this.replace(product);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }

  protected markAllAvailable(): void {
    if (!confirm(this.i18n.t('stop_list.confirm_reset', { count: this.soldOutCount() }))) {
      return;
    }
    this.resetting.set(true);
    this.productService.updateAvailabilityBulk(this.cafeSlug, true).subscribe({
      next: () => {
        this.resetting.set(false);
        this.products.update((list) => list.map((product) => ({ ...product, available: true })));
      },
      error: (error) => {
        this.resetting.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }

  protected load(initial: boolean): void {
    if (initial) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }
    forkJoin({
      cafe: this.cafeService.getBySlug(this.cafeSlug),
      categories: this.categoryService.get(this.cafeSlug),
      products: this.productService.get(this.cafeSlug)
    }).subscribe({
      next: ({ cafe, categories, products }) => {
        const visibleCategories = (categories.data ?? []).filter((category) => category.active);
        const visibleSlugs = new Set(visibleCategories.map((category) => category.slug));
        this.cafe.set(cafe.data ?? null);
        this.categories.set(visibleCategories);
        this.products.set((products.data ?? []).filter((product) => product.active && visibleSlugs.has(product.categorySlug)));
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('menu_manager.error.load'));
      }
    });
  }

  private replace(updated: ProductResponseDto): void {
    this.products.update((list) => list.map((product) => (product.slug === updated.slug ? updated : product)));
  }

  private setPending(slug: string, on: boolean): void {
    const next = new Set(this.pending());
    if (on) {
      next.add(slug);
    } else {
      next.delete(slug);
    }
    this.pending.set(next);
  }
}
