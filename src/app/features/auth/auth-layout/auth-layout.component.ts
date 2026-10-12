import { Component } from '@angular/core';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface Feature {
  icon: IconName;
  titleKey: string;
  textKey: string;
}

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [IconComponent, LogoComponent, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  template: `
    <div class="grid min-h-screen lg:grid-cols-2">
      <section class="palette-light coffee-pattern relative hidden flex-col justify-center overflow-hidden bg-espresso-900 px-16 py-12 lg:flex xl:px-24">
        <div class="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl"></div>
        <app-logo [dark]="true" [size]="56" class="mb-14" />

        <h1 class="max-w-lg text-4xl leading-tight font-bold text-white xl:text-5xl">
          {{ 'auth.hero.title' | t }}<br />
          <span class="text-accent-500">{{ 'auth.hero.title_accent' | t }}</span>
        </h1>
        <p class="mt-5 max-w-md text-lg text-espresso-300">
          {{ 'auth.hero.text' | t }}
        </p>

        <ul class="mt-12 flex flex-col gap-6">
          @for (feature of features; track feature.titleKey) {
            <li class="flex items-center gap-4">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-espresso-700 text-accent-500">
                <app-icon [name]="feature.icon" [size]="22" />
              </span>
              <div>
                <p class="font-semibold text-white">{{ feature.titleKey | t }}</p>
                <p class="text-sm text-espresso-300">{{ feature.textKey | t }}</p>
              </div>
            </li>
          }
        </ul>
      </section>

      <section class="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div class="absolute top-4 right-4 flex items-center gap-2">
          <app-theme-toggle />
          <app-language-switcher />
        </div>
        <div class="w-full max-w-md">
          <div class="mb-8 flex justify-center lg:hidden">
            <app-logo [size]="52" />
          </div>
          <div class="rounded-3xl border border-line bg-surface p-8 shadow-card sm:p-10">
            <ng-content></ng-content>
          </div>
        </div>
      </section>
    </div>
  `
})
export class AuthLayoutComponent {

  protected readonly features: Feature[] = [
    { icon: 'tablet', titleKey: 'auth.feature.tablet.title', textKey: 'auth.feature.tablet.text' },
    { icon: 'refresh', titleKey: 'auth.feature.prices.title', textKey: 'auth.feature.prices.text' },
    { icon: 'store', titleKey: 'auth.feature.branches.title', textKey: 'auth.feature.branches.text' }
  ];
}
