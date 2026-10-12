import { Component, ElementRef, NgZone, OnDestroy, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramAuthData } from '../../../core/models/token.model';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';
import { IconComponent } from '../icon/icon.component';

const WIDGET_SCRIPT_URL = 'https://telegram.org/js/telegram-widget.js?22';
const CALLBACK_NAME = 'onTelegramAuth';

type TelegramWindow = Window & { [CALLBACK_NAME]?: (user: TelegramAuthData) => void };

/**
 * Telegram Login Widget. Shown only when the backend has a bot configured; Telegram serves the
 * button only on the domain set for the bot with BotFather's /setdomain.
 */
@Component({
  selector: 'app-telegram-button',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (enabled()) {
      <div class="mt-3 flex min-h-12 flex-col items-center justify-center gap-2">
        @if (loading()) {
          <span class="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent"></span>
        }
        <div #widget [class.hidden]="loading()"></div>
        @if (errorMessage()) {
          <div class="flex w-full items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <app-icon name="alert" [size]="18" class="mt-px" />
            {{ errorMessage() }}
          </div>
        }
      </div>
    }
  `
})
export class TelegramButtonComponent implements OnInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly zone = inject(NgZone);

  private readonly widget = viewChild<ElementRef<HTMLElement>>('widget');

  private readonly botUsername = signal<string | null>(null);
  protected readonly enabled = computed(() => !!this.botUsername());
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    // The container exists only once the @if block has rendered
    effect(() => {
      const container = this.widget()?.nativeElement;
      const botUsername = this.botUsername();
      if (container && botUsername) {
        untracked(() => this.mountWidget(container, botUsername));
      }
    });
  }

  ngOnInit(): void {
    this.authService.telegramConfig().subscribe({
      next: (response) => this.botUsername.set(response.data?.botUsername ?? null),
      error: () => this.botUsername.set(null)
    });
  }

  ngOnDestroy(): void {
    delete (window as TelegramWindow)[CALLBACK_NAME];
  }

  private mountWidget(container: HTMLElement, botUsername: string): void {
    (window as TelegramWindow)[CALLBACK_NAME] = (user) => this.zone.run(() => this.login(user));

    const script = document.createElement('script');
    script.async = true;
    script.src = WIDGET_SCRIPT_URL;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-lang', this.i18n.language());
    script.setAttribute('data-onauth', `${CALLBACK_NAME}(user)`);
    container.replaceChildren(script);
  }

  private login(user: TelegramAuthData): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.authService.telegramLogin(user).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.authService.homeRoute()]);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('auth.login.failed'));
      }
    });
  }
}
