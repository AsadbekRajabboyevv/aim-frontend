import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ROLE_SUPER_ADMIN } from '../../core/constants/api.constants';
import { AuthService } from '../../core/services/auth.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { UpgradeBannerComponent } from '../../shared/components/upgrade/upgrade-banner.component';
import { UpgradeDialogComponent } from '../../shared/components/upgrade/upgrade-dialog.component';
import { UpgradePromptService } from '../../core/services/upgrade-prompt.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  /** Translation keys of the full label and the short bottom-bar label. */
  label: string;
  short?: string;
  icon: IconName;
  link: string;
}

/** Mobile bottom bar shows this many items directly; the rest go into the "Ko'proq" sheet. */
const BOTTOM_PRIMARY_COUNT = 4;

const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'nav.ai_assistant', short: 'nav.ai_assistant_short', icon: 'sparkles', link: '/ai-chat' },
  { label: 'nav.cafes', icon: 'store', link: '/super-admin/cafes' },
  { label: 'nav.discounts', icon: 'tag', link: '/super-admin/discounts' },
  { label: 'nav.ai_tools', short: 'nav.ai_tools_short', icon: 'wrench', link: '/super-admin/ai-tools' },
  { label: 'nav.ai_settings', icon: 'sliders', link: '/super-admin/ai-settings' },
  { label: 'nav.plans', icon: 'credit-card', link: '/super-admin/plans' },
  { label: 'nav.languages', icon: 'languages', link: '/super-admin/languages' },
  { label: 'nav.system_messages', icon: 'message', link: '/super-admin/system-messages' },
  { label: 'nav.legal', icon: 'book-open', link: '/super-admin/legal' },
  { label: 'nav.files', icon: 'hard-drive', link: '/super-admin/files' },
  { label: 'nav.settings', icon: 'settings', link: '/super-admin/settings' },
  { label: 'nav.profile', icon: 'user', link: '/profile' }
];

