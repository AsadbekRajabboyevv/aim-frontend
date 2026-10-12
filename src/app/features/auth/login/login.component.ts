import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { GoogleButtonComponent } from '../../../shared/components/google-button/google-button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TelegramButtonComponent } from '../../../shared/components/telegram-button/telegram-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { navigateToVerifyEmail } from '../verify-email/verify-email.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent, GoogleButtonComponent, TelegramButtonComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      <div class="mb-8 text-center">
        <h2 class="text-3xl font-bold tracking-tight text-espresso-900">{{ 'auth.login.title' | t }}</h2>
        <p class="mt-2 text-espresso-400">{{ 'auth.login.subtitle' | t }}</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
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
          autocomplete="current-password"
          formControlName="password"
          [invalid]="isInvalid('password')"
          [errorMessage]="'auth.password_required' | t"
        />
        <a routerLink="/auth/forgot-password" class="-mt-3 self-end text-sm font-semibold text-accent-600 hover:text-accent-700">
          {{ 'auth.login.forgot_password' | t }}
        </a>

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            {{ errorMessage() }}
          </div>
        }

        <app-button type="submit" size="lg" [block]="true" [loading]="loading()">{{ 'auth.login.submit' | t }}</app-button>
      </form>

      <app-google-button />
      <app-telegram-button />

      <p class="mt-6 text-center text-sm text-espresso-400">
        {{ 'auth.login.no_account' | t }}
        <a routerLink="/auth/register" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.login.register_link' | t }}</a>
      </p>
    </app-auth-layout>
  `
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.authService.homeRoute()]);
      },
      error: (error) => {
        this.loading.set(false);
        // Right password, unconfirmed email: the backend has sent a code
        if (error?.status === 403 && error?.error?.data?.email) {
          navigateToVerifyEmail(this.router, error.error.data);
          return;
        }
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.login.failed'));
      }
    });
  }
}
