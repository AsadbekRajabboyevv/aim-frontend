import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DiscountRequestDto, DiscountResponseDto } from '../../core/models/discount.model';
import { DropdownDto } from '../../core/models/dropdown.model';
import { ProductResponseDto } from '../../core/models/menu.model';
import { DiscountService } from '../../core/services/discount.service';
import { I18nService } from '../../core/services/i18n.service';
import { ProductService } from '../../core/services/product.service';
import { uiName, uiPrice } from '../../core/utils/ui-format.util';
import { discountPercent } from '../../core/utils/product-tag.util';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { ToggleComponent } from '../../shared/components/toggle/toggle.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const QUICK_PERCENTS = [10, 15, 20, 25, 30, 50];

function toLocalInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

@Component({
  selector: 'app-discount-form',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, SelectComponent, ToggleComponent, ButtonComponent, IconComponent, TranslatePipe],
  template: `
    <app-modal [title]="(discount() ? 'discounts.form.title_edit' : 'discounts.new') | t"
               [subtitle]="'discounts.form.subtitle' | t" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        @if (cafes().length > 1 || discount()) {
          <app-select [label]="'cafes.column.cafe' | t" [placeholder]="'discounts.form.select_cafe' | t" [options]="cafes()" formControlName="cafeSlug"
                      [hint]="discount() ? ('discounts.form.cafe_locked' | t) : ''" />
        }

        <app-select [label]="'discounts.column.product' | t" [placeholder]="(productsLoading() ? 'common.loading' : 'discounts.form.select_product') | t"
                    [options]="productOptions()" formControlName="productSlug" />

        @if (selectedProduct(); as product) {
          <div class="flex flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-espresso-500">{{ 'discounts.form.original_price' | t }}</span>
              <span class="font-semibold text-espresso-900">{{ price(product.price) }}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (percent of quickPercents; track percent) {
                <button type="button" (click)="applyPercent(percent)"
                        class="h-8 rounded-full px-3 text-sm font-semibold ring-1 transition"
                        [class]="currentPercent() === percent
                          ? 'bg-accent-500 text-white ring-transparent'
                          : 'bg-surface text-espresso-600 ring-line-strong hover:bg-espresso-50'">
                  −{{ percent }}%
                </button>
              }
            </div>
          </div>
        }

        <app-input [label]="'discounts.form.discount_price' | t" type="number" [required]="true" placeholder="24000" formControlName="discountPrice"
                   [invalid]="priceInvalid()" [errorMessage]="priceError()"
                   [hint]="previewHint()" />

        <div class="grid gap-5 sm:grid-cols-2">
          <app-input [label]="'discounts.form.starts' | t" type="datetime-local" formControlName="startsAt" [hint]="'discounts.form.starts_hint' | t" />
          <app-input [label]="'discounts.form.ends' | t" type="datetime-local" formControlName="endsAt" [hint]="'discounts.form.ends_hint' | t"
                     [invalid]="periodInvalid()" [errorMessage]="'discounts.form.period_invalid' | t" />
        </div>

        <div class="rounded-xl border border-line p-4">
          <app-toggle [label]="'common.status.active' | t" [hint]="'discounts.form.active_hint' | t" formControlName="active" />
        </div>

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            {{ errorMessage() }}
          </div>
        }
      </form>

      <ng-container footer>
        <app-button variant="secondary" (clicked)="cancelled.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button icon="check" [loading]="saving()" (clicked)="submit()">{{ 'common.save' | t }}</app-button>
      </ng-container>
    </app-modal>
  `
})
export class DiscountFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly discountService = inject(DiscountService);
  private readonly productService = inject(ProductService);
  private readonly i18n = inject(I18nService);

  readonly cafes = input.required<DropdownDto[]>();
  readonly discount = input<DiscountResponseDto | null>(null);
  readonly defaultCafeSlug = input<string | null>(null);

  readonly saved = output<DiscountResponseDto>();
  readonly cancelled = output<void>();

  protected readonly quickPercents = QUICK_PERCENTS;
  protected readonly products = signal<ProductResponseDto[]>([]);
  protected readonly productsLoading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    cafeSlug: ['', Validators.required],
    productSlug: ['', Validators.required],
    discountPrice: ['', [Validators.required, Validators.min(0)]],
    startsAt: [''],
    endsAt: [''],
    active: [true]
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly productOptions = computed<DropdownDto[]>(() =>
    this.products().map((product) => ({
      value: product.slug,
      label: `${uiName(product.nameTranslations)} — ${uiPrice(product.price)}${product.active ? '' : ' (' + this.i18n.t('menu_manager.hidden').toLowerCase() + ')'}`
    })));

  protected readonly selectedProduct = computed(() =>
    this.products().find((product) => product.slug === this.value().productSlug) ?? null);

  protected readonly currentPercent = computed(() => {
    const product = this.selectedProduct();
    const discountPrice = Number(this.value().discountPrice);
    return product && this.value().discountPrice !== '' ? discountPercent(product.price, discountPrice) : null;
  });

  protected readonly priceInvalid = computed(() => {
    const raw = this.value().discountPrice;
    const product = this.selectedProduct();
    if (raw === '' || raw === undefined) {
      return this.submitted();
    }
    return Number(raw) < 0 || (!!product && Number(raw) >= product.price);
  });

  protected readonly priceError = computed(() =>
    this.i18n.t(this.value().discountPrice === '' ? 'discounts.form.price_required' : 'discounts.form.price_too_high'));

  protected readonly periodInvalid = computed(() => {
    const { startsAt, endsAt } = this.value();
    return !!startsAt && !!endsAt && new Date(endsAt) <= new Date(startsAt);
  });

  protected readonly previewHint = computed(() => {
    const product = this.selectedProduct();
    const percent = this.currentPercent();
    if (!product || percent === null || this.priceInvalid()) {
      return '';
    }
    return `${uiPrice(product.price)} → ${uiPrice(Number(this.value().discountPrice))} (−${percent}%)`;
  });

  ngOnInit(): void {
    const discount = this.discount();
    if (discount) {
      this.form.patchValue({
        cafeSlug: discount.cafeSlug,
        productSlug: discount.productSlug,
        discountPrice: String(discount.discountPrice),
        startsAt: toLocalInput(discount.startsAt),
        endsAt: toLocalInput(discount.endsAt),
        active: discount.active
      });
      this.form.controls.cafeSlug.disable();
    } else {
      const cafeSlug = this.defaultCafeSlug() ?? (this.cafes().length === 1 ? this.cafes()[0].value : '');
      this.form.patchValue({ cafeSlug });
    }

    this.loadProducts(this.form.getRawValue().cafeSlug);
    this.form.controls.cafeSlug.valueChanges.subscribe((cafeSlug) => {
      this.form.patchValue({ productSlug: '' });
      this.loadProducts(cafeSlug);
    });
  }

  protected price(value: number): string {
    return uiPrice(value);
  }

  protected applyPercent(percent: number): void {
    const product = this.selectedProduct();
    if (product) {
      this.form.patchValue({ discountPrice: String(Math.round((product.price * (100 - percent)) / 100 / 100) * 100) });
    }
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.priceInvalid() || this.periodInvalid()) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: DiscountRequestDto = {
      productSlug: value.productSlug,
      discountPrice: Number(value.discountPrice),
      startsAt: toIso(value.startsAt),
      endsAt: toIso(value.endsAt),
      active: value.active
    };
    const discount = this.discount();

    this.saving.set(true);
    this.errorMessage.set('');
    (discount
      ? this.discountService.update(discount.cafeSlug, discount.slug, dto)
      : this.discountService.create(value.cafeSlug, dto)
    ).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.data) {
          this.saved.emit(response.data);
        }
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }

  private loadProducts(cafeSlug: string): void {
    this.products.set([]);
    if (!cafeSlug) {
      return;
    }
    this.productsLoading.set(true);
    this.productService.get(cafeSlug).subscribe({
      next: (response) => {
        this.products.set(response.data ?? []);
        this.productsLoading.set(false);
      },
      error: (error) => {
        this.productsLoading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('discounts.error.load_products'));
      }
    });
  }
}
