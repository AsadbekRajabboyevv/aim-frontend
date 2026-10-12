import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ROLE_CAFE_ADMIN } from '../../../core/constants/api.constants';
import { BaseResponse } from '../../../core/models/base-response.model';
import { CafeRequestDto, CafeResponseDto, MenuTheme, SocialLinks, SocialNetwork } from '../../../core/models/cafe.model';
import { DropdownDto } from '../../../core/models/dropdown.model';
import { LanguageResponseDto } from '../../../core/models/language.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { UserService } from '../../../core/services/user.service';
import { DEFAULT_MENU_THEME, THEME_OPTIONS } from '../../../core/utils/menu-theme.util';
import { SOCIAL_NETWORKS } from '../../../core/utils/social.util';
import { Translations, cleanTranslations, defaultLanguageCode, requiredTranslation } from '../../../core/utils/translation.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { LanguageTabsComponent } from '../../../shared/components/translation/language-tabs.component';
import { TranslationInputComponent } from '../../../shared/components/translation/translation-input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

const HTTP_URL = /^https?:\/\/\S+$/i;

type SocialControls = Record<SocialNetwork, FormControl<string>>;

function socialControls(): SocialControls {
  return Object.fromEntries(
    SOCIAL_NETWORKS.map((network) => [network.key, new FormControl('', { nonNullable: true, validators: Validators.pattern(HTTP_URL) })])
  ) as SocialControls;
}

