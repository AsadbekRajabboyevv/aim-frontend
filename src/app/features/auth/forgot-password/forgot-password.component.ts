import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { CodeSentNavigationState } from '../../../core/utils/countdown.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-600">
          <app-icon name="lock" [size]="26" />
        </div>
        <h2 class="text-3xl font-bold tracking-tight text-espresso-900">{{ 'auth.forgot.title' | t }}</h2>
        <p class="mt-2 text-espresso-400">{{ 'auth.forgot.subtitle' | t }}</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        <app-input
          [label]="'common.email' | t"
          type="email"
          icon="mail"
          [placeholder]="'auth.email_placeholder' | t"
          autocomplete="email"
          formControlName="email"
          [invalid]="form.controls.email.invalid && form.controls.email.touched"
          [errorMessage]="'auth.email_invalid' | t"
        />

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            {{ errorMessage() }}
          </div>
        }

        <app-button type="submit" size="lg" [block]="true" [loading]="loading()">{{ 'auth.forgot.submit' | t }}</app-button>
      </form>

      <p class="mt-6 text-center text-sm">
        <a routerLink="/auth/login" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.verify.back_to_login' | t }}</a>
      </p>
    </app-auth-layout>
  `
})
export class ForgotPasswordComponent {

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.forgotPassword(this.form.controls.email.value.trim()).subscribe({
      next: (response) => {
        this.loading.set(false);
        const sent = response.data;
        if (sent) {
          const state: CodeSentNavigationState = { resendIn: sent.resendAvailableInSeconds };
          this.router.navigate(['/auth/reset-password'], { queryParams: { email: sent.email }, state });
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.reset.failed'));
      }
    });
  }
}
