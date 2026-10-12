import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { CodeSentNavigationState, ResendCountdown } from '../../../core/utils/countdown.util';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

const PASSWORD_MIN_LENGTH = 8;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

/**
 * New password after "forgot password". ?email= asks for the emailed code too; ?token= is the link
 * from the email and needs only the new password.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-600">
          <app-icon name="lock" [size]="26" />
        </div>
        <h2 class="text-3xl font-bold tracking-tight text-espresso-900">{{ 'auth.reset.title' | t }}</h2>
        <p class="mt-2 text-espresso-400">
          @if (token) {
            {{ 'auth.reset.subtitle_link' | t }}
          } @else {
            {{ 'auth.reset.subtitle_code' | t: { email: email() } }}
          }
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
        @if (!token) {
          <app-input
            [label]="'auth.verify.code' | t"
            icon="mail"
            placeholder="123456"
            autocomplete="one-time-code"
            formControlName="code"
            [invalid]="form.controls.code.invalid && form.controls.code.touched"
            [errorMessage]="'auth.verify.code_invalid' | t"
          />
        }
        <app-input
          [label]="'auth.reset.new_password' | t"
          type="password"
          icon="lock"
          placeholder="••••••••"
          autocomplete="new-password"
          [hint]="'auth.password_hint' | t"
          formControlName="password"
          [invalid]="form.controls.password.invalid && form.controls.password.touched"
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

        @if (errorMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            {{ errorMessage() }}
          </div>
        }
        @if (infoMessage()) {
          <div class="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">
            <app-icon name="check" [size]="18" class="mt-px" />
            {{ infoMessage() }}
          </div>
        }

        <app-button type="submit" size="lg" [block]="true" [loading]="loading()">{{ 'auth.reset.submit' | t }}</app-button>
      </form>

      <div class="mt-6 flex flex-col items-center gap-3 text-sm text-espresso-400">
        @if (!token) {
          <span>
            {{ 'auth.verify.no_code' | t }}
            @if (countdown.seconds() > 0) {
              {{ 'auth.verify.resend_in' | t: { seconds: countdown.seconds() } }}
            } @else {
              <button type="button" class="font-semibold text-accent-600 hover:text-accent-700 disabled:opacity-50"
                      [disabled]="resending()" (click)="resend()">{{ 'auth.verify.resend' | t }}</button>
            }
          </span>
        } @else {
          <a routerLink="/auth/forgot-password" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.reset.request_new' | t }}</a>
        }
        <a routerLink="/auth/login" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.verify.back_to_login' | t }}</a>
      </div>
    </app-auth-layout>
  `
})
export class ResetPasswordComponent implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected token: string | null = null;
  protected readonly email = signal('');
  protected readonly loading = signal(false);
  protected readonly resending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly infoMessage = signal('');
  protected readonly countdown = new ResendCountdown();

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\s*\d{6}\s*$/)]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.token = params.get('token');
    if (this.token) {
      // The link replaces the code
      this.form.controls.code.disable();
      return;
    }
    const email = params.get('email');
    if (!email) {
      this.router.navigate(['/auth/forgot-password']);
      return;
    }
    this.email.set(email);
    const state = history.state as CodeSentNavigationState | null;
    this.countdown.start(state?.resendIn ?? 0);
  }

  ngOnDestroy(): void {
    this.countdown.stop();
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
    this.infoMessage.set('');
    const { code, password } = this.form.getRawValue();
    const request = this.token
      ? this.authService.resetPasswordLink(this.token, password)
      : this.authService.resetPassword(this.email(), code.trim(), password);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.authService.homeRoute()]);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.reset.failed'));
      }
    });
  }

  protected resend(): void {
    this.resending.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.authService.forgotPassword(this.email()).subscribe({
      next: (response) => {
        this.resending.set(false);
        this.infoMessage.set(this.i18n.t('auth.verify.resent'));
        this.countdown.start(response.data?.resendAvailableInSeconds ?? 0);
      },
      error: (error) => {
        this.resending.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.reset.failed'));
      }
    });
  }
}
