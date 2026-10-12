import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { GoogleButtonComponent } from '../../../shared/components/google-button/google-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TelegramButtonComponent } from '../../../shared/components/telegram-button/telegram-button.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { countryOptions, currencyForCountry, guessCountry } from '../../../core/utils/country.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { navigateToVerifyEmail } from '../verify-email/verify-email.component';

const PASSWORD_MIN_LENGTH = 8;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, SelectComponent, ButtonComponent, IconComponent, AuthLayoutComponent, GoogleButtonComponent, TelegramButtonComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      <div class="mb-8 text-center">
        <h2 class="text-3xl font-bold tracking-tight text-espresso-900">{{ 'auth.register.title' | t }}</h2>
        <p class="mt-2 text-espresso-400">{{ 'auth.register.subtitle' | t }}</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        <app-input
          [label]="'auth.register.full_name' | t"
          icon="user"
          [placeholder]="'auth.register.full_name_placeholder' | t"
          autocomplete="name"
          formControlName="fullName"
          [invalid]="isInvalid('fullName')"
          [errorMessage]="'auth.register.full_name_required' | t"
        />
        <app-input
          [label]="'common.email' | t"
          type="email"
          icon="mail"
          [placeholder]="'auth.email_placeholder' | t"
          autocomplete="email"
          formControlName="email"
          [invalid]="isInvalid('email')"
          [errorMessage]="'auth.email_invalid' | t"
        />
        <app-input
          [label]="'common.password' | t"
          type="password"
          icon="lock"
          placeholder="••••••••"
          autocomplete="new-password"
          [hint]="'auth.password_hint' | t"
          formControlName="password"
          [invalid]="isInvalid('password')"
          [errorMessage]="'auth.password_too_short' | t"
        />
        <app-input
          [label]="'auth.register.confirm_password' | t"
          type="password"
          icon="lock"
          placeholder="••••••••"
          autocomplete="new-password"
          formControlName="confirmPassword"
          [invalid]="confirmInvalid()"
          [errorMessage]="'auth.passwords_mismatch' | t"
        />
        <div class="flex flex-col gap-1.5">
          <app-select [label]="'country.label' | t" [placeholder]="'country.placeholder' | t" [options]="countries()"
                      formControlName="country" />
          @if (form.controls.country.invalid && form.controls.country.touched) {
            <span class="text-xs font-medium text-red-600">{{ 'country.required' | t }}</span>
          } @else if (form.controls.country.value) {
            <span class="text-xs text-espresso-400">{{ 'country.currency_hint' | t: { currency: currencyLabel(form.controls.country.value) } }}</span>
          }
        </div>

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            <div>
              {{ errorMessage() }}
              @for (detail of errorDetails(); track detail) {
                <p class="text-xs">{{ detail }}</p>
              }
            </div>
          </div>
        }

        <app-button type="submit" size="lg" [block]="true" [loading]="loading()">{{ 'auth.register.submit' | t }}</app-button>
        <p class="-mt-1 text-center text-xs leading-relaxed text-espresso-400">
          {{ 'legal.consent_before' | t }}
          <a routerLink="/terms" target="_blank" class="font-medium text-espresso-700 underline underline-offset-2 hover:text-accent-600">{{ 'legal.terms_accusative' | t }}</a>
          {{ 'legal.consent_and' | t }}
          <a routerLink="/privacy" target="_blank" class="font-medium text-espresso-700 underline underline-offset-2 hover:text-accent-600">{{ 'legal.privacy_accusative' | t }}</a>{{ 'legal.consent_after' | t }}
        </p>
      </form>

      <app-google-button labelKey="auth.google_continue" />
      <app-telegram-button />

      <p class="mt-6 text-center text-sm text-espresso-400">
        {{ 'auth.register.have_account' | t }}
        <a routerLink="/auth/login" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.login.submit' | t }}</a>
      </p>
    </app-auth-layout>
  `
})
export class RegisterComponent {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  /** Names follow the UI language. */
  protected readonly countries = computed(() => countryOptions(this.i18n.language()));
  // i18n: country.currency.UZS, country.currency.USD, country.currency.EUR
  protected currencyLabel = (country: string) => this.i18n.t('country.currency.' + currencyForCountry(country));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly errorDetails = signal<string[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    confirmPassword: ['', Validators.required],
    country: [guessCountry(), Validators.required]
  }, { validators: passwordsMatch });

  protected isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  protected confirmInvalid(): boolean {
    const control = this.form.controls.confirmPassword;
    return control.touched && (control.invalid || this.form.hasError('passwordMismatch'));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.errorDetails.set([]);
    const { fullName, email, password, country } = this.form.getRawValue();

    this.authService.register({ fullName, email, password, country }).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.data) {
          navigateToVerifyEmail(this.router, response.data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.register.failed'));
        this.errorDetails.set(error?.error?.errors ?? []);
      }
    });
  }
}