const CAFE_ADMIN_NAV: NavItem[] = [
  { label: 'nav.ai_assistant', short: 'nav.ai_assistant_short', icon: 'sparkles', link: '/ai-chat' },
  { label: 'nav.my_cafes', short: 'nav.cafes', icon: 'store', link: '/cafe-admin/cafes' },
  { label: 'nav.discounts', icon: 'tag', link: '/cafe-admin/discounts' },
  { label: 'nav.billing', short: 'nav.billing_short', icon: 'credit-card', link: '/billing' },
  { label: 'nav.profile', icon: 'user', link: '/profile' }
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, AvatarComponent, UpgradeBannerComponent,
    UpgradeDialogComponent, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe
  ],
  styles: `
    .bottom-nav {
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    }

    .nav-indicator {
      transition: transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 220ms ease;
    }

    .nav-item .nav-icon {
      transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), color 200ms ease;
    }
    .nav-item .nav-label {
      transition: color 200ms ease, transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .nav-item.is-active .nav-icon {
      transform: translateY(-2px) scale(1.12);
    }
    .nav-item.is-active .nav-label {
      transform: translateY(-1px);
    }
    .nav-item:active .nav-icon {
      transform: scale(0.82);
      transition-duration: 120ms;
    }
    .nav-item.is-active .nav-icon-wrap {
      animation: nav-pop 560ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .sheet-backdrop {
      animation: fade-in 220ms ease-out both;
    }
    .sheet {
      animation: sheet-up 440ms cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    .sheet-item {
      animation: item-in 400ms cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }

    @keyframes nav-pop {
      0% { transform: scale(1); }
      35% { transform: scale(0.8) rotate(-8deg); }
      70% { transform: scale(1.1) rotate(4deg); }
      100% { transform: scale(1) rotate(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sheet-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes item-in {
      from { opacity: 0; transform: translateY(14px) scale(0.92); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      .nav-indicator, .nav-item .nav-icon, .nav-item .nav-label { transition: none; }
      .nav-item.is-active .nav-icon-wrap, .sheet-backdrop, .sheet, .sheet-item { animation: none; }
    }
  `,
  template: `
    <div class="min-h-screen bg-canvas lg:pl-64 print:bg-surface print:pl-0">

      <header class="palette-light sticky top-0 z-30 flex h-16 print:hidden items-center justify-between border-b border-espresso-800
                     bg-espresso-900/95 px-4 backdrop-blur lg:hidden">
        <app-logo [dark]="true" [size]="26" />
        <div class="flex items-center gap-1">
          <app-theme-toggle [dark]="true" />
          <app-language-switcher [dark]="true" />
          <a routerLink="/profile" [attr.aria-label]="'nav.profile' | t" class="rounded-full p-1 transition active:scale-90">
            <app-avatar [name]="email()" [size]="32" />
          </a>
          <button type="button" (click)="logout()" [attr.aria-label]="'nav.logout' | t"
                  class="rounded-lg p-2 text-espresso-300 transition hover:bg-espresso-800 hover:text-white active:scale-90">
            <app-icon name="logout" [size]="20" />
          </button>
        </div>
      </header>

      <aside class="palette-light fixed inset-y-0 left-0 z-50 hidden w-64 flex-col bg-espresso-900 px-4 pt-6 pb-4 print:hidden lg:flex">
        <div class="mb-8 flex items-center justify-between gap-2 px-2">
          <app-logo [dark]="true" [size]="34" />
          <div class="flex items-center gap-1">
            <app-theme-toggle [dark]="true" />
            <app-language-switcher [dark]="true" />
          </div>
        </div>

        <nav class="flex flex-1 flex-col gap-1">
          @for (item of navItems(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-accent-500! text-white! shadow-lg shadow-accent-500/20"
              class="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-espresso-100/80
                     transition hover:bg-espresso-800 hover:text-white"
            >
              <app-icon [name]="item.icon" [size]="20" />
              {{ item.label | t }}
            </a>
          }
        </nav>

        <div class="flex items-center gap-3 rounded-2xl border border-espresso-800 bg-espresso-950/40 p-3">
          <app-avatar [name]="email()" [size]="40" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{{ roleLabel() | t }}</p>
            <p class="truncate text-xs text-espresso-300">{{ email() }}</p>
          </div>
          <button type="button" (click)="logout()" [attr.aria-label]="'nav.logout' | t" [title]="'nav.logout' | t"
                  class="rounded-lg p-2 text-espresso-300 transition hover:bg-espresso-800 hover:text-white">
            <app-icon name="logout" [size]="20" />
          </button>
        </div>
      </aside>

      <main class="mx-auto max-w-7xl px-4 pt-8 pb-32 sm:px-6 lg:px-10 lg:py-10 print:max-w-none print:p-0">
        @if (!isSuperAdmin() && !onBillingPage()) {
          <app-upgrade-banner />
        }
        <div #page>
          <router-outlet (activate)="animatePage()" />
        </div>
      </main>

      @if (moreOpen()) {
        <div class="sheet-backdrop palette-light fixed inset-0 z-30 bg-espresso-950/50 backdrop-blur-sm lg:hidden"
             (click)="moreOpen.set(false)"></div>
        <div class="sheet fixed inset-x-0 bottom-0 z-[35] max-h-[85vh] overflow-y-auto rounded-t-[2rem] bg-surface px-5 pt-3
                    pb-32 shadow-pop lg:hidden"
             role="dialog" [attr.aria-label]="'nav.more_sections' | t">
          <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line-strong"></div>

          <div class="sheet-item mb-4 flex items-center gap-3 rounded-2xl bg-canvas p-3">
            <app-avatar [name]="email()" [size]="40" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-espresso-900">{{ roleLabel() | t }}</p>
              <p class="truncate text-xs text-espresso-400">{{ email() }}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            @for (item of moreItems(); track item.link; let i = $index) {
              <a
                [routerLink]="item.link"
                routerLinkActive="bg-accent-50! text-accent-600! ring-accent-200!"
                class="sheet-item flex flex-col items-center gap-2 rounded-2xl bg-canvas px-2 py-4 text-center
                       text-espresso-700 ring-1 ring-transparent transition active:scale-95"
                [style.animation-delay]="(i + 1) * 35 + 'ms'"
              >
                <app-icon [name]="item.icon" [size]="24" />
                <span class="text-xs font-medium leading-tight">{{ item.label | t }}</span>
              </a>
            }
          </div>
        </div>
      }

      <nav class="bottom-nav palette-light fixed inset-x-0 bottom-0 z-40 px-3 print:hidden lg:hidden" [attr.aria-label]="'nav.main_menu' | t">
        <div class="relative mx-auto flex max-w-md items-stretch rounded-3xl border border-white/10 bg-espresso-900/90 p-1.5
                    shadow-[0_12px_40px_rgb(17_18_20/0.35)] backdrop-blur-xl">
          <span
            class="nav-indicator pointer-events-none absolute inset-y-1.5 left-1.5 rounded-2xl bg-accent-500
                   shadow-lg shadow-accent-500/40"
            [style.width]="'calc((100% - 0.75rem) / ' + slotCount() + ')'"
            [style.transform]="'translateX(' + indicatorSlot() * 100 + '%)'"
            [style.opacity]="indicatorSlot() < 0 ? 0 : 1"
          ></span>

          @for (item of primaryItems(); track item.link; let i = $index) {
            @let active = indicatorSlot() === i;
            <a
              [routerLink]="item.link"
              (click)="tap()"
              class="nav-item relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2"
              [class.is-active]="active"
              [attr.aria-current]="active ? 'page' : null"
            >
              <span class="nav-icon-wrap inline-flex">
                <app-icon [name]="item.icon" [size]="22" class="nav-icon"
                          [class.text-white]="active" [class.text-espresso-300]="!active" />
              </span>
              <span class="nav-label max-w-full truncate px-1 text-[10.5px] font-semibold"
                    [class.text-white]="active" [class.text-espresso-300]="!active">
                {{ (item.short ?? item.label) | t }}
              </span>
            </a>
          }

          @if (moreItems().length) {
            @let active = indicatorSlot() === primaryItems().length;
            <button
              type="button"
              (click)="toggleMore()"
              class="nav-item relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2"
              [class.is-active]="active"
              [attr.aria-expanded]="moreOpen()"
            >
              <span class="nav-icon-wrap inline-flex">
                <app-icon [name]="moreOpen() ? 'x' : 'grid'" [size]="22" class="nav-icon"
                          [class.text-white]="active" [class.text-espresso-300]="!active" />
              </span>
              <span class="nav-label text-[10.5px] font-semibold"
                    [class.text-white]="active" [class.text-espresso-300]="!active">
                {{ 'nav.more' | t }}
              </span>
            </button>
          }
        </div>
      </nav>

      <app-upgrade-dialog />
    </div>
  `
})
export class ShellComponent {

  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly upgradePrompt = inject(UpgradePromptService);

