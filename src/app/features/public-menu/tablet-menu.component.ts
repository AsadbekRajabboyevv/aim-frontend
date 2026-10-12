import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval } from 'rxjs';
import { MENU_REFRESH_INTERVAL_MS, MENU_TABLE_QUERY_PARAM, STORAGE_KEY_MENU_LANGUAGE } from '../../core/constants/api.constants';
import { ProductTag, PublicMenuResponseDto, PublicProductDto } from '../../core/models/menu.model';
import { PublicMenuService } from '../../core/services/public-menu.service';
import { mediaUrl } from '../../core/utils/media-url.util';
import { formatPrice, translate } from '../../core/utils/menu-format.util';
import { menuThemeStyle } from '../../core/utils/menu-theme.util';
import { ProductTagMeta, discountPercent, productTagMeta } from '../../core/utils/product-tag.util';
import { filledSocialLinks } from '../../core/utils/social.util';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

const FALLBACK_LABELS: Record<string, string> = {
  search: 'Taom qidirish',
  items: 'ta taom',
  sold_out: 'Tugagan',
  results: 'Qidiruv natijalari',
  nothing: 'Hech narsa topilmadi',
  empty: "Menyu tez orada tayyor bo'ladi",
  close: 'Yopish',
  fullscreen: "To'liq ekran",
  table: 'Stol',
  address: 'Manzil',
  phone: 'Telefon',
  hours: 'Ish vaqti',
  wifi: 'Wi-Fi',
  tag_new: 'Yangi',
  tag_hit: 'Hit',
  tag_spicy: 'Achchiq'
};

