import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VerificationSentDto } from '../../../core/models/token.model';
import { CodeSentNavigationState, ResendCountdown } from '../../../core/utils/countdown.util';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

/**
 * Two ways in: ?email= shows the code form (after sign-up, or a login with an unconfirmed email);
 * ?token= is the link from the email and confirms right away.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      @if (linkMode()) {
        <div class="flex flex-col items-center gap-5 text-center">
          @if (errorMessage()) {
            <div class="flex w-full items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-left text-sm text-red-700">
              <app-icon name="alert" [size]="18" class="mt-px" />
              {{ errorMessage() }}
            </div>
            <a routerLink="/auth/login" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.verify.back_to_login' | t }}</a>
          } @else {
            <div class="flex items-center gap-3 text-espresso-400">
              <span class="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent"></span>
              {{ 'auth.verify.confirming' | t }}
            </div>
          }
        </div>
      } @else {
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <app-icon name="mail" [size]="26" />
          </div>
          <h2 class="text-3xl font-bold tracking-tight text-espresso-900">{{ 'auth.verify.title' | t }}</h2>
          <p class="mt-2 text-espresso-400">{{ 'auth.verify.subtitle' | t: { email: email() } }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
          <app-input
            [label]="'auth.verify.code' | t"
            icon="lock"
            placeholder="123456"
            autocomplete="one-time-code"
            formControlName="code"
            [invalid]="form.controls.code.invalid && form.controls.code.touched"
            [errorMessage]="'auth.verify.code_invalid' | t"
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

          <app-button type="submit" size="lg" [block]="true" [loading]="loading()">{{ 'auth.verify.submit' | t }}</app-button>
        </form>

        <div class="mt-6 flex flex-col items-center gap-3 text-sm text-espresso-400">
          <span>
            {{ 'auth.verify.no_code' | t }}
            @if (resendIn() > 0) {
              {{ 'auth.verify.resend_in' | t: { seconds: resendIn() } }}
            } @else {
              <button type="button" class="font-semibold text-accent-600 hover:text-accent-700 disabled:opacity-50"
                      [disabled]="resending()" (click)="resend()">{{ 'auth.verify.resend' | t }}</button>
            }
          </span>
          <a routerLink="/auth/login" class="font-semibold text-accent-600 hover:text-accent-700">{{ 'auth.verify.back_to_login' | t }}</a>
        </div>
      }
    </app-auth-layout>
  `
})
export class VerifyEmailComponent implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly linkMode = signal(false);
  protected readonly email = signal('');
  protected readonly loading = signal(false);
  protected readonly resending = signal(false);
  private readonly countdown = new ResendCountdown();
  protected readonly resendIn = this.countdown.seconds;
  protected readonly errorMessage = signal('');
  protected readonly infoMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\s*\d{6}\s*$/)]]
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const token = params.get('token');
    if (token) {
      this.linkMode.set(true);
      this.confirmLink(token);
      return;
    }

    const email = params.get('email');
    if (!email) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.email.set(email);
    const state = history.state as CodeSentNavigationState | null;
    this.countdown.start(state?.resendIn ?? 0);
  }

  ngOnDestroy(): void {
    this.countdown.stop();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    const code = this.form.controls.code.value.trim();

    this.authService.verifyEmail({ email: this.email(), code }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.authService.homeRoute()]);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.verify.failed'));
      }
    });
  }

  protected resend(): void {
    this.resending.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.authService.resendVerification(this.email()).subscribe({
      next: (response) => {
        this.resending.set(false);
        this.infoMessage.set(this.i18n.t('auth.verify.resent'));
        this.countdown.start(response.data?.resendAvailableInSeconds ?? 0);
      },
      error: (error) => {
        this.resending.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.verify.failed'));
      }
    });
  }

  private confirmLink(token: string): void {
    this.authService.verifyEmailLink(token).subscribe({
      next: () => this.router.navigate([this.authService.homeRoute()]),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.verify.failed'))
    });
  }
}

/** Opens the code form for an address a code was just sent to. */
export function navigateToVerifyEmail(router: Router, sent: VerificationSentDto): void {
  const state: CodeSentNavigationState = { resendIn: sent.resendAvailableInSeconds };
  router.navigate(['/auth/verify-email'], { queryParams: { email: sent.email }, state });
}