  private readonly page = viewChild<ElementRef<HTMLElement>>('page');

  protected readonly moreOpen = signal(false);
  protected readonly onBillingPage = signal(false);
  private readonly currentUrl = signal(this.router.url);

  private readonly claims = signal(this.tokenStorage.getClaims());
  protected readonly email = computed(() => this.claims()?.email ?? '');
  protected readonly isSuperAdmin = computed(() => this.claims()?.role === ROLE_SUPER_ADMIN);
  protected readonly roleLabel = computed(() => (this.isSuperAdmin() ? 'role.super_admin' : 'role.cafe_admin'));
  protected readonly navItems = computed(() => (this.isSuperAdmin() ? SUPER_ADMIN_NAV : CAFE_ADMIN_NAV));

  private readonly hasMore = computed(() => this.navItems().length > BOTTOM_PRIMARY_COUNT + 1);
  protected readonly primaryItems = computed(() =>
    this.hasMore() ? this.navItems().slice(0, BOTTOM_PRIMARY_COUNT) : this.navItems()
  );
  protected readonly moreItems = computed(() => (this.hasMore() ? this.navItems().slice(BOTTOM_PRIMARY_COUNT) : []));
  protected readonly slotCount = computed(() => this.primaryItems().length + (this.moreItems().length ? 1 : 0));

  /** Bottom-bar slot of the current route; -1 when no nav item matches. */
  private readonly activeSlot = computed(() => {
    this.currentUrl();
    const primary = this.primaryItems().findIndex((item) => this.isActive(item.link));
    if (primary >= 0) {
      return primary;
    }
    return this.moreItems().some((item) => this.isActive(item.link)) ? this.primaryItems().length : -1;
  });

  /** While the sheet is open the indicator slides onto the "Ko'proq" button. */
  protected readonly indicatorSlot = computed(() => (this.moreOpen() ? this.primaryItems().length : this.activeSlot()));

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.moreOpen.set(false);
        this.currentUrl.set(this.router.url);
        this.onBillingPage.set(this.router.url.startsWith('/billing'));
        if (!this.isSuperAdmin()) {
          this.upgradePrompt.refresh();
        }
      });
  }

  protected toggleMore(): void {
    this.tap();
    this.moreOpen.update((open) => !open);
  }

  protected animatePage(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    this.page()?.nativeElement.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }

  protected tap(): void {
    navigator.vibrate?.(8);
  }

  private isActive(link: string): boolean {
    return this.router.isActive(link, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  protected logout(): void {
    this.upgradePrompt.clear();
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}
