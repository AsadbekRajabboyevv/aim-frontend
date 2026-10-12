import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CafeResponseDto } from '../../../core/models/cafe.model';
import { MenuCategoryResponseDto, ProductResponseDto, ProductTag } from '../../../core/models/menu.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { MenuCategoryService } from '../../../core/services/menu-category.service';
import { ProductService } from '../../../core/services/product.service';
import { mediaUrl } from '../../../core/utils/media-url.util';
import { uiName, uiPrice } from '../../../core/utils/ui-format.util';
import { ProductTagMeta, discountPercent, productTagMeta } from '../../../core/utils/product-tag.util';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { CategoryFormComponent } from './category-form.component';
import { ProductFormComponent } from './product-form.component';

@Component({
  selector: 'app-menu-manager',
  standalone: true,
  imports: [
    RouterLink, PageHeaderComponent, ButtonComponent, IconComponent, BadgeComponent, ToggleComponent,
    CategoryFormComponent, ProductFormComponent, TranslatePipe
  ],
  template: `
    <app-page-header
      [title]="cafeName() ? cafeName() + ' — ' + ('cafes.action.menu' | t) : ('cafes.action.menu' | t)"
      [subtitle]="'menu_manager.counts' | t: { categories: categories().length, products: products().length }"
      [backLink]="returnLink()"
      [backLabel]="'cafe_editor.back' | t"
    >
      <a
        [routerLink]="[returnLink(), cafeSlug(), 'stop-list']"
        class="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold
               text-espresso-800 transition hover:bg-espresso-50"
      >
        <app-icon name="ban" [size]="18" />
        {{ 'cafes.action.stop_list' | t }}
      </a>
      <a
        [routerLink]="[returnLink(), cafeSlug(), 'qr']"
        class="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold
               text-espresso-800 transition hover:bg-espresso-50"
      >
        <app-icon name="qr" [size]="18" />
        {{ 'cafes.action.qr' | t }}
      </a>
      <a
        [href]="'/menu/' + cafeSlug()"
        target="_blank"
        rel="noopener"
        class="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold
               text-espresso-800 transition hover:bg-espresso-50"
      >
        <app-icon name="external" [size]="18" />
        {{ 'menu_manager.open_menu' | t }}
      </a>
      <app-button icon="plus" [disabled]="categories().length === 0" (clicked)="openProductForm(null)">{{ 'menu_manager.new_product' | t }}</app-button>
    </app-page-header>

    @if (errorMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t" class="text-red-400 hover:text-red-700">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    @if (infoMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <app-icon name="info" [size]="18" class="mt-px" />
        <span class="flex-1">{{ infoMessage() }}</span>
        <button type="button" (click)="infoMessage.set('')" [attr.aria-label]="'common.close' | t" class="text-emerald-500 hover:text-emerald-800">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    @if (loading()) {
      <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div class="h-96 animate-pulse rounded-card bg-surface"></div>
        <div class="h-96 animate-pulse rounded-card bg-surface"></div>
      </div>
    } @else {
      <div class="grid items-start gap-6 lg:grid-cols-[300px_1fr]">

        <aside class="rounded-card border border-line bg-surface p-3 shadow-card lg:sticky lg:top-6">
          <h2 class="px-3 pt-2 pb-3 text-base font-semibold text-espresso-900">{{ 'menu_manager.categories' | t }}</h2>

          <ul class="flex flex-col gap-1">
            @for (category of categories(); track category.slug; let first = $first; let last = $last) {
              <li
                class="group flex items-center gap-2 rounded-xl border-l-4 px-3 py-2.5 transition"
                [class]="selectedSlug() === category.slug
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-transparent hover:bg-canvas'"
              >
                <button type="button" (click)="selectedSlug.set(category.slug)" class="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span class="truncate text-sm font-medium"
                        [class]="category.active ? 'text-espresso-900' : 'text-espresso-300 line-through'">
                    {{ name(category.nameTranslations) }}
                  </span>
                  <span class="ml-auto rounded-md bg-espresso-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-espresso-500">
                    {{ category.productCount }}
                  </span>
                </button>
                <div class="flex items-center opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                  <button type="button" [disabled]="first" (click)="move(category, -1)" [attr.aria-label]="'common.move_up' | t"
                          class="rounded-md p-1 text-espresso-300 hover:bg-surface hover:text-espresso-700 disabled:opacity-30">
                    <app-icon name="arrow-up" [size]="15" />
                  </button>
                  <button type="button" [disabled]="last" (click)="move(category, 1)" [attr.aria-label]="'common.move_down' | t"
                          class="rounded-md p-1 text-espresso-300 hover:bg-surface hover:text-espresso-700 disabled:opacity-30">
                    <app-icon name="arrow-down" [size]="15" />
                  </button>
                  <button type="button" (click)="openCategoryForm(category)" [attr.aria-label]="'common.edit' | t"
                          class="rounded-md p-1 text-espresso-300 hover:bg-surface hover:text-espresso-700">
                    <app-icon name="pencil" [size]="15" />
                  </button>
                  <button type="button" (click)="deleteCategory(category)" [attr.aria-label]="'common.delete' | t"
                          class="rounded-md p-1 text-espresso-300 hover:bg-surface hover:text-red-600">
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              </li>
            } @empty {
              <li class="px-3 py-6 text-center text-sm text-espresso-400">{{ 'menu_manager.no_categories' | t }}</li>
            }
          </ul>

          <button
            type="button"
            (click)="openCategoryForm(null)"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent-200
                   py-3 text-sm font-semibold text-accent-600 transition hover:border-accent-500 hover:bg-accent-50/50"
          >
            <app-icon name="plus" [size]="18" />
            {{ 'menu_manager.add_category' | t }}
          </button>
        </aside>

        <section>
          @if (categories().length === 0) {
            <div class="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center shadow-card">
              <span class="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-accent-500">
                <app-icon name="folder" [size]="30" />
              </span>
              <p class="text-lg font-semibold text-espresso-900">{{ 'menu_manager.start.title' | t }}</p>
              <p class="max-w-sm text-sm text-espresso-400">{{ 'menu_manager.start.text' | t }}</p>
              <app-button icon="plus" class="mt-2" (clicked)="openCategoryForm(null)">{{ 'menu_manager.add_category' | t }}</app-button>
            </div>
          } @else {
            @if (visibleProducts().length > 1) {
              <p class="mb-3 flex items-center gap-1.5 text-sm text-espresso-400">
                <app-icon name="grip" [size]="16" />
                {{ 'menu_manager.drag_hint' | t }}
              </p>
            }
            <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              @for (product of visibleProducts(); track product.slug; let index = $index) {
                <article [attr.data-product-slug]="product.slug"
                         class="flex flex-col overflow-hidden rounded-card border bg-surface shadow-card transition"
                         [class]="draggingSlug() === product.slug
                           ? 'z-10 scale-[1.02] border-accent-500 opacity-80 shadow-pop ring-4 ring-accent-100'
                           : 'border-line'"
                         [class.opacity-60]="!product.active && draggingSlug() !== product.slug">
                  <div class="relative aspect-[4/3] bg-espresso-50">
                    @if (image(product); as url) {
                      <img [src]="url" alt="" draggable="false" class="h-full w-full object-cover" [class.grayscale]="!product.available" />
                    } @else {
                      <div class="flex h-full items-center justify-center text-espresso-300">
                        <app-icon name="utensils" [size]="34" />
                      </div>
                    }
                    <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-14">
                      @if (!product.active) {
                        <app-badge tone="neutral">{{ 'menu_manager.hidden' | t }}</app-badge>
                      }
                      @for (tag of product.tags; track tag) {
                        @let meta = tagMeta(tag);
                        <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm" [class]="meta.classes">
                          <app-icon [name]="meta.icon" [size]="12" />
                          {{ meta.uiKey | t }}
                        </span>
                      }
                    </div>
                    <button type="button"
                            (pointerdown)="startDrag($event, product)"
                            (keydown)="moveWithKeyboard($event, product, index)"
                            [attr.aria-label]="'menu_manager.reorder_label' | t: { name: name(product.nameTranslations) }"
                            [title]="'menu_manager.reorder_hint' | t"
                            class="absolute top-2.5 right-2.5 flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-full
                                   bg-surface/95 text-espresso-500 shadow-sm transition hover:text-espresso-900 focus-visible:ring-4
                                   focus-visible:ring-accent-100 focus-visible:outline-none active:cursor-grabbing">
                      <app-icon name="grip" [size]="18" />
                    </button>
                  </div>
                  <div class="flex flex-1 flex-col p-4">
                    <h3 class="font-semibold text-espresso-900">{{ name(product.nameTranslations) }}</h3>
                    @if (product.discountPrice !== null) {
                      <p class="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span class="text-lg font-bold text-accent-600">{{ price(product.discountPrice) }}</span>
                        <span class="text-sm text-espresso-300 line-through">{{ price(product.price) }}</span>
                        <span class="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-600">
                          −{{ percent(product) }}%
                        </span>
                      </p>
                    } @else {
                      <p class="mt-1 text-lg font-bold text-espresso-900">{{ price(product.price) }}</p>
                    }
                    @if (product.portion) {
                      <p class="text-sm text-espresso-400">{{ product.portion }}</p>
                    }
                    <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                      <div class="flex items-center gap-2">
                        <app-toggle [checked]="product.available" [ariaLabel]="'menu_manager.available_label' | t: { name: name(product.nameTranslations) }"
                                    (checkedChange)="setAvailability(product, $event)" />
                        <span class="text-xs font-medium" [class]="product.available ? 'text-espresso-500' : 'text-red-500'">
                          {{ (product.available ? 'menu_manager.available' : 'menu_manager.sold_out') | t }}
                        </span>
                      </div>
                      <div class="flex items-center gap-0.5">
                        <button type="button" (click)="openProductForm(product)" [attr.aria-label]="'common.edit' | t" [title]="'common.edit' | t"
                                class="rounded-lg p-2 text-espresso-400 transition hover:bg-espresso-50 hover:text-espresso-900">
                          <app-icon name="pencil" [size]="17" />
                        </button>
                        <button type="button" (click)="copyProduct(product)" [disabled]="copyingSlug() === product.slug"
                                [attr.aria-label]="'menu_manager.duplicate' | t" [title]="'menu_manager.duplicate' | t"
                                class="rounded-lg p-2 text-espresso-400 transition hover:bg-espresso-50 hover:text-espresso-900 disabled:opacity-40">
                          <app-icon name="copy" [size]="17" />
                        </button>
                        <button type="button" (click)="deleteProduct(product)" [attr.aria-label]="'common.delete' | t" [title]="'common.delete' | t"
                                class="rounded-lg p-2 text-espresso-400 transition hover:bg-red-50 hover:text-red-600">
                          <app-icon name="trash" [size]="17" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              }

              <button
                type="button"
                (click)="openProductForm(null)"
                class="flex min-h-72 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-accent-200
                       bg-surface/40 p-6 text-center transition hover:border-accent-500 hover:bg-accent-50/50"
              >
                <span class="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-500">
                  <app-icon name="plus" [size]="28" [strokeWidth]="2" />
                </span>
                <span class="font-semibold text-espresso-900">{{ 'menu_manager.add_product' | t }}</span>
                @if (selectedCategory(); as category) {
                  <span class="text-sm text-espresso-400">{{ 'menu_manager.to_category' | t: { name: name(category.nameTranslations) } }}</span>
                }
              </button>
            </div>
          }
        </section>
      </div>
    }

    @if (categoryFormOpen()) {
      <app-category-form
        [cafeSlug]="cafeSlug()"
        [category]="editingCategory()"
        (saved)="onCategorySaved($event)"
        (cancelled)="categoryFormOpen.set(false)"
      />
    }

    @if (productFormOpen()) {
      <app-product-form
        [cafeSlug]="cafeSlug()"
        [categories]="categories()"
        [product]="editingProduct()"
        [defaultCategorySlug]="selectedSlug()"
        (saved)="onProductSaved($event)"
        (cancelled)="productFormOpen.set(false)"
      />
    }
  `
})
export class MenuManagerComponent implements OnInit, OnDestroy {

