import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LimitDefinitionResponseDto, PlanRequestDto, PlanResponseDto } from '../../../core/models/billing.model';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { BillingAdminService } from '../../../core/services/billing-admin.service';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { limitPeriodSuffix, name, som } from '../../../core/utils/billing.util';
import { Translations, cleanTranslations, defaultLanguageCode, requiredTranslation } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslationInputComponent } from '../../../shared/components/translation/translation-input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

const DEFAULT_YEARLY_DISCOUNT = 0.2;

function toCents(value: string): number {
  const amount = Number(String(value).replace(',', '.'));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function fromCents(cents: number): string {
  return cents > 0 ? String(cents / 100) : '';
}

@Component({
  selector: 'app-plan-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, ModalComponent, ButtonComponent, IconComponent, InputComponent, ToggleComponent,
    LanguageTabsComponent, TranslationInputComponent, TranslatePipe
  ],
  template: `
    <app-modal size="lg" [title]="(plan() ? 'plans.form.title_edit' : 'plans.new_plan') | t"
               [subtitle]="'plans.form.subtitle' | t" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-6">
        @if (languages().length > 0) {
          <div class="flex flex-col gap-4">
            <app-language-tabs [languages]="languages()" [(active)]="activeLanguage" [invalidCodes]="invalidCodes()" />
            <app-translation-input [label]="'common.name' | t" formControlName="names" [language]="activeLanguageDto()"
                                   [required]="activeLanguage() === defaultLanguage()"
                                   [invalid]="invalidCodes().includes(activeLanguage())"
                                   [errorMessage]="'common.validation.default_language_name_required' | t" />
            <app-translation-input [label]="'plans.form.short_description' | t" formControlName="descriptions" [language]="activeLanguageDto()"
                                   [placeholder]="'plans.form.short_description_placeholder' | t" />
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-3">
          <app-input [label]="'plans.form.monthly_price' | t" type="number" formControlName="monthlyPrice" [required]="true"
                     [hint]="'plans.form.yearly_suggested' | t: { price: suggestedYearly() }" />
          <app-input [label]="'plans.form.yearly_price' | t" type="number" formControlName="yearlyPrice" [required]="true"
                     [hint]="yearlyHint()" />
          <app-input [label]="'languages.form.sort_order' | t" type="number" formControlName="sortOrder" [hint]="'languages.form.sort_order_hint' | t" />
        </div>

        <div class="flex flex-col gap-3 rounded-xl border border-line p-4">
          <div>
            <p class="text-sm font-medium text-espresso-800">{{ 'plans.form.foreign_prices' | t }}</p>
            <p class="text-xs text-espresso-400">{{ 'plans.form.foreign_prices_hint' | t }}</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <app-input [label]="'plans.form.monthly_usd' | t" type="number" placeholder="9.99" formControlName="monthlyPriceUsd" />
            <app-input [label]="'plans.form.yearly_usd' | t" type="number" placeholder="99" formControlName="yearlyPriceUsd" />
            <app-input [label]="'plans.form.monthly_eur' | t" type="number" placeholder="8.99" formControlName="monthlyPriceEur" />
            <app-input [label]="'plans.form.yearly_eur' | t" type="number" placeholder="89" formControlName="yearlyPriceEur" />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <app-toggle [label]="'plans.badge.on_sale' | t" [hint]="'plans.form.on_sale_hint' | t" formControlName="active" />
          <app-toggle [label]="'upgrade.dialog.recommended' | t" [hint]="'plans.form.recommended_hint' | t" formControlName="recommended" />
        </div>

        <section>
          <h3 class="mb-3 text-sm font-semibold tracking-wide text-espresso-400 uppercase">{{ 'plans.form.limits' | t }}</h3>
          <div class="divide-y divide-line rounded-xl border border-line">
            @for (limit of limits(); track limit.key) {
              @let value = valueOf(limit);
              <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-espresso-900">{{ limitName(limit) }}</p>
                  <p class="font-mono text-xs text-espresso-400">{{ limit.key }}{{ periodSuffix(limit) }}</p>
                </div>
                @if (limit.kind === 'FEATURE') {
                  <app-toggle [ariaLabel]="limitName(limit)" [checked]="value !== 0" (checkedChange)="setValue(limit, $event ? 1 : 0)" />
                } @else {
                  <div class="flex items-center gap-3">
                    <input type="number" min="0" [value]="value < 0 ? '' : value" [disabled]="value < 0"
                           [attr.aria-label]="limitName(limit)"
                           (input)="setValue(limit, toNumber($any($event.target).value))"
                           class="h-10 w-28 rounded-xl border border-line-strong bg-surface px-3 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none disabled:bg-espresso-50" />
                    <label class="flex cursor-pointer items-center gap-2 text-sm text-espresso-600">
                      <input type="checkbox" class="h-4 w-4 accent-accent-500" [checked]="value < 0"
                             (change)="setValue(limit, $any($event.target).checked ? -1 : 0)" />
                      {{ 'billing.unlimited' | t }}
                    </label>
                  </div>
                }
              </div>
            } @empty {
              <p class="px-4 py-6 text-center text-sm text-espresso-400">{{ 'plans.form.no_limits' | t }}</p>
            }
          </div>
        </section>

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
export class PlanFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(BillingAdminService);
  private readonly languageService = inject(LanguageService);
  private readonly i18n = inject(I18nService);

  readonly plan = input<PlanResponseDto | null>(null);
  readonly limits = input.required<LimitDefinitionResponseDto[]>();

  readonly saved = output<PlanResponseDto>();
  readonly cancelled = output<void>();

  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));
  protected readonly activeLanguage = signal('');
  protected readonly activeLanguageDto = computed(() => this.languages().find((l) => l.code === this.activeLanguage()));
  protected readonly entitlements = signal<Record<string, number>>({});
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  private readonly submitted = signal(false);
  private readonly namesMissing = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    names: this.fb.nonNullable.control<Translations>({}),
    descriptions: this.fb.nonNullable.control<Translations>({}),
    monthlyPrice: ['0', Validators.required],
    yearlyPrice: ['0', Validators.required],
    /** Entered in dollars / euros, sent in cents. */
    monthlyPriceUsd: [''],
    yearlyPriceUsd: [''],
    monthlyPriceEur: [''],
    yearlyPriceEur: [''],
    sortOrder: [''],
    active: [true],
    recommended: [false]
  });

  private readonly monthly = signal(0);
  private readonly yearly = signal(0);

  protected readonly suggestedYearly = computed(() =>
    som(Math.round(this.monthly() * 12 * (1 - DEFAULT_YEARLY_DISCOUNT) / 1000) * 1000));

  protected readonly yearlyHint = computed(() => {
    const full = this.monthly() * 12;
    return full > 0 && this.yearly() > 0 ? this.i18n.t('plans.form.yearly_discount', { percent: Math.round((1 - this.yearly() / full) * 100) }) : '';
  });

  protected readonly invalidCodes = computed(() =>
    this.submitted() && this.namesMissing() ? [this.defaultLanguage()] : []);

  ngOnInit(): void {
    const plan = this.plan();
    if (plan) {
      this.form.patchValue({
        names: { ...plan.nameTranslations },
        descriptions: { ...plan.descriptionTranslations },
        monthlyPrice: String(plan.monthlyPrice),
        yearlyPrice: String(plan.yearlyPrice),
        monthlyPriceUsd: fromCents(plan.monthlyPriceUsd),
        yearlyPriceUsd: fromCents(plan.yearlyPriceUsd),
        monthlyPriceEur: fromCents(plan.monthlyPriceEur),
        yearlyPriceEur: fromCents(plan.yearlyPriceEur),
        sortOrder: String(plan.sortOrder),
        active: plan.active,
        recommended: plan.recommended
      });
      this.entitlements.set({ ...plan.entitlements });
    } else {
      this.entitlements.set(Object.fromEntries(this.limits().map((limit) => [limit.key, limit.defaultValue])));
    }
    this.monthly.set(Number(this.form.controls.monthlyPrice.value) || 0);
    this.yearly.set(Number(this.form.controls.yearlyPrice.value) || 0);
    this.form.controls.monthlyPrice.valueChanges.subscribe((value) => this.monthly.set(Number(value) || 0));
    this.form.controls.yearlyPrice.valueChanges.subscribe((value) => this.yearly.set(Number(value) || 0));

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

  protected valueOf(limit: LimitDefinitionResponseDto): number {
    return this.entitlements()[limit.key] ?? limit.defaultValue;
  }

  protected setValue(limit: LimitDefinitionResponseDto, value: number): void {
    this.entitlements.update((all) => ({ ...all, [limit.key]: value }));
  }

  protected toNumber(raw: string): number {
    const value = Math.floor(Number(raw));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  protected limitName(limit: LimitDefinitionResponseDto): string {
    return name(limit.nameTranslations, limit.key);
  }

  protected periodSuffix(limit: LimitDefinitionResponseDto): string {
    const suffix = limitPeriodSuffix(limit.period);
    return suffix ? ` · ${suffix}` : '';
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.namesMissing.set(this.form.controls.names.invalid);
    if (this.form.invalid) {
      this.activeLanguage.set(this.defaultLanguage());
      return;
    }
    const value = this.form.getRawValue();
    const dto: PlanRequestDto = {
      nameTranslations: cleanTranslations(value.names),
      descriptionTranslations: cleanTranslations(value.descriptions),
      monthlyPrice: Math.max(0, Math.round(Number(value.monthlyPrice) || 0)),
      yearlyPrice: Math.max(0, Math.round(Number(value.yearlyPrice) || 0)),
      monthlyPriceUsd: toCents(value.monthlyPriceUsd),
      yearlyPriceUsd: toCents(value.yearlyPriceUsd),
      monthlyPriceEur: toCents(value.monthlyPriceEur),
      yearlyPriceEur: toCents(value.yearlyPriceEur),
      entitlements: this.entitlements(),
      sortOrder: value.sortOrder === '' ? null : Number(value.sortOrder),
      recommended: value.recommended,
      active: value.active
    };
    this.saving.set(true);
    this.errorMessage.set('');
    const plan = this.plan();
    const save$ = plan ? this.adminService.updatePlan(plan.slug, dto) : this.adminService.createPlan(dto);
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
