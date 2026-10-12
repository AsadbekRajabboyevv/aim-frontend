import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ProfileResponseDto } from '../../core/models/profile.model';
import { I18nService } from '../../core/services/i18n.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { ProfileService } from '../../core/services/profile.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { countryOptions, currencyForCountry } from '../../core/utils/country.util';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { newPassword, confirmPassword } = group.value as { newPassword: string; confirmPassword: string };
  return confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, InputComponent, SelectComponent, ButtonComponent, IconComponent, AvatarComponent, BadgeComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.profile' | t" [subtitle]="'profile.subtitle' | t" />

    @if (loadError()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        {{ loadError() }}
      </div>
    }

    @if (profile(); as profile) {
      <div class="grid max-w-4xl items-start gap-6 lg:grid-cols-2">

        <section class="rounded-card border border-line bg-surface p-6 shadow-card">
          <div class="mb-6 flex items-center gap-4">
            <app-avatar [name]="profile.fullName" [size]="56" />
            <div class="min-w-0">
              <p class="truncate text-lg font-semibold text-espresso-900">{{ profile.fullName }}</p>
              <div class="mt-1 flex flex-wrap gap-2">
                <app-badge tone="accent">{{ (profile.role === 'SUPER_ADMIN' ? 'role.super_admin' : 'role.cafe_admin') | t }}</app-badge>
                @if (profile.provider === 'GOOGLE') {
                  <app-badge tone="neutral">Google</app-badge>
                } @else if (profile.provider === 'TELEGRAM') {
                  <app-badge tone="neutral">Telegram</app-badge>
                }
              </div>
            </div>
          </div>

          <form [formGroup]="detailsForm" (ngSubmit)="saveDetails()" class="flex flex-col gap-5">
            <app-input [label]="'auth.register.full_name' | t" [required]="true" icon="user" formControlName="fullName" autocomplete="name"
                       [invalid]="detailsForm.controls.fullName.invalid && detailsForm.controls.fullName.touched"
                       [errorMessage]="'profile.full_name_invalid' | t" />
            <app-input [label]="'common.email' | t" icon="mail" formControlName="email"
                       [hint]="'profile.email_hint' | t" />
        <div class="flex flex-col gap-1.5">
          <app-select [label]="'country.label' | t" [placeholder]="'country.placeholder' | t" [options]="countries()"
                      formControlName="country" />
          @if (detailsForm.controls.country.invalid && detailsForm.controls.country.touched) {
            <span class="text-xs font-medium text-red-600">{{ 'country.required' | t }}</span>
          } @else if (detailsForm.controls.country.value) {
            <span class="text-xs text-espresso-400">{{ 'country.currency_hint' | t: { currency: currencyLabel(detailsForm.controls.country.value) } }}</span>
          }
        </div>
            <p class="text-xs text-espresso-400">{{ 'profile.registered_on' | t: { date: date(profile.createdAt) } }}</p>

            @if (detailsMessage(); as message) {
              <div class="flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm"
                   [class]="message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'">
                <app-icon [name]="message.ok ? 'check' : 'alert'" [size]="18" class="mt-px" />
                {{ message.text }}
              </div>
            }

            <app-button type="submit" icon="check" class="self-start" [loading]="savingDetails()"
                        [disabled]="detailsForm.pristine">{{ 'common.save' | t }}</app-button>
          </form>
        </section>

        <section class="rounded-card border border-line bg-surface p-6 shadow-card">
          <h2 class="flex items-center gap-2 text-base font-semibold text-espresso-900">
            <app-icon name="lock" [size]="18" class="text-accent-500" />
            {{ (profile.hasPassword ? 'profile.change_password' : 'profile.set_password') | t }}
          </h2>
          <p class="mt-1 mb-5 text-sm text-espresso-400">
            @if (profile.hasPassword) {
              {{ 'profile.change_password_hint' | t }}
            } @else {
              {{ 'profile.set_password_hint' | t }}
            }
          </p>

          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="flex flex-col gap-5">
            @if (profile.hasPassword) {
              <app-input [label]="'profile.current_password' | t" type="password" [required]="true" formControlName="currentPassword"
                         autocomplete="current-password"
                         [invalid]="passwordForm.controls.currentPassword.invalid && passwordForm.controls.currentPassword.touched"
                         [errorMessage]="'profile.current_password_required' | t" />
            }
            <app-input [label]="'profile.new_password' | t" type="password" [required]="true" formControlName="newPassword"
                       autocomplete="new-password" [hint]="'auth.password_hint' | t"
                       [invalid]="passwordForm.controls.newPassword.invalid && passwordForm.controls.newPassword.touched"
                       [errorMessage]="'auth.password_too_short' | t" />
            <app-input [label]="'profile.repeat_password' | t" type="password" [required]="true" formControlName="confirmPassword"
                       autocomplete="new-password"
                       [invalid]="passwordForm.hasError('mismatch') && passwordForm.controls.confirmPassword.touched"
                       [errorMessage]="'auth.passwords_mismatch' | t" />

            @if (passwordMessage(); as message) {
              <div class="flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm"
                   [class]="message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'">
                <app-icon [name]="message.ok ? 'check' : 'alert'" [size]="18" class="mt-px" />
                {{ message.text }}
              </div>
            }

            <app-button type="submit" icon="lock" class="self-start" [loading]="savingPassword()">
              {{ (profile.hasPassword ? 'profile.change_password' : 'profile.set_password') | t }}
            </app-button>
          </form>
        </section>

        <section class="rounded-card border border-line bg-surface p-6 shadow-card lg:col-span-2">
          <h2 class="flex items-center gap-2 text-base font-semibold text-espresso-900">
            <app-icon [name]="theme.isDark() ? 'moon' : 'sun'" [size]="18" class="text-accent-500" />
            {{ 'theme_mode.title' | t }}
          </h2>
          <p class="mt-1 mb-5 text-sm text-espresso-400">{{ 'theme_mode.hint' | t }}</p>
          <div class="inline-flex rounded-xl bg-espresso-50 p-1" role="radiogroup" [attr.aria-label]="'theme_mode.title' | t">
            @for (option of themeOptions; track option.value) {
              <button type="button" role="radio" [attr.aria-checked]="theme.preference() === option.value"
                      (click)="theme.set(option.value)"
                      class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"
                      [class]="theme.preference() === option.value ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400 hover:text-espresso-700'">
                <app-icon [name]="option.icon" [size]="16" />
                {{ option.label | t }}
              </button>
            }
          </div>
        </section>
      </div>
    } @else if (!loadError()) {
      <div class="grid max-w-4xl gap-6 lg:grid-cols-2">
        <div class="h-96 animate-pulse rounded-card bg-surface"></div>
        <div class="h-96 animate-pulse rounded-card bg-surface"></div>
      </div>
    }
  `
})
export class ProfileComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);

  // i18n: theme_mode.light, theme_mode.dark, theme_mode.system
  protected readonly themeOptions: { value: ThemePreference; icon: IconName; label: string }[] = [
    { value: 'light', icon: 'sun', label: 'theme_mode.light' },
    { value: 'dark', icon: 'moon', label: 'theme_mode.dark' },
    { value: 'system', icon: 'tablet', label: 'theme_mode.system' }
  ];

  protected readonly countries = computed(() => countryOptions(this.i18n.language()));
  protected currencyLabel = (country: string) => this.i18n.t('country.currency.' + currencyForCountry(country));

  protected readonly profile = signal<ProfileResponseDto | null>(null);
  protected readonly loadError = signal('');
  protected readonly savingDetails = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly detailsMessage = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly passwordMessage = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly detailsForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: [{ value: '', disabled: true }],
    country: ['', Validators.required]
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  ngOnInit(): void {
    this.profileService.get().subscribe({
      next: (response) => response.data && this.setProfile(response.data),
      error: (error) => this.loadError.set(error?.error?.message ?? this.i18n.t('profile.error.load'))
    });
  }

  protected date(iso: string): string {
    return DATE_FORMAT.format(new Date(iso));
  }

  protected saveDetails(): void {
    if (this.savingDetails()) {
      return;
    }
    this.detailsForm.markAllAsTouched();
    if (this.detailsForm.invalid) {
      return;
    }
    this.savingDetails.set(true);
    this.detailsMessage.set(null);
    this.profileService.update({
      fullName: this.detailsForm.getRawValue().fullName.trim(),
      country: this.detailsForm.getRawValue().country
    }).subscribe({
      next: (response) => {
        this.savingDetails.set(false);
        if (response.data) {
          this.setProfile(response.data);
        }
        this.detailsMessage.set({ ok: true, text: this.i18n.t('common.saved') });
      },
      error: (error) => {
        this.savingDetails.set(false);
        this.detailsMessage.set({ ok: false, text: error?.error?.message ?? this.i18n.t('common.error.save') });
      }
    });
  }

  protected changePassword(): void {
    if (this.savingPassword()) {
      return;
    }
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      return;
    }
    const value = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.passwordMessage.set(null);
    this.profileService.changePassword({
      currentPassword: this.profile()?.hasPassword ? value.currentPassword : null,
      newPassword: value.newPassword
    }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.profile.update((profile) => (profile ? { ...profile, hasPassword: true } : profile));
        this.setCurrentPasswordRequired(true);
        this.passwordMessage.set({ ok: true, text: this.i18n.t('profile.password_changed') });
      },
      error: (error) => {
        this.savingPassword.set(false);
        this.passwordMessage.set({ ok: false, text: error?.error?.message ?? this.i18n.t('common.error.save') });
      }
    });
  }

  private setProfile(profile: ProfileResponseDto): void {
    this.profile.set(profile);
    this.detailsForm.reset({ fullName: profile.fullName, email: profile.email ?? '', country: profile.country ?? '' });
    this.setCurrentPasswordRequired(profile.hasPassword);
  }

  private setCurrentPasswordRequired(required: boolean): void {
    const control = this.passwordForm.controls.currentPassword;
    control.setValidators(required ? Validators.required : null);
    control.updateValueAndValidity();
  }
}
