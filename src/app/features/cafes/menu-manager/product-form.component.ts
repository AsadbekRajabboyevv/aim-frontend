import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, map, of, switchMap } from 'rxjs';
import { DropdownDto } from '../../../core/models/dropdown.model';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { MenuCategoryResponseDto, ProductRequestDto, ProductResponseDto, ProductTag } from '../../../core/models/menu.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { ProductService } from '../../../core/services/product.service';
import { uiName } from '../../../core/utils/ui-format.util';
import { PRODUCT_TAGS } from '../../../core/utils/product-tag.util';
import { Translations, cleanTranslations, defaultLanguageCode, requiredTranslation } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslationInputComponent } from '../../../shared/components/translation/translation-input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ModalComponent, InputComponent, SelectComponent, ToggleComponent, FileUploadComponent,
    ButtonComponent, IconComponent, LanguageTabsComponent, TranslationInputComponent, TranslatePipe
  ],
  template: `
    <app-modal size="lg" [title]="(product() ? 'product_form.title_edit' : 'menu_manager.new_product') | t"
               [subtitle]="'product_form.subtitle' | t" (closed)="cancelled.emit()">
      @if (languages().length === 0 && !errorMessage()) {
        <div class="h-72 animate-pulse rounded-xl bg-espresso-50"></div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-6 md:grid-cols-5">
          <div class="flex flex-col gap-5 md:col-span-3">
            <app-language-tabs class="self-start" [languages]="languages()" [(active)]="activeLanguage" [invalidCodes]="invalidCodes()" />
            <app-translation-input
              [label]="'common.name' | t"
              formControlName="names"
              [language]="activeLanguageDto()"
              [required]="activeLanguage() === defaultLanguage()"
              [invalid]="invalidCodes().includes(activeLanguage())"
              [errorMessage]="'common.validation.default_language_name_required' | t"
            />
            <app-translation-input
              [label]="'common.description' | t"
              [placeholder]="'product_form.description_placeholder' | t"
              formControlName="descriptions"
              [multiline]="true"
              [language]="activeLanguageDto()"
            />

            <div class="grid gap-5 sm:grid-cols-2">
              <app-input [label]="'product_form.price' | t" type="number" [required]="true" placeholder="28000" formControlName="price"
                         [invalid]="form.controls.price.invalid && form.controls.price.touched" [errorMessage]="'product_form.price_required' | t" />
              <app-input [label]="'product_form.portion' | t" [placeholder]="'product_form.portion_placeholder' | t" formControlName="portion" />
            </div>
            <app-select [label]="'product_form.category' | t" [options]="categoryOptions()" formControlName="categorySlug" />

            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium text-espresso-800">{{ 'product_form.tags' | t }}</span>
              <div class="flex flex-wrap gap-2">
                @for (tag of tagOptions; track tag.value) {
                  @let selected = form.controls.tags.value.includes(tag.value);
                  <button type="button" (click)="toggleTag(tag.value)" [attr.aria-pressed]="selected"
                          class="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition"
                          [class]="selected ? tag.classes + ' ring-transparent' : 'bg-surface text-espresso-500 ring-line-strong hover:bg-espresso-50'">
                    <app-icon [name]="selected ? 'check' : tag.icon" [size]="15" />
                    {{ tag.uiKey | t }}
                  </button>
                }
              </div>
              <span class="text-xs text-espresso-400">{{ 'product_form.tags_hint' | t }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-5 md:col-span-2">
            <app-file-upload [label]="'product_form.image' | t" shape="wide" [existingUrl]="product()?.imageUrl ?? null"
                             [hint]="'product_form.image_hint' | t" (fileSelected)="pendingImage = $event" />
            <div class="flex flex-col gap-4 rounded-xl border border-line p-4">
              <app-toggle [label]="'menu_manager.available' | t" [hint]="'product_form.available_hint' | t" formControlName="available" />
              <div class="h-px bg-line"></div>
              <app-toggle [label]="'menu_manager.show_in_menu' | t" [hint]="'product_form.active_hint' | t" formControlName="active" />
            </div>

            @if (errorMessage()) {
              <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <app-icon name="alert" [size]="18" class="mt-px" />
                {{ errorMessage() }}
              </div>
            }
          </div>
        </form>
      }

      <ng-container footer>
        <app-button variant="secondary" (clicked)="cancelled.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button icon="check" [loading]="saving()" [disabled]="languages().length === 0" (clicked)="submit()">{{ 'common.save' | t }}</app-button>
      </ng-container>
    </app-modal>
  `
})
export class ProductFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly cafeService = inject(CafeService);
  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  readonly cafeSlug = input.required<string>();
  readonly categories = input.required<MenuCategoryResponseDto[]>();
  readonly product = input<ProductResponseDto | null>(null);
  readonly defaultCategorySlug = input<string | null>(null);

  readonly saved = output<ProductResponseDto>();
  readonly cancelled = output<void>();

  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));
  protected readonly activeLanguage = signal('');
  protected readonly activeLanguageDto = computed(() => this.languages().find((l) => l.code === this.activeLanguage()));
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly namesMissing = signal(false);
  protected pendingImage: File | null = null;

  protected readonly invalidCodes = computed(() => (this.namesMissing() ? [this.defaultLanguage()] : []));

  protected readonly categoryOptions = computed<DropdownDto[]>(() =>
    this.categories().map((category) => ({
      value: category.slug,
      label: uiName(category.nameTranslations)
    })));

  protected readonly form = this.fb.nonNullable.group({
    names: this.fb.nonNullable.control<Translations>({}),
    descriptions: this.fb.nonNullable.control<Translations>({}),
    price: ['', [Validators.required, Validators.min(0)]],
    portion: [''],
    categorySlug: ['', Validators.required],
    active: [true],
    available: [true],
    tags: this.fb.nonNullable.control<ProductTag[]>([])
  });

  protected readonly tagOptions = PRODUCT_TAGS;

  ngOnInit(): void {
    const product = this.product();
    if (product) {
      this.form.patchValue({
        names: { ...product.nameTranslations },
        descriptions: { ...(product.descriptionTranslations ?? {}) },
        price: String(product.price),
        portion: product.portion ?? '',
        categorySlug: product.categorySlug,
        active: product.active,
        available: product.available,
        tags: [...(product.tags ?? [])]
      });
    } else {
      this.form.patchValue({ categorySlug: this.defaultCategorySlug() ?? this.categories()[0]?.slug ?? '' });
    }

    this.languageService.getActive().subscribe({
      next: (languages) => {
        this.languages.set(languages);
        this.activeLanguage.set(defaultLanguageCode(languages));
        this.form.controls.names.setValidators(requiredTranslation(defaultLanguageCode(languages)));
        this.form.controls.names.updateValueAndValidity();
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.load_languages'))
    });
  }

  protected toggleTag(tag: ProductTag): void {
    const tags = this.form.controls.tags.value;
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    this.form.controls.tags.setValue(PRODUCT_TAGS.map((meta) => meta.value).filter((value) => next.includes(value)));
  }

  protected submit(): void {
    if (this.saving() || this.languages().length === 0) {
      return;
    }
    this.namesMissing.set(this.form.controls.names.invalid);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.names.invalid) {
        this.activeLanguage.set(this.defaultLanguage());
      }
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const product = this.product();

    this.uploadImage().pipe(
      map((imageUrl) => this.buildDto(imageUrl)),
      switchMap((dto) => product
        ? this.productService.update(this.cafeSlug(), product.slug, dto)
        : this.productService.create(this.cafeSlug(), dto))
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

  private uploadImage(): Observable<string | null> {
    if (!this.pendingImage) {
      return of(this.product()?.imageUrl ?? null);
    }
    return this.cafeService.uploadFile(this.cafeSlug(), this.pendingImage, 'IMAGE')
      .pipe(map((response) => response.data?.url ?? null));
  }

  private buildDto(imageUrl: string | null): ProductRequestDto {
    const value = this.form.getRawValue();
    return {
      categorySlug: value.categorySlug,
      nameTranslations: cleanTranslations(value.names),
      descriptionTranslations: cleanTranslations(value.descriptions),
      price: Number(value.price),
      portion: value.portion.trim() || null,
      imageUrl,
      active: value.active,
      available: value.available,
      tags: value.tags
    };
  }
}
