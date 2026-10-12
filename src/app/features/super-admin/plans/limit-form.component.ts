import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LimitDefinitionRequestDto, LimitDefinitionResponseDto, LimitKind, LimitPeriod } from '../../../core/models/billing.model';
import { DropdownDto } from '../../../core/models/dropdown.model';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { BillingAdminService } from '../../../core/services/billing-admin.service';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { Translations, cleanTranslations, defaultLanguageCode, requiredTranslation } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslationInputComponent } from '../../../shared/components/translation/translation-input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

const METHOD_OPTIONS: DropdownDto[] = ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'].map((value) => ({ value, label: value }));

@Component({
  selector: 'app-limit-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, InputComponent, SelectComponent,
    LanguageTabsComponent, TranslationInputComponent, TranslatePipe
  ],
  template: `
    <app-modal size="lg" [title]="(limit() ? 'plans.limit_form.title_edit' : 'plans.new_limit') | t"
               [subtitle]="'plans.limit_form.subtitle' | t" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        <app-input [label]="'settings.form.key' | t" formControlName="key" [required]="true" placeholder="qr.downloads"
                   [hint]="'plans.limit_form.key_hint' | t" />

        @if (languages().length > 0) {
          <div class="flex flex-col gap-4">
            <app-language-tabs [languages]="languages()" [(active)]="activeLanguage" [invalidCodes]="invalidCodes()" />
            <app-translation-input [label]="'common.name' | t" formControlName="names" [language]="activeLanguageDto()"
                                   [required]="activeLanguage() === defaultLanguage()"
                                   [invalid]="invalidCodes().includes(activeLanguage())"
                                   [errorMessage]="'common.validation.default_language_name_required' | t" />
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <app-select [label]="'settings.form.type' | t" formControlName="kind" [options]="kindOptions()" />
          @if (kind() === 'METERED') {
            <app-select [label]="'plans.limit_form.period' | t" formControlName="period" [options]="periodOptions()" />
          }
        </div>

        @if (kind() === 'COUNT') {
          <p class="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
            {{ 'plans.limit_form.count_hint' | t }}
          </p>
        } @else if (!builtIn()) {
          <div class="rounded-xl border border-line p-4">
            <p class="text-sm font-medium text-espresso-800">{{ 'plans.limit_form.api_title' | t }}</p>
            <p class="mb-3 text-xs text-espresso-400">{{ 'plans.limit_form.api_hint' | t }}</p>
            <div class="grid gap-4 sm:grid-cols-3">
              <app-select [label]="'plans.limit_form.http_method' | t" formControlName="httpMethod" [options]="methodOptions" [placeholder]="'plans.limit_form.any' | t" />
              <div class="sm:col-span-2">
                <app-input [label]="'plans.limit_form.path_pattern' | t" formControlName="pathPattern" placeholder="/api/v1/cafes/*/discounts" />
              </div>
            </div>
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <app-input [label]="'plans.limit_form.default_value' | t" type="number" formControlName="defaultValue"
                     [hint]="(kind() === 'FEATURE' ? 'plans.limit_form.default_feature_hint' : 'plans.limit_form.default_number_hint') | t" />
          <app-input [label]="'languages.form.sort_order' | t" type="number" formControlName="sortOrder" />
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
export class LimitFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(BillingAdminService);
  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  readonly limit = input<LimitDefinitionResponseDto | null>(null);

  readonly saved = output<LimitDefinitionResponseDto>();
  readonly cancelled = output<void>();

  protected readonly kindOptions = computed<DropdownDto[]>(() => [
    { value: 'METERED', label: this.i18n.t('plans.limit_form.kind.METERED') },
    { value: 'FEATURE', label: this.i18n.t('plans.limit_form.kind.FEATURE') },
    { value: 'COUNT', label: this.i18n.t('plans.limit_form.kind.COUNT') }
  ]);
  protected readonly periodOptions = computed<DropdownDto[]>(() => [
    { value: 'MONTH', label: this.i18n.t('plans.limit_form.period.MONTH') },
    { value: 'DAY', label: this.i18n.t('plans.limit_form.period.DAY') },
    { value: 'NONE', label: this.i18n.t('plans.limit_form.period.NONE') }
  ]);
  protected readonly methodOptions = METHOD_OPTIONS;

  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));
  protected readonly activeLanguage = signal('');
  protected readonly activeLanguageDto = computed(() => this.languages().find((l) => l.code === this.activeLanguage()));
  protected readonly kind = signal<LimitKind>('METERED');
  protected readonly builtIn = computed(() => this.limit()?.builtIn ?? false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly submitted = signal(false);
  private readonly namesMissing = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    key: [''],
    names: this.fb.nonNullable.control<Translations>({}),
    kind: ['METERED'],
    period: ['MONTH'],
    httpMethod: ['POST'],
    pathPattern: [''],
    defaultValue: ['-1'],
    sortOrder: ['']
  });

  protected readonly invalidCodes = computed(() =>
    this.submitted() && this.namesMissing() ? [this.defaultLanguage()] : []);

  ngOnInit(): void {
    const limit = this.limit();
    if (limit) {
      this.form.patchValue({
        key: limit.key,
        names: { ...limit.nameTranslations },
        kind: limit.kind,
        period: limit.period,
        httpMethod: limit.httpMethod ?? '',
        pathPattern: limit.pathPattern ?? '',
        defaultValue: String(limit.defaultValue),
        sortOrder: String(limit.sortOrder)
      });
      this.form.controls.key.disable();
      if (limit.builtIn) {
        this.form.controls.kind.disable();
        this.form.controls.period.disable();
      }
    }
    this.kind.set(this.form.controls.kind.value as LimitKind);
    this.form.controls.kind.valueChanges.subscribe((value) => this.kind.set(value as LimitKind));

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
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.namesMissing.set(this.form.controls.names.invalid);
    const value = this.form.getRawValue();
    if (this.form.invalid || !value.key.trim()) {
      this.activeLanguage.set(this.defaultLanguage());
      this.errorMessage.set(value.key.trim() ? '' : this.i18n.t('plans.limit_form.key_required'));
      return;
    }
    const kind = value.kind as LimitKind;
    const hasPattern = kind !== 'COUNT' && !this.builtIn() && !!value.pathPattern.trim();
    const dto: LimitDefinitionRequestDto = {
      key: value.key.trim(),
      nameTranslations: cleanTranslations(value.names),
      kind,
      period: kind === 'METERED' ? value.period as LimitPeriod : 'NONE',
      httpMethod: hasPattern && value.httpMethod ? value.httpMethod : null,
      pathPattern: hasPattern ? value.pathPattern.trim() : null,
      defaultValue: Number(value.defaultValue) || (value.defaultValue === '0' ? 0 : -1),
      sortOrder: value.sortOrder === '' ? null : Number(value.sortOrder)
    };
    this.saving.set(true);
    this.errorMessage.set('');
    const limit = this.limit();
    const save$ = limit ? this.adminService.updateLimit(limit.key, dto) : this.adminService.createLimit(dto);
    save$.subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.data) {
          this.saved.emit(response.data);
        }
      },
      error: (error) => {
        this.saving.set(false);
        const details = error?.error?.errors?.join('; ');
        this.errorMessage.set([error?.error?.message ?? this.i18n.t('common.error.save'), details].filter(Boolean).join(': '));
      }
    });
  }
}
