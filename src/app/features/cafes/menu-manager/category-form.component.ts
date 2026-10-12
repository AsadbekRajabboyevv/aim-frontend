import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { MenuCategoryRequestDto, MenuCategoryResponseDto } from '../../../core/models/menu.model';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { MenuCategoryService } from '../../../core/services/menu-category.service';
import { Translations, cleanTranslations, defaultLanguageCode, requiredTranslation } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslationInputComponent } from '../../../shared/components/translation/translation-input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ModalComponent, ToggleComponent, ButtonComponent, IconComponent,
    LanguageTabsComponent, TranslationInputComponent, TranslatePipe
  ],
  template: `
    <app-modal [title]="(category() ? 'category_form.title_edit' : 'category_form.title_new') | t"
               [subtitle]="'category_form.subtitle' | t" (closed)="cancelled.emit()">
      @if (languages().length === 0 && !errorMessage()) {
        <div class="h-40 animate-pulse rounded-xl bg-espresso-50"></div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
          <app-language-tabs [languages]="languages()" [(active)]="activeLanguage" [invalidCodes]="invalidCodes()" />
          <app-translation-input
            [label]="'common.name' | t"
            formControlName="names"
            [language]="activeLanguageDto()"
            [required]="activeLanguage() === defaultLanguage()"
            [invalid]="invalidCodes().includes(activeLanguage())"
            [errorMessage]="'common.validation.default_language_name_required' | t"
          />
          <app-toggle [label]="'menu_manager.show_in_menu' | t" [hint]="'category_form.active_hint' | t" formControlName="active" />

          @if (errorMessage()) {
            <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <app-icon name="alert" [size]="18" class="mt-px" />
              {{ errorMessage() }}
            </div>
          }
        </form>
      }

      <ng-container footer>
        <app-button variant="secondary" (clicked)="cancelled.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button icon="check" [loading]="saving()" [disabled]="languages().length === 0" (clicked)="submit()">{{ 'common.save' | t }}</app-button>
      </ng-container>
    </app-modal>
  `
})
export class CategoryFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(MenuCategoryService);
  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  readonly cafeSlug = input.required<string>();
  readonly category = input<MenuCategoryResponseDto | null>(null);

  readonly saved = output<MenuCategoryResponseDto>();
  readonly cancelled = output<void>();

  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));
  protected readonly activeLanguage = signal('');
  protected readonly activeLanguageDto = computed(() => this.languages().find((l) => l.code === this.activeLanguage()));
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly submitted = signal(false);
  private readonly namesMissing = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    names: this.fb.nonNullable.control<Translations>({}),
    active: [true]
  });

  protected readonly invalidCodes = computed(() =>
    this.submitted() && this.namesMissing() ? [this.defaultLanguage()] : []);

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.patchValue({ names: { ...category.nameTranslations }, active: category.active });
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

  protected submit(): void {
    if (this.saving() || this.languages().length === 0) {
      return;
    }
    this.submitted.set(true);
    this.namesMissing.set(this.form.controls.names.invalid);
    if (this.form.invalid) {
      this.activeLanguage.set(this.defaultLanguage());
      return;
    }
    const value = this.form.getRawValue();
    const dto: MenuCategoryRequestDto = { nameTranslations: cleanTranslations(value.names), active: value.active };

    this.saving.set(true);
    this.errorMessage.set('');
    const category = this.category();
    const save$ = category
      ? this.categoryService.update(this.cafeSlug(), category.slug, dto)
      : this.categoryService.create(this.cafeSlug(), dto);

    save$.subscribe({
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
}