@Component({
  selector: 'app-tablet-menu',
  standalone: true,
  imports: [NgTemplateOutlet, AvatarComponent, IconComponent],
  styles: `
    .cover-image {
      animation: cover-zoom 18s ease-out both;
    }
    @keyframes cover-zoom {
      from { transform: scale(1.12); }
      to { transform: scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .cover-image { animation: none; }
    }
  `,
  template: `
    <div class="palette-light contents" [style]="themeStyle()">
    @if (loading()) {
      <div class="flex min-h-screen items-center justify-center bg-canvas">
        <span class="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent"></span>
      </div>
    } @else if (errorMessage()) {
      <div class="coffee-pattern flex min-h-screen flex-col items-center justify-center gap-4 bg-espresso-900 px-6 text-center">
        <app-icon name="utensils" [size]="48" class="text-accent-500" />
        <p class="font-display text-3xl text-white">{{ errorMessage() }}</p>
      </div>
    } @else if (menu(); as menu) {
      <div class="min-h-screen bg-canvas lg:pl-64">

        <aside class="relative z-30 overflow-hidden bg-espresso-900 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
          @if (cover(); as coverUrl) {
            <div class="pointer-events-none absolute inset-0 lg:hidden" aria-hidden="true">
              <img [src]="coverUrl" alt="" class="cover-image h-full w-full object-cover" />
              <div class="absolute inset-0 bg-linear-to-b from-espresso-950/50 via-espresso-950/65 to-espresso-900/95"></div>
            </div>
          }
          <div class="relative flex items-center justify-between gap-3 overflow-hidden px-5 py-4 lg:flex-col lg:justify-start lg:px-6 lg:pt-10 lg:pb-8">
            @if (cover(); as coverUrl) {
              <img [src]="coverUrl" alt="" aria-hidden="true" class="cover-image absolute inset-0 hidden h-full w-full object-cover opacity-40 lg:block" />
              <div class="absolute inset-0 hidden bg-linear-to-b from-espresso-900/40 to-espresso-900 lg:block"></div>
            }
            <div class="relative hidden items-center gap-3 lg:flex lg:flex-col lg:gap-4 lg:text-center">
              <div class="rounded-full ring-2 ring-accent-500/40 ring-offset-4 ring-offset-espresso-900">
                <app-avatar [name]="cafeName()" [imageUrl]="menu.cafe.logoUrl" [size]="avatarSize" />
              </div>
              <div class="flex flex-col gap-2 lg:items-center">
                <p class="font-display text-xl leading-tight text-white lg:text-2xl">{{ cafeName() }}</p>
                @if (table()) {
                  <span class="self-center rounded-full bg-accent-500 px-3 py-1 text-sm font-semibold text-white">
                    {{ label('table') }} {{ table() }}
                  </span>
                }
                @if (t(menu.cafe.descriptionTranslations); as description) {
                  <div class="hidden lg:block">
                    <p class="line-clamp-3 text-sm leading-snug text-espresso-100/60">{{ description }}</p>
                  </div>
                }
              </div>
            </div>
            <div class="relative flex min-w-0 items-center gap-3 lg:hidden">
              <div class="shrink-0 rounded-full ring-2 ring-white/30">
                <app-avatar [name]="cafeName()" [imageUrl]="menu.cafe.logoUrl" [size]="44" />
              </div>
              <div class="flex min-w-0 flex-col items-start gap-1">
                <span class="truncate font-display text-xl leading-tight text-white drop-shadow">{{ cafeName() }}</span>
                @if (table()) {
                  <span class="rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {{ label('table') }} {{ table() }}
                  </span>
                }
              </div>
            </div>
            <div class="relative flex gap-1 lg:hidden">
              @for (language of menu.languages; track language.value) {
                <button type="button" (click)="setLanguage(language.value)" [class]="languageClasses(language.value)">
                  {{ language.value.toUpperCase() }}
                </button>
              }
            </div>
          </div>

          @if (hasInfo()) {
            <div class="relative flex gap-2 overflow-x-auto px-4 pb-3 text-xs text-espresso-100/90
                        lg:order-2 lg:flex-col lg:gap-2.5 lg:overflow-visible lg:border-t lg:border-espresso-800 lg:px-5 lg:py-4 lg:text-sm">
              @if (menu.cafe.workingHours) {
                <span [class]="infoItemClasses" [attr.title]="label('hours')">
                  <app-icon name="clock" [size]="15" class="shrink-0 text-accent-500" />
                  {{ menu.cafe.workingHours }}
                </span>
              }
              @if (menu.cafe.wifiName) {
                <span [class]="infoItemClasses" [attr.title]="label('wifi')">
                  <app-icon name="wifi" [size]="15" class="shrink-0 text-accent-500" />
                  <span>
                    {{ menu.cafe.wifiName }}
                    @if (menu.cafe.wifiPassword) {
                      <span class="text-espresso-100/50">·</span>
                      <span class="font-mono font-semibold text-white">{{ menu.cafe.wifiPassword }}</span>
                    }
                  </span>
                </span>
              }
              @if (menu.cafe.phone) {
                <a [href]="'tel:' + menu.cafe.phone" [class]="infoItemClasses + ' hover:text-white'" [attr.title]="label('phone')">
                  <app-icon name="phone" [size]="15" class="shrink-0 text-accent-500" />
                  {{ menu.cafe.phone }}
                </a>
              }
              @if (menu.cafe.address) {
                <span [class]="infoItemClasses" [attr.title]="label('address')">
                  <app-icon name="map-pin" [size]="15" class="shrink-0 text-accent-500" />
                  <span class="max-w-52 truncate lg:max-w-none lg:whitespace-normal">{{ menu.cafe.address }}</span>
                </span>
              }
              @if (socials().length) {
                <span class="flex shrink-0 items-center gap-1.5 lg:pt-1">
                  @for (social of socials(); track social.key) {
                    <a [href]="social.url" target="_blank" rel="noopener noreferrer" [attr.aria-label]="social.label" [attr.title]="social.label"
                       class="flex h-8 w-8 items-center justify-center rounded-full bg-espresso-800 text-espresso-100 transition hover:bg-accent-500 hover:text-white">
                      <app-icon [name]="social.icon" [size]="16" />
                    </a>
                  }
                </span>
              }
            </div>
          }

          <nav class="relative flex gap-2 overflow-x-auto px-4 pb-4 lg:order-1 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-y-auto">
            @for (category of menu.categories; track category.slug) {
              <button
                type="button"
                (click)="selectCategory(category.slug)"
                class="shrink-0 rounded-2xl px-5 py-3 text-left text-base font-medium whitespace-nowrap transition lg:py-3.5 lg:text-lg"
                [class]="!searching() && selectedSlug() === category.slug
                  ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
                  : 'text-espresso-100/90 hover:bg-white/10 hover:text-white'"
              >
                {{ t(category.nameTranslations) }}
              </button>
            }
          </nav>

          <div class="relative hidden items-center justify-between border-t border-espresso-800 px-5 py-4 lg:order-3 lg:flex">
            <div class="flex gap-1">
              @for (language of menu.languages; track language.value) {
                <button type="button" (click)="setLanguage(language.value)" [class]="languageClasses(language.value)">
                  {{ language.value.toUpperCase() }}
                </button>
              }
            </div>
            <button type="button" (click)="toggleFullscreen()" [attr.aria-label]="label('fullscreen')" [attr.title]="label('fullscreen')"
                    class="rounded-lg p-2 text-espresso-300 transition hover:bg-espresso-800 hover:text-white">
              <app-icon name="maximize" [size]="20" />
            </button>
          </div>
        </aside>

        <main class="px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
          @if (menu.categories.length === 0) {
            <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
              <app-icon name="utensils" [size]="48" class="text-accent-500" />
              <p class="font-display text-3xl text-espresso-900">{{ label('empty') }}</p>
            </div>
          } @else {
            <header class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 class="font-display text-4xl font-semibold text-espresso-900 md:text-5xl">{{ title() }}</h2>
                <p class="mt-2 font-display text-lg text-espresso-400">{{ shownProducts().length }} {{ label('items') }}</p>
              </div>
              <div class="relative w-full lg:w-96">
                <app-icon name="search" [size]="20" class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-espresso-300" />
                <input
                  type="search"
                  [placeholder]="label('search')"
                  [value]="search()"
                  (input)="search.set($any($event.target).value)"
                  class="h-14 w-full rounded-2xl border border-line-strong bg-white pr-4 pl-12 text-base text-espresso-900
                         placeholder:text-espresso-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none"
                />
              </div>
            </header>

            @if (shownProducts().length === 0) {
              <p class="py-20 text-center font-display text-2xl text-espresso-400">{{ label('nothing') }}</p>
            }

            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              @for (product of shownProducts(); track product.slug) {
                <button
                  type="button"
                  (click)="openProduct(product)"
                  class="group flex flex-col overflow-hidden rounded-[1.25rem] border border-line bg-white p-2.5 text-left shadow-card
                         transition hover:-translate-y-0.5 hover:shadow-pop focus-visible:ring-4 focus-visible:ring-accent-100 focus-visible:outline-none"
                >
                  <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-espresso-50">
                    @if (image(product); as url) {
                      <img [src]="url" [alt]="t(product.nameTranslations)" loading="lazy"
                           class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                           [class.grayscale]="!product.available" [class.opacity-60]="!product.available" />
                    } @else {
                      <div class="coffee-pattern flex h-full items-center justify-center bg-espresso-800">
                        <app-icon name="utensils" [size]="40" class="text-accent-500/70" />
                      </div>
                    }
                    <ng-container *ngTemplateOutlet="badges; context: { $implicit: product }" />
                    @if (!product.available) {
                      <span class="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-espresso-500 shadow-sm">
                        {{ label('sold_out') }}
                      </span>
                    }
                  </div>
                  <div class="flex flex-1 flex-col px-2.5 pt-4 pb-2" [class.opacity-60]="!product.available">
                    <h3 class="font-display text-xl font-semibold text-espresso-900">{{ t(product.nameTranslations) }}</h3>
                    @if (t(product.descriptionTranslations); as description) {
                      <p class="mt-1.5 line-clamp-2 font-display text-[15px] leading-relaxed text-espresso-400">{{ description }}</p>
                    }
                    <div class="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3.5">
                      <span class="font-display text-base whitespace-nowrap text-espresso-400">{{ product.portion }}</span>
                      <span class="flex flex-col items-end">
                        @if (product.discountPrice !== null) {
                          <span class="font-display text-sm whitespace-nowrap text-espresso-300 line-through">{{ price(product.price) }}</span>
                        }
                        <span class="font-display text-xl font-semibold whitespace-nowrap"
                              [class]="product.available ? (product.discountPrice !== null ? 'text-red-600' : 'text-accent-600') : 'text-espresso-400'">
                          {{ price(product.discountPrice ?? product.price) }}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              }
            </div>
          }
        </main>
      </div>

      @if (openedProduct(); as product) {
        <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-8" role="dialog" aria-modal="true">
          <div class="absolute inset-0 bg-espresso-950/60 backdrop-blur-sm" (click)="openedProduct.set(null)"></div>
          <div class="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl md:flex-row">
            <div class="relative aspect-[4/3] shrink-0 bg-espresso-50 md:aspect-auto md:w-1/2">
              @if (image(product); as url) {
                <img [src]="url" [alt]="t(product.nameTranslations)" class="h-full w-full object-cover" [class.grayscale]="!product.available" />
              } @else {
                <div class="coffee-pattern flex h-full min-h-64 items-center justify-center bg-espresso-800">
                  <app-icon name="utensils" [size]="56" class="text-accent-500/70" />
                </div>
              }
              <ng-container *ngTemplateOutlet="badges; context: { $implicit: product }" />
            </div>
            <div class="flex flex-1 flex-col overflow-y-auto p-7 md:p-9">
              <button type="button" (click)="openedProduct.set(null)" [attr.aria-label]="label('close')"
                      class="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-espresso-500 shadow-sm hover:text-espresso-900">
                <app-icon name="x" [size]="22" />
              </button>
              @if (!product.available) {
                <span class="mb-3 self-start rounded-full bg-espresso-50 px-3 py-1 text-sm font-medium text-espresso-500">
                  {{ label('sold_out') }}
                </span>
              }
              <h3 class="font-display text-3xl font-semibold text-espresso-900 md:text-4xl">{{ t(product.nameTranslations) }}</h3>
              @if (t(product.descriptionTranslations); as description) {
                <p class="mt-4 font-display text-lg leading-relaxed text-espresso-500">{{ description }}</p>
              }
              <div class="mt-auto flex items-end justify-between gap-4 border-t border-line pt-6">
                <span class="font-display text-lg text-espresso-400">{{ product.portion }}</span>
                <span class="flex flex-col items-end">
                  @if (product.discountPrice !== null) {
                    <span class="font-display text-lg text-espresso-300 line-through">{{ price(product.price) }}</span>
                    <span class="font-display text-3xl font-semibold text-red-600">{{ price(product.discountPrice) }}</span>
                  } @else {
                    <span class="font-display text-3xl font-semibold text-accent-600">{{ price(product.price) }}</span>
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      }

      <ng-template #badges let-product>
        @if (product.discountPrice !== null || product.tags.length) {
          <div class="pointer-events-none absolute top-3 left-3 flex max-w-[70%] flex-wrap gap-1.5">
            @if (product.discountPrice !== null) {
              <span class="rounded-full bg-red-600 px-2.5 py-1 text-sm font-bold text-white shadow-sm">
                −{{ percent(product) }}%
              </span>
            }
            @for (tag of product.tags; track tag) {
              @let meta = tagMeta(tag);
              <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold shadow-sm" [class]="meta.classes">
                <app-icon [name]="meta.icon" [size]="14" />
                {{ label(meta.labelKey) }}
              </span>
            }
          </div>
        }
      </ng-template>

    }
    </div>
  `
})
export class TabletMenuComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly publicMenuService = inject(PublicMenuService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cafeSlug = this.route.snapshot.paramMap.get('cafeSlug') ?? '';

  protected readonly avatarSize = 72;
  protected readonly menu = signal<PublicMenuResponseDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly language = signal<string>('uz');
  protected readonly selectedSlug = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly openedProduct = signal<PublicProductDto | null>(null);
  protected readonly infoItemClasses =
    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/35 px-3 py-1.5 backdrop-blur-sm lg:items-start lg:whitespace-normal lg:rounded-none lg:bg-transparent lg:p-0';

  protected readonly table = signal<number | null>(this.parseTable(this.route.snapshot.queryParamMap.get(MENU_TABLE_QUERY_PARAM)));

  protected readonly themeStyle = computed(() => menuThemeStyle(this.menu()?.cafe.theme));
  protected readonly socials = computed(() => filledSocialLinks(this.menu()?.cafe.socialLinks));
  protected readonly hasInfo = computed(() => {
    const cafe = this.menu()?.cafe;
    return !!cafe && !!(cafe.address || cafe.phone || cafe.email || cafe.workingHours || cafe.wifiName
      || this.socials().length || this.t(cafe.descriptionTranslations));
  });

  protected readonly searching = computed(() => this.search().trim().length > 0);
  protected readonly cafeName = computed(() => this.t(this.menu()?.cafe.nameTranslations ?? null));
  protected readonly cover = computed(() => mediaUrl(this.menu()?.cafe.coverUrl ?? null));

  protected readonly selectedCategory = computed(() =>
    this.menu()?.categories.find((category) => category.slug === this.selectedSlug()) ?? null);

  protected readonly title = computed(() =>
    this.searching() ? this.label('results') : this.t(this.selectedCategory()?.nameTranslations ?? null));

  protected readonly shownProducts = computed<PublicProductDto[]>(() => {
    const menu = this.menu();
    if (!menu) {
      return [];
    }
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.selectedCategory()?.products ?? [];
    }
    return menu.categories
      .flatMap((category) => category.products)
      .filter((product) => Object.values(product.nameTranslations).some((name) => name.toLowerCase().includes(query)));
  });

  ngOnInit(): void {
    this.load(true);
    interval(MENU_REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(false));
  }

  protected t(translations: Record<string, string> | null): string {
    return translate(translations, this.language(), this.menu()?.defaultLanguage);
  }

  protected label(key: string): string {
    return this.t(this.menu()?.labels?.[key] ?? null) || FALLBACK_LABELS[key] || key;
  }

  protected price(value: number): string {
    return formatPrice(value);
  }

  protected image(product: PublicProductDto): string | null {
    return mediaUrl(product.imageUrl);
  }

  protected tagMeta(tag: ProductTag): ProductTagMeta {
    return productTagMeta(tag);
  }

  protected percent(product: PublicProductDto): number {
    return discountPercent(product.price, product.discountPrice);
  }

  protected languageClasses(code: string): string {
    return [
      'rounded-lg px-2.5 py-1.5 text-sm font-semibold transition',
      this.language() === code ? 'bg-accent-500/15 text-accent-500 ring-1 ring-accent-500' : 'text-espresso-300 hover:text-white'
    ].join(' ');
  }

  protected setLanguage(code: string): void {
    this.language.set(code);
    try {
      localStorage.setItem(STORAGE_KEY_MENU_LANGUAGE, code);
    } catch {
    }
  }

  protected selectCategory(slug: string): void {
    this.search.set('');
    this.selectedSlug.set(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected openProduct(product: PublicProductDto): void {
    this.openedProduct.set(product);
  }

  protected toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }

  private load(initial: boolean): void {
    this.publicMenuService.get(this.cafeSlug).subscribe({
      next: (response) => {
        const menu = response.data ?? null;
        this.menu.set(menu);
        if (menu) {
          if (initial) {
            this.language.set(this.initialLanguage(menu));
          }
          const stillExists = menu.categories.some((category) => category.slug === this.selectedSlug());
          if (!stillExists) {
            this.selectedSlug.set(menu.categories[0]?.slug ?? null);
          }
        }
        this.loading.set(false);
      },
      error: (error) => {
        if (initial) {
          this.loading.set(false);
          this.errorMessage.set(error?.error?.message ?? 'Menyu topilmadi');
        }
      }
    });
  }

  private parseTable(raw: string | null): number | null {
    const table = Number(raw);
    return Number.isInteger(table) && table > 0 && table < 10000 ? table : null;
  }

  private initialLanguage(menu: PublicMenuResponseDto): string {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY_MENU_LANGUAGE);
    } catch {
      saved = null;
    }
    const available = menu.languages.map((language) => language.value);
    return saved && available.includes(saved) ? saved : menu.defaultLanguage;
  }
}