@Component({
  selector: 'app-cafe-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule, InputComponent, SelectComponent, ButtonComponent, FileUploadComponent,
    IconComponent, PageHeaderComponent, LanguageTabsComponent, TranslationInputComponent, TranslatePipe
  ],
  template: `
    <app-page-header
      [title]="(slug() ? 'cafe_editor.title_edit' : 'cafes.new') | t"
      [subtitle]="(slug() ? 'cafe_editor.subtitle_edit' : 'cafe_editor.subtitle_new') | t"
      [backLink]="returnLink()"
      [backLabel]="'cafe_editor.back' | t"
    />

    @if ((loadingCafe() || languages().length === 0) && !errorMessage()) {
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="h-96 animate-pulse rounded-card bg-surface lg:col-span-2"></div>
        <div class="h-96 animate-pulse rounded-card bg-surface"></div>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-6 lg:grid-cols-3">
        <div class="flex flex-col gap-6 lg:col-span-2">

          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-espresso-900">{{ 'cafe_editor.basic.title' | t }}</h2>
                <p class="text-sm text-espresso-400">{{ 'cafe_editor.basic.subtitle' | t }}</p>
              </div>
              <app-language-tabs [languages]="languages()" [(active)]="activeLanguage" [invalidCodes]="invalidCodes()" />
            </div>

            <div class="flex flex-col gap-5">
              <app-translation-input
                [label]="'cafe_editor.name' | t"
                [placeholder]="'cafe_editor.name_placeholder' | t"
                formControlName="names"
                [language]="activeLanguageDto()"
                [required]="activeLanguage() === defaultLanguage()"
                [invalid]="invalidCodes().includes(activeLanguage())"
                [errorMessage]="'common.validation.default_language_name_required' | t"
              />
              <app-translation-input
                [label]="'common.description' | t"
                [placeholder]="'cafe_editor.description_placeholder' | t"
                formControlName="descriptions"
                [multiline]="true"
                [rows]="4"
                [language]="activeLanguageDto()"
              />
            </div>
          </section>

          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 class="text-lg font-semibold text-espresso-900">{{ 'cafe_editor.contacts.title' | t }}</h2>
            <p class="mb-5 text-sm text-espresso-400">{{ 'cafe_editor.contacts.subtitle' | t }}</p>
            <div class="grid gap-5 sm:grid-cols-2">
              <app-input [label]="'common.phone' | t" icon="phone" placeholder="+998 90 123 45 67" formControlName="phone" />
              <app-input [label]="'common.email' | t" type="email" icon="mail" placeholder="info@kafe.uz" formControlName="email"
                         [invalid]="form.controls.email.invalid && form.controls.email.touched" [errorMessage]="'auth.email_invalid' | t" />
              <app-input [label]="'common.address' | t" icon="map-pin" [placeholder]="'cafe_editor.address_placeholder' | t" formControlName="address" />
              <app-input [label]="'cafe_editor.working_hours' | t" icon="clock" [placeholder]="'cafe_editor.working_hours_placeholder' | t" formControlName="workingHours" />
            </div>
          </section>

          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 class="text-lg font-semibold text-espresso-900">Wi-Fi</h2>
            <p class="mb-5 text-sm text-espresso-400">{{ 'cafe_editor.wifi.subtitle' | t }}</p>
            <div class="grid gap-5 sm:grid-cols-2">
              <app-input [label]="'cafe_editor.wifi.name' | t" icon="wifi" placeholder="KofeUyi_Guest" formControlName="wifiName" />
              <app-input [label]="'common.password' | t" icon="lock" placeholder="••••••••" formControlName="wifiPassword" />
            </div>
          </section>

          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 class="text-lg font-semibold text-espresso-900">{{ 'cafe_editor.socials.title' | t }}</h2>
            <p class="mb-5 text-sm text-espresso-400">{{ 'cafe_editor.socials.subtitle' | t }}</p>
            <div class="grid gap-5 sm:grid-cols-2" formGroupName="socials">
              @for (network of socialNetworks; track network.key) {
                <app-input [label]="network.labelKey ? (network.labelKey | t) : network.label" [icon]="network.icon" [placeholder]="network.placeholder"
                           [formControlName]="network.key"
                           [invalid]="form.controls.socials.controls[network.key].invalid && form.controls.socials.controls[network.key].touched"
                           [errorMessage]="'common.validation.url' | t" />
              }
            </div>
          </section>

          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 class="text-lg font-semibold text-espresso-900">{{ 'cafe_editor.theme.title' | t }}</h2>
            <p class="mb-5 text-sm text-espresso-400">{{ 'cafe_editor.theme.subtitle' | t }}</p>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup">
              @for (option of themeOptions; track option.value) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="form.controls.theme.value === option.value"
                  (click)="form.controls.theme.setValue(option.value)"
                  class="group overflow-hidden rounded-xl border-2 text-left transition"
                  [class]="form.controls.theme.value === option.value
                    ? 'border-accent-500 ring-4 ring-accent-100'
                    : 'border-line hover:border-line-strong'"
                >
                  <div class="flex h-16" [style.background]="option.canvas">
                    <div class="w-1/3" [style.background]="option.rail"></div>
                    <div class="flex flex-1 flex-col justify-center gap-1.5 px-2.5">
                      <span class="h-2 w-10 rounded-full" [style.background]="option.accent"></span>
                      <span class="h-1.5 w-14 rounded-full bg-black/10"></span>
                      <span class="h-1.5 w-8 rounded-full bg-black/10"></span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between bg-surface px-3 py-2">
                    <span class="text-sm font-medium text-espresso-800">{{ ('theme.' + option.value) | t }}</span>
                    @if (form.controls.theme.value === option.value) {
                      <app-icon name="check" [size]="16" class="text-accent-600" />
                    }
                  </div>
                </button>
              }
            </div>
          </section>
        </div>

        <div class="flex flex-col gap-6">
          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 class="mb-5 text-lg font-semibold text-espresso-900">{{ 'cafe_editor.images.title' | t }}</h2>
            <div class="flex flex-col gap-5">
              <app-file-upload [label]="'cafe_editor.images.logo' | t" [existingUrl]="logoUrl()" (fileSelected)="pendingLogo = $event" />
              <app-file-upload [label]="'cafe_editor.images.cover' | t" shape="wide" [existingUrl]="coverUrl()" (fileSelected)="pendingCover = $event" />
            </div>
          </section>

          <section class="rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 class="mb-5 text-lg font-semibold text-espresso-900">{{ 'nav.settings' | t }}</h2>
            <div class="flex flex-col gap-5">
              <label class="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span class="block text-sm font-medium text-espresso-800">{{ 'common.status.active' | t }}</span>
                  <span class="block text-xs text-espresso-400">{{ 'cafe_editor.active_hint' | t }}</span>
                </span>
                <input type="checkbox" formControlName="active" class="peer sr-only" />
                <span class="relative h-6 w-11 shrink-0 rounded-full bg-espresso-100 transition peer-checked:bg-accent-500
                             peer-focus-visible:ring-4 peer-focus-visible:ring-accent-100
                             after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface
                             after:shadow after:transition peer-checked:after:translate-x-5"></span>
              </label>

              @if (canAssignOwner()) {
                <app-select
                  [label]="'cafes.column.owner' | t"
                  [placeholder]="'common.not_selected' | t"
                  [hint]="'cafe_editor.owner_hint' | t"
                  [options]="owners()"
                  formControlName="ownerSlug"
                />
              }
            </div>
          </section>

          @if (errorMessage()) {
            <div class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <app-icon name="alert" [size]="18" class="mt-px" />
              {{ errorMessage() }}
            </div>
          }

          <div class="flex gap-3 lg:sticky lg:top-6">
            <app-button variant="secondary" size="lg" class="flex-1" [block]="true" (clicked)="cancel()">{{ 'common.cancel' | t }}</app-button>
            <app-button type="submit" size="lg" icon="check" class="flex-1" [block]="true" [loading]="saving()">{{ 'common.save' | t }}</app-button>
          </div>
        </div>
      </form>
    }
  `
})
export class CafeEditorComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly cafeService = inject(CafeService);
  private readonly userService = inject(UserService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly slug = input<string | null>(null);
  readonly canAssignOwner = input<boolean>(false);
  readonly returnLink = input.required<string>();

  protected readonly languages = signal<LanguageResponseDto[]>([]);
  protected readonly defaultLanguage = computed(() => defaultLanguageCode(this.languages()));
  protected readonly activeLanguage = signal('');
  protected readonly activeLanguageDto = computed(() => this.languages().find((l) => l.code === this.activeLanguage()));
  private readonly namesMissing = signal(false);
  protected readonly invalidCodes = computed(() => (this.namesMissing() ? [this.defaultLanguage()] : []));
  protected readonly owners = signal<DropdownDto[]>([]);
  protected readonly logoUrl = signal<string | null>(null);
  protected readonly coverUrl = signal<string | null>(null);
  protected readonly loadingCafe = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly socialNetworks = SOCIAL_NETWORKS;
  // i18n: theme.ESPRESSO, theme.OLIVE, theme.OCEAN, theme.BURGUNDY, theme.MIDNIGHT, theme.SAFFRON
  protected readonly themeOptions = THEME_OPTIONS;

  protected pendingLogo: File | null = null;
  protected pendingCover: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    names: this.fb.nonNullable.control<Translations>({}),
    descriptions: this.fb.nonNullable.control<Translations>({}),
    phone: [''],
    address: [''],
    email: ['', Validators.email],
    workingHours: [''],
    wifiName: [''],
    wifiPassword: [''],
    socials: new FormGroup<SocialControls>(socialControls()),
    theme: this.fb.nonNullable.control<MenuTheme>(DEFAULT_MENU_THEME),
    active: [true],
    ownerSlug: ['']
  });

  ngOnInit(): void {
    this.languageService.getActive().subscribe({
      next: (languages) => {
        this.languages.set(languages);
        this.activeLanguage.set(defaultLanguageCode(languages));
        this.form.controls.names.setValidators(requiredTranslation(defaultLanguageCode(languages)));
        this.form.controls.names.updateValueAndValidity();
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.load_languages'))
    });

    if (this.canAssignOwner()) {
      this.userService.getDropdown(ROLE_CAFE_ADMIN).subscribe((response) => this.owners.set(response.data ?? []));
    }

    const slug = this.slug();
    if (!slug) {
      return;
    }
    this.loadingCafe.set(true);
    this.cafeService.getBySlug(slug).subscribe({
      next: (response) => {
        const cafe = response.data;
        if (cafe) {
          this.patch(cafe);
        }
        this.loadingCafe.set(false);
      },
      error: (error) => {
        this.loadingCafe.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('cafe_editor.error.load'));
      }
    });
  }

  protected submit(): void {
    if (this.saving() || this.languages().length === 0) {
      return;
    }
    this.namesMissing.set(this.form.controls.names.invalid);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeLanguage.set(this.defaultLanguage());
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const dto = this.buildDto();
    const slug = this.slug();

    const save$: Observable<BaseResponse<CafeResponseDto>> = slug
      ? this.uploadPending(slug).pipe(switchMap((urls) => this.cafeService.update(slug, { ...dto, ...urls })))
      : this.cafeService.create(dto).pipe(
          switchMap((created) => {
            const createdSlug = created.data?.slug;
            if (!createdSlug || (!this.pendingLogo && !this.pendingCover)) {
              return of(created);
            }
            return this.uploadPending(createdSlug).pipe(
              switchMap((urls) => this.cafeService.update(createdSlug, { ...dto, ...urls }))
            );
          })
        );

    save$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigateByUrl(this.returnLink());
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'));
      }
    });
  }

  protected cancel(): void {
    this.router.navigateByUrl(this.returnLink());
  }

  private patch(cafe: CafeResponseDto): void {
    this.logoUrl.set(cafe.logoUrl);
    this.coverUrl.set(cafe.coverUrl);
    this.form.patchValue({
      names: { ...cafe.nameTranslations },
      descriptions: { ...(cafe.descriptionTranslations ?? {}) },
      phone: cafe.phone ?? '',
      address: cafe.address ?? '',
      email: cafe.email ?? '',
      workingHours: cafe.workingHours ?? '',
      wifiName: cafe.wifiName ?? '',
      wifiPassword: cafe.wifiPassword ?? '',
      socials: Object.fromEntries(SOCIAL_NETWORKS.map((network) => [network.key, cafe.socialLinks?.[network.key] ?? ''])),
      theme: cafe.theme ?? DEFAULT_MENU_THEME,
      active: cafe.active,
      ownerSlug: cafe.ownerSlug ?? ''
    });
  }

  private buildDto(): CafeRequestDto {
    const value = this.form.getRawValue();
    return {
      nameTranslations: cleanTranslations(value.names),
      descriptionTranslations: cleanTranslations(value.descriptions),
      logoUrl: this.logoUrl() ?? undefined,
      coverUrl: this.coverUrl() ?? undefined,
      phone: value.phone,
      address: value.address,
      email: value.email.trim() || null,
      workingHours: value.workingHours.trim() || null,
      wifiName: value.wifiName.trim() || null,
      wifiPassword: value.wifiPassword.trim() || null,
      socialLinks: Object.fromEntries(
        Object.entries(value.socials).map(([key, url]) => [key, url.trim()]).filter(([, url]) => !!url)
      ) as SocialLinks,
      theme: value.theme,
      active: value.active,
      ownerSlug: this.canAssignOwner() ? value.ownerSlug || null : undefined
    };
  }

  private uploadPending(slug: string): Observable<{ logoUrl?: string; coverUrl?: string }> {
    const uploads: Record<string, Observable<string | undefined>> = {
      logoUrl: this.pendingLogo ? this.upload(slug, this.pendingLogo) : of(this.logoUrl() ?? undefined),
      coverUrl: this.pendingCover ? this.upload(slug, this.pendingCover) : of(this.coverUrl() ?? undefined)
    };
    return forkJoin(uploads).pipe(
      map(({ logoUrl, coverUrl }) => ({ logoUrl, coverUrl }))
    );
  }

  private upload(slug: string, file: File): Observable<string | undefined> {
    return this.cafeService.uploadFile(slug, file, 'IMAGE').pipe(map((response) => response.data?.url));
  }
}