  private readonly cafeService = inject(CafeService);
  private readonly categoryService = inject(MenuCategoryService);
  private readonly productService = inject(ProductService);
  private readonly i18n = inject(I18nService);

  readonly cafeSlug = input.required<string>();
  readonly returnLink = input.required<string>();

  protected readonly cafe = signal<CafeResponseDto | null>(null);
  protected readonly categories = signal<MenuCategoryResponseDto[]>([]);
  protected readonly products = signal<ProductResponseDto[]>([]);
  protected readonly selectedSlug = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly infoMessage = signal('');
  protected readonly copyingSlug = signal<string | null>(null);

  protected readonly draggingSlug = signal<string | null>(null);
  private dragOrderBefore: string[] = [];
  private readonly onDragMove = (event: PointerEvent) => this.dragMove(event);
  private readonly onDragEnd = () => this.endDrag();

  protected readonly categoryFormOpen = signal(false);
  protected readonly editingCategory = signal<MenuCategoryResponseDto | null>(null);
  protected readonly productFormOpen = signal(false);
  protected readonly editingProduct = signal<ProductResponseDto | null>(null);

  protected readonly cafeName = computed(() => (this.cafe() ? this.name(this.cafe()!.nameTranslations) : ''));
  protected readonly selectedCategory = computed(() =>
    this.categories().find((category) => category.slug === this.selectedSlug()) ?? null);
  protected readonly visibleProducts = computed(() =>
    this.products().filter((product) => product.categorySlug === this.selectedSlug()));

  ngOnInit(): void {
    forkJoin({
      cafe: this.cafeService.getBySlug(this.cafeSlug()),
      categories: this.categoryService.get(this.cafeSlug()),
      products: this.productService.get(this.cafeSlug())
    }).subscribe({
      next: ({ cafe, categories, products }) => {
        this.cafe.set(cafe.data ?? null);
        this.categories.set(categories.data ?? []);
        this.products.set(products.data ?? []);
        this.selectedSlug.set(categories.data?.[0]?.slug ?? null);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('menu_manager.error.load'));
      }
    });
  }

  protected name(translations: Record<string, string> | null): string {
    return uiName(translations);
  }

  protected price(value: number): string {
    return uiPrice(value);
  }

  protected image(product: ProductResponseDto): string | null {
    return mediaUrl(product.imageUrl);
  }

  protected tagMeta(tag: ProductTag): ProductTagMeta {
    return productTagMeta(tag);
  }

  protected percent(product: ProductResponseDto): number {
    return discountPercent(product.price, product.discountPrice);
  }

  ngOnDestroy(): void {
    this.detachDragListeners();
  }

  protected openCategoryForm(category: MenuCategoryResponseDto | null): void {
    this.editingCategory.set(category);
    this.categoryFormOpen.set(true);
  }

  protected onCategorySaved(saved: MenuCategoryResponseDto): void {
    this.categoryFormOpen.set(false);
    const exists = this.categories().some((category) => category.slug === saved.slug);
    this.categories.update((list) => exists
      ? list.map((category) => (category.slug === saved.slug ? saved : category))
      : [...list, saved]);
    if (!exists) {
      this.selectedSlug.set(saved.slug);
    }
  }

  protected move(category: MenuCategoryResponseDto, direction: -1 | 1): void {
    const list = [...this.categories()];
    const index = list.findIndex((item) => item.slug === category.slug);
    const target = index + direction;
    if (target < 0 || target >= list.length) {
      return;
    }
    [list[index], list[target]] = [list[target], list[index]];
    const previous = this.categories();
    this.categories.set(list);
    this.categoryService.reorder(this.cafeSlug(), list.map((item) => item.slug)).subscribe({
      error: (error) => {
        this.categories.set(previous);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('menu_manager.error.reorder'));
      }
    });
  }

  protected deleteCategory(category: MenuCategoryResponseDto): void {
    if (!confirm(this.i18n.t('menu_manager.confirm_delete_category', { name: this.name(category.nameTranslations) }))) {
      return;
    }
    this.categoryService.delete(this.cafeSlug(), category.slug).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((item) => item.slug !== category.slug));
        if (this.selectedSlug() === category.slug) {
          this.selectedSlug.set(this.categories()[0]?.slug ?? null);
        }
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  protected openProductForm(product: ProductResponseDto | null): void {
    this.editingProduct.set(product);
    this.productFormOpen.set(true);
  }

  protected onProductSaved(saved: ProductResponseDto): void {
    this.productFormOpen.set(false);
    const previous = this.products().find((product) => product.slug === saved.slug);
    this.products.update((list) => previous
      ? list.map((product) => (product.slug === saved.slug ? saved : product))
      : [...list, saved]);
    if (!previous || previous.categorySlug !== saved.categorySlug) {
      this.adjustCount(previous?.categorySlug ?? null, -1);
      this.adjustCount(saved.categorySlug, 1);
    }
    this.selectedSlug.set(saved.categorySlug);
  }

  protected setAvailability(product: ProductResponseDto, available: boolean): void {
    this.replaceProduct({ ...product, available });
    this.productService.updateAvailability(this.cafeSlug(), product.slug, available).subscribe({
      error: (error) => {
        this.replaceProduct(product);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }

  protected copyProduct(product: ProductResponseDto): void {
    this.copyingSlug.set(product.slug);
    this.productService.copy(this.cafeSlug(), product.slug).subscribe({
      next: (response) => {
        this.copyingSlug.set(null);
        const copy = response.data;
        if (!copy) {
          return;
        }
        const list = this.products().filter((item) => item.categorySlug === copy.categorySlug);
        list.splice(list.findIndex((item) => item.slug === product.slug) + 1, 0, copy);
        this.setCategoryOrder(copy.categorySlug, list, this.products());
        this.adjustCount(copy.categorySlug, 1);
        this.infoMessage.set(this.i18n.t('menu_manager.duplicated'));
        this.openProductForm(copy);
      },
      error: (error) => {
        this.copyingSlug.set(null);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('menu_manager.error.duplicate'));
      }
    });
  }

  protected startDrag(event: PointerEvent, product: ProductResponseDto): void {
    if (event.button !== 0 || this.draggingSlug()) {
      return;
    }
    event.preventDefault();
    this.dragOrderBefore = this.visibleProducts().map((item) => item.slug);
    this.draggingSlug.set(product.slug);
    window.addEventListener('pointermove', this.onDragMove);
    window.addEventListener('pointerup', this.onDragEnd);
    window.addEventListener('pointercancel', this.onDragEnd);
  }

  protected moveWithKeyboard(event: KeyboardEvent, product: ProductResponseDto, index: number): void {
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0;
    const list = this.visibleProducts();
    const target = index + step;
    if (step === 0 || target < 0 || target >= list.length) {
      return;
    }
    event.preventDefault();
    const before = list.map((item) => item.slug);
    this.moveProduct(product.slug, list[target].slug);
    this.saveProductOrder(before);
    setTimeout(() => (document.querySelector(`[data-product-slug="${product.slug}"] button`) as HTMLElement | null)?.focus());
  }

  private dragMove(event: PointerEvent): void {
    const dragging = this.draggingSlug();
    if (!dragging) {
      return;
    }
    const edge = 80;
    if (event.clientY < edge) {
      window.scrollBy(0, -12);
    } else if (event.clientY > window.innerHeight - edge) {
      window.scrollBy(0, 12);
    }
    const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-product-slug]');
    const targetSlug = card?.getAttribute('data-product-slug');
    if (targetSlug && targetSlug !== dragging) {
      this.moveProduct(dragging, targetSlug);
    }
  }

  private endDrag(): void {
    if (!this.draggingSlug()) {
      return;
    }
    this.detachDragListeners();
    this.draggingSlug.set(null);
    this.saveProductOrder(this.dragOrderBefore);
  }

  private detachDragListeners(): void {
    window.removeEventListener('pointermove', this.onDragMove);
    window.removeEventListener('pointerup', this.onDragEnd);
    window.removeEventListener('pointercancel', this.onDragEnd);
  }

  private moveProduct(slug: string, targetSlug: string): void {
    const category = this.selectedSlug();
    if (!category) {
      return;
    }
    const list = [...this.visibleProducts()];
    const from = list.findIndex((item) => item.slug === slug);
    const to = list.findIndex((item) => item.slug === targetSlug);
    if (from < 0 || to < 0) {
      return;
    }
    list.splice(to, 0, list.splice(from, 1)[0]);
    this.setCategoryOrder(category, list, this.products());
  }

  private saveProductOrder(before: string[]): void {
    const category = this.selectedSlug();
    const after = this.visibleProducts().map((item) => item.slug);
    if (!category || after.join() === before.join()) {
      return;
    }
    this.productService.reorder(this.cafeSlug(), category, after).subscribe({
      error: (error) => {
        const bySlug = new Map(this.visibleProducts().map((item) => [item.slug, item]));
        this.setCategoryOrder(category, before.map((slug) => bySlug.get(slug)!).filter(Boolean), this.products());
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('menu_manager.error.reorder'));
      }
    });
  }

  private setCategoryOrder(categorySlug: string, ordered: ProductResponseDto[], all: ProductResponseDto[]): void {
    const others = all.filter((item) => item.categorySlug !== categorySlug);
    this.products.set([...others, ...ordered.map((item, index) => ({ ...item, sortOrder: index }))]);
  }

  protected deleteProduct(product: ProductResponseDto): void {
    if (!confirm(this.i18n.t('menu_manager.confirm_delete_product', { name: this.name(product.nameTranslations) }))) {
      return;
    }
    this.productService.delete(this.cafeSlug(), product.slug).subscribe({
      next: () => {
        this.products.update((list) => list.filter((item) => item.slug !== product.slug));
        this.adjustCount(product.categorySlug, -1);
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  private replaceProduct(updated: ProductResponseDto): void {
    this.products.update((list) => list.map((product) => (product.slug === updated.slug ? updated : product)));
  }

  private adjustCount(categorySlug: string | null, delta: number): void {
    if (!categorySlug) {
      return;
    }
    this.categories.update((list) => list.map((category) => category.slug === categorySlug
      ? { ...category, productCount: Math.max(category.productCount + delta, 0) }
      : category));
  }
}
