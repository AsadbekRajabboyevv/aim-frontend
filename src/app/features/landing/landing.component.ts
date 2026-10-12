import { Component, DOCUMENT, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROLE_SUPER_ADMIN } from '../../core/constants/api.constants';
import { BillingPeriod, PlanCatalogDto, PlanResponseDto } from '../../core/models/billing.model';
import { AuthService } from '../../core/services/auth.service';
import { BillingService } from '../../core/services/billing.service';
import { entitlementText, money, monthlyEquivalent, name, yearlySavingPercent } from '../../core/utils/billing.util';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface DemoDish {
  key: string;
  price: number;
  discountPrice?: number;
  soldOut?: boolean;
  spicy?: boolean;
  /** Plate illustration: background, plate rim, food. */
  colors: [string, string, string];
}

interface Feature {
  key: string;
  icon: IconName;
}

const DEMO_DISHES: DemoDish[] = [
  { key: 'osh', price: 45000, colors: ['#efe3cc', '#ffffff', '#d99a3e'] },
  { key: 'lagman', price: 42000, spicy: true, colors: ['#e9d6d2', '#ffffff', '#c2432f'] },
  { key: 'manti', price: 35000, soldOut: true, colors: ['#e4e6dc', '#ffffff', '#efe2c4'] },
  { key: 'kabob', price: 28000, discountPrice: 23800, colors: ['#e7dccf', '#ffffff', '#8a4b2a'] }
];

const DEMO_CATEGORIES = ['hot', 'salads', 'drinks', 'desserts'];

/** Paper menu behind the tablet: the old price is struck out and corrected by hand. */
const PAPER_LINES = [
  { key: 'osh', old: '38 000', fixed: '45 000' },
  { key: 'lagman', old: '36 000', fixed: '42 000' },
  { key: 'manti', old: '30 000', fixed: null },
  { key: 'kabob', old: '25 000', fixed: '28 000' }
];

const FEATURES: Feature[] = [
  { key: 'tablet', icon: 'tablet' },
  { key: 'qr', icon: 'qr' },
  { key: 'stop', icon: 'ban' },
  { key: 'discounts', icon: 'tag' },
  { key: 'branches', icon: 'store' },
  { key: 'languages', icon: 'languages' },
  { key: 'ai', icon: 'message' }
];

const STEPS = ['register', 'menu', 'open'];
const FAQ = ['device', 'refresh', 'branches', 'languages', 'payment'];
const DEMO_DISCOUNTS = [0, 10, 15, 20];

@Component({
  selector: 'app-landing',
  standalone: true,
  // The marketing page keeps its light design in dark mode
  host: { class: 'palette-light block bg-canvas' },
  imports: [RouterLink, IconComponent, LogoComponent, LanguageSwitcherComponent, TranslatePipe],
  styles: `
    :host {
      display: block;
      background: var(--color-canvas);
    }
    .paper {
      background:
        repeating-linear-gradient(to bottom, transparent 0 27px, rgb(27 28 32 / 0.06) 27px 28px),
        #fbf8f1;
    }
    .receipt {
      -webkit-mask: radial-gradient(circle 7px at 50% 100%, #0000 97%, #000) 50% 0 / 18px 100%;
      mask: radial-gradient(circle 7px at 50% 100%, #0000 97%, #000) 50% 0 / 18px 100%;
    }
    .leader {
      flex: 1;
      min-width: 1rem;
      border-bottom: 1px dotted currentColor;
      transform: translateY(-0.3em);
      opacity: 0.35;
    }
    .flash {
      animation: flash 900ms ease-out;
    }
    @keyframes flash {
      0% { box-shadow: 0 0 0 0 rgb(224 20 30 / 0.45); }
      100% { box-shadow: 0 0 0 14px rgb(224 20 30 / 0); }
    }
    details > summary {
      list-style: none;
    }
    details > summary::-webkit-details-marker {
      display: none;
    }
    details[open] .faq-sign {
      transform: rotate(45deg);
    }
    @media (prefers-reduced-motion: reduce) {
      .flash { animation: none; }
    }
  `,
  template: `
    <!-- Header -->
    <header class="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a routerLink="/" class="shrink-0" aria-label="AIM"><app-logo [size]="30" /></a>

        <nav class="hidden items-center gap-6 text-sm text-espresso-500 md:flex">
          <a href="#features" (click)="scrollTo($event, 'features')" class="hover:text-espresso-900">{{ 'landing.nav.features' | t }}</a>
          <a href="#how" (click)="scrollTo($event, 'how')" class="hover:text-espresso-900">{{ 'landing.nav.how' | t }}</a>
          @if (plans().length) {
            <a href="#pricing" (click)="scrollTo($event, 'pricing')" class="hover:text-espresso-900">{{ 'landing.nav.pricing' | t }}</a>
          }
          <a href="#faq" (click)="scrollTo($event, 'faq')" class="hover:text-espresso-900">{{ 'landing.nav.faq' | t }}</a>
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <app-language-switcher />
          @if (signedIn) {
            <a [routerLink]="dashboardLink"
               class="inline-flex h-9 items-center rounded-lg bg-espresso-900 px-4 text-sm font-semibold text-white hover:bg-espresso-800">
              {{ 'landing.nav.dashboard' | t }}
            </a>
          } @else {
            <a routerLink="/auth/login" class="hidden h-9 items-center px-3 text-sm font-medium text-espresso-700 hover:text-espresso-900 sm:inline-flex">
              {{ 'landing.nav.login' | t }}
            </a>
            <a routerLink="/auth/register"
               class="inline-flex h-9 items-center rounded-lg bg-espresso-900 px-4 text-sm font-semibold text-white hover:bg-espresso-800">
              {{ 'landing.nav.register' | t }}
            </a>
          }
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:pt-20 lg:pb-28">
      <div>
        <p class="flex items-center gap-3 text-sm font-medium text-espresso-500">
          <span class="h-px w-8 bg-accent-500"></span>
          {{ 'landing.hero.eyebrow' | t }}
        </p>
        <h1 class="mt-6 font-display text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-espresso-950 sm:text-6xl">
          {{ 'landing.hero.title' | t }}
          <em class="font-medium text-accent-600">{{ 'landing.hero.title_accent' | t }}</em>
        </h1>
        <p class="mt-6 max-w-lg text-lg leading-relaxed text-espresso-500">{{ 'landing.hero.text' | t }}</p>

        <div class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a [routerLink]="signedIn ? dashboardLink : '/auth/register'"
             class="inline-flex h-12 items-center gap-2 rounded-xl bg-accent-500 px-6 text-base font-semibold text-white transition hover:bg-accent-600">
            {{ (signedIn ? 'landing.nav.dashboard' : 'landing.hero.cta') | t }}
            <app-icon name="chevron-right" [size]="18" />
          </a>
          <a href="#demo" (click)="scrollTo($event, 'demo')"
             class="text-base font-medium text-espresso-800 underline decoration-espresso-300 underline-offset-[6px] hover:decoration-espresso-800">
            {{ 'landing.hero.cta_secondary' | t }}
          </a>
        </div>
        <p class="mt-6 text-sm text-espresso-400">{{ 'landing.hero.note' | t }}</p>
      </div>

      <!-- Paper menu + tablet -->
      <div class="relative lg:pl-6">
        <div class="paper absolute -top-6 right-0 hidden w-64 rotate-[4deg] rounded-md px-6 pt-6 pb-8 shadow-pop sm:block" aria-hidden="true">
          <p class="text-center font-display text-lg tracking-[0.3em] text-espresso-800">{{ 'landing.paper.title' | t }}</p>
          <ul class="mt-5 flex flex-col gap-5 text-[13px] text-espresso-700">
            @for (line of paperLines; track line.key) {
              <li class="flex items-baseline gap-1.5">
                <span class="truncate">{{ 'landing.demo.dish.' + line.key | t }}</span>
                <span class="leader"></span>
                <span class="relative shrink-0 tabular-nums">
                  <span [class.line-through]="true" class="decoration-accent-600 decoration-2">{{ line.old }}</span>
                  @if (line.fixed) {
                    <span class="absolute -top-5 -right-3 -rotate-6 font-hand text-xl leading-none text-blue-700">{{ line.fixed }}</span>
                  } @else {
                    <span class="absolute -top-5 -right-6 -rotate-3 font-hand text-lg leading-none whitespace-nowrap text-blue-700">{{ 'landing.paper.none' | t }}</span>
                  }
                </span>
              </li>
            }
          </ul>
        </div>

        <div class="relative mr-auto max-w-xl rounded-[1.75rem] bg-espresso-950 p-2.5 shadow-[0_30px_60px_-20px_rgb(27_28_32/0.45)] sm:mt-36 sm:mr-12 sm:p-3 lg:-ml-4">
          <div class="flex aspect-[4/3] overflow-hidden rounded-[1.2rem] bg-canvas text-left">
            <aside class="hidden w-[30%] shrink-0 flex-col bg-espresso-900 px-3 py-5 sm:flex">
              <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-500 font-display text-lg text-white ring-2 ring-accent-500/40 ring-offset-2 ring-offset-espresso-900">B</div>
              <p class="mt-3 text-center font-display text-sm text-white">{{ 'landing.demo.cafe' | t }}</p>
              <ul class="mt-5 flex flex-col gap-1">
                @for (category of categories; track category; let first = $first) {
                  <li class="truncate rounded-xl px-3 py-2 text-[11px]"
                      [class]="first ? 'bg-accent-500 font-semibold text-white' : 'text-espresso-300'">
                    {{ 'landing.demo.cat.' + category | t }}
                  </li>
                }
              </ul>
            </aside>

            <div class="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <div class="flex items-end justify-between gap-3">
                <div>
                  <p class="font-display text-xl font-semibold text-espresso-900 sm:text-2xl">{{ 'landing.demo.cat.hot' | t }}</p>
                  <p class="font-display text-[11px] text-espresso-400">{{ 'landing.demo.items' | t: { count: dishes.length } }}</p>
                </div>
                <span class="hidden items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[10px] text-espresso-300 sm:flex">
                  <app-icon name="search" [size]="11" /> {{ 'landing.demo.search' | t }}
                </span>
              </div>

              <div class="mt-3 grid flex-1 grid-cols-2 gap-2.5">
                @for (dish of dishes; track dish.key) {
                  <div class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-white p-1.5">
                    <div class="relative flex flex-1 items-center justify-center rounded-lg" [style.background]="dish.colors[0]"
                         [class.grayscale]="dish.soldOut" [class.opacity-60]="dish.soldOut">
                      <span class="flex aspect-square h-[70%] items-center justify-center rounded-full shadow-sm" [style.background]="dish.colors[1]">
                        <span class="block aspect-square h-[62%] rounded-full" [style.background]="dish.colors[2]"></span>
                      </span>
                      @if (dish.soldOut) {
                        <span class="absolute top-1.5 right-1.5 rounded-full bg-white/90 px-1.5 py-px text-[9px] font-medium text-espresso-500">{{ 'landing.demo.sold_out' | t }}</span>
                      } @else if (dish.discountPrice) {
                        <span class="absolute top-1.5 left-1.5 rounded-full bg-red-600 px-1.5 py-px text-[9px] font-semibold text-white">-15%</span>
                      } @else if (dish.spicy) {
                        <span class="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-px text-[9px] font-semibold text-white">
                          <app-icon name="flame" [size]="9" /> {{ 'landing.demo.spicy' | t }}
                        </span>
                      }
                    </div>
                    <div class="flex flex-col px-1 pt-1.5 pb-0.5 leading-tight" [class.opacity-60]="dish.soldOut">
                      <span class="truncate font-display text-[11px] font-semibold text-espresso-900 sm:text-xs">{{ 'landing.demo.dish.' + dish.key | t }}</span>
                      <span class="shrink-0 text-[10px] font-semibold tabular-nums sm:text-[11px]"
                            [class]="dish.soldOut ? 'text-espresso-400' : dish.discountPrice ? 'text-red-600' : 'text-accent-600'">
                        {{ price(dish.discountPrice ?? dish.price) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Live demo -->
    <section id="demo" class="scroll-mt-16 border-y border-line bg-white">
      <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div>
          <p class="font-mono text-sm text-accent-600">01</p>
          <h2 class="mt-3 font-display text-4xl leading-tight font-semibold text-espresso-950">{{ 'landing.live.title' | t }}</h2>
          <p class="mt-4 max-w-md text-espresso-500">{{ 'landing.live.text' | t }}</p>

          <div class="mt-10 max-w-md rounded-2xl border border-line bg-canvas p-5 sm:p-6">
            <p class="text-xs font-semibold tracking-wide text-espresso-400 uppercase">{{ 'landing.live.panel' | t }}</p>
            <p class="mt-1 font-semibold text-espresso-900">{{ 'landing.demo.dish.lagman' | t }}</p>

            <label class="mt-5 block text-sm font-medium text-espresso-700" for="demo-price">{{ 'landing.live.price' | t }}</label>
            <div class="mt-1.5 flex h-11 items-center rounded-xl border border-line-strong bg-white pr-3 focus-within:border-espresso-500">
              <input id="demo-price" type="text" inputmode="numeric" [value]="priceInput()" (input)="onPrice($event)"
                     class="h-full min-w-0 flex-1 rounded-xl bg-transparent px-3 text-espresso-900 tabular-nums outline-none" />
              <span class="text-sm text-espresso-400">{{ 'common.currency' | t }}</span>
            </div>

            <p class="mt-5 text-sm font-medium text-espresso-700">{{ 'landing.live.discount' | t }}</p>
            <div class="mt-1.5 grid grid-cols-4 gap-1 rounded-xl border border-line-strong bg-white p-1" role="radiogroup">
              @for (value of discounts; track value) {
                <button type="button" role="radio" [attr.aria-checked]="discount() === value" (click)="setDiscount(value)"
                        class="h-8 rounded-lg text-sm font-medium tabular-nums transition"
                        [class]="discount() === value ? 'bg-espresso-900 text-white' : 'text-espresso-500 hover:bg-canvas'">
                  {{ value ? value + '%' : '—' }}
                </button>
              }
            </div>

            <label class="mt-5 flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span class="block text-sm font-medium text-espresso-700">{{ 'landing.live.stop' | t }}</span>
                <span class="block text-xs text-espresso-400">{{ 'landing.live.stop_hint' | t }}</span>
              </span>
              <input type="checkbox" class="peer sr-only" [checked]="soldOut()" (change)="toggleSoldOut()" />
              <span class="relative h-6 w-11 shrink-0 rounded-full bg-espresso-100 transition peer-checked:bg-accent-500 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-200
                           after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5"></span>
            </label>
          </div>
        </div>

        <div class="flex flex-col items-center justify-center rounded-3xl bg-canvas px-4 py-12 sm:px-10">
          <div class="w-full max-w-xs rounded-[1.25rem] border border-line bg-white p-2.5 shadow-card" [class.flash]="flashing()">
            <div class="relative flex aspect-[4/3] items-center justify-center rounded-2xl bg-[#e9d6d2]"
                 [class.grayscale]="soldOut()" [class.opacity-60]="soldOut()">
              <span class="flex h-[68%] aspect-square items-center justify-center rounded-full bg-white shadow-sm">
                <span class="block h-[62%] aspect-square rounded-full bg-[#c2432f]"></span>
              </span>
              @if (soldOut()) {
                <span class="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-espresso-500 shadow-sm">{{ 'landing.demo.sold_out' | t }}</span>
              } @else if (discount()) {
                <span class="absolute top-3 left-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">-{{ discount() }}%</span>
              }
            </div>
            <div class="px-2.5 pt-4 pb-2" [class.opacity-60]="soldOut()">
              <p class="font-display text-xl font-semibold text-espresso-900">{{ 'landing.demo.dish.lagman' | t }}</p>
              <p class="mt-1 text-sm text-espresso-400">{{ 'landing.demo.dish.lagman_desc' | t }}</p>
              <div class="mt-4 flex items-baseline gap-2">
                <span class="text-lg font-semibold tabular-nums"
                      [class]="soldOut() ? 'text-espresso-400' : discount() ? 'text-red-600' : 'text-accent-600'">
                  {{ price(finalPrice()) }}
                </span>
                @if (discount()) {
                  <span class="text-sm text-espresso-400 tabular-nums line-through">{{ price(demoPrice()) }}</span>
                }
              </div>
            </div>
          </div>
          <p class="mt-6 flex items-center gap-2 text-sm text-espresso-400">
            <app-icon name="tablet" [size]="16" />
            {{ 'landing.live.caption' | t }}
          </p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="scroll-mt-16">
      <div class="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
        <div class="lg:sticky lg:top-28 lg:self-start">
          <p class="font-mono text-sm text-accent-600">02</p>
          <h2 class="mt-3 font-display text-4xl leading-tight font-semibold text-espresso-950">{{ 'landing.features.title' | t }}</h2>
          <p class="mt-4 max-w-sm text-espresso-500">{{ 'landing.features.text' | t }}</p>
        </div>

        <ul class="border-t border-espresso-900">
          @for (feature of features; track feature.key; let i = $index) {
            <li class="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-1 border-b border-line py-6 sm:grid-cols-[2.5rem_14rem_1fr] sm:gap-x-6">
              <span class="pt-1 font-mono text-xs text-espresso-400 tabular-nums">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <h3 class="flex items-center gap-2.5 self-start text-lg font-semibold text-espresso-900">
                <app-icon [name]="feature.icon" [size]="18" class="text-accent-600" />
                {{ 'landing.feature.' + feature.key + '.title' | t }}
              </h3>
              <p class="col-start-2 leading-relaxed text-espresso-500 sm:col-start-3">{{ 'landing.feature.' + feature.key + '.text' | t }}</p>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="coffee-pattern scroll-mt-16 bg-espresso-900">
      <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <p class="font-mono text-sm text-accent-500">03</p>
          <h2 class="mt-3 font-display text-4xl leading-tight font-semibold text-white">{{ 'landing.steps.title' | t }}</h2>
          <p class="mt-4 max-w-md text-espresso-300">{{ 'landing.steps.text' | t }}</p>
        </div>

        <div class="receipt mx-auto w-full max-w-sm -rotate-1 bg-[#fbf8f1] px-7 pt-8 pb-12 font-mono text-[13px] text-espresso-800 shadow-pop">
          <p class="text-center text-xs tracking-[0.25em] text-espresso-500">AIM · {{ 'landing.steps.receipt' | t }}</p>
          <p class="mt-1 text-center text-xs text-espresso-400">{{ today }}</p>
          <div class="my-5 border-t border-dashed border-espresso-300"></div>
          <ol class="flex flex-col gap-5">
            @for (step of steps; track step; let i = $index) {
              <li>
                <p class="flex items-baseline gap-2 font-semibold text-espresso-900">
                  <span>{{ i + 1 }}.</span>
                  <span>{{ 'landing.step.' + step + '.title' | t }}</span>
                  <span class="leader"></span>
                  <app-icon name="check" [size]="14" class="text-accent-600" />
                </p>
                <p class="mt-1 pl-5 font-sans text-[13px] leading-snug text-espresso-500">{{ 'landing.step.' + step + '.text' | t }}</p>
              </li>
            }
          </ol>
          <div class="my-5 border-t border-dashed border-espresso-300"></div>
          <p class="flex items-baseline justify-between text-sm font-semibold text-espresso-950">
            <span>{{ 'landing.steps.total_label' | t }}</span>
            <span>{{ 'landing.steps.total' | t }}</span>
          </p>
          <p class="mt-6 text-center text-xs text-espresso-400">{{ 'landing.steps.thanks' | t }}</p>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    @if (plans().length) {
      <section id="pricing" class="scroll-mt-16">
        <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="font-mono text-sm text-accent-600">04</p>
              <h2 class="mt-3 font-display text-4xl leading-tight font-semibold text-espresso-950">{{ 'landing.pricing.title' | t }}</h2>
              <p class="mt-4 max-w-md text-espresso-500">{{ 'billing.plans_hint' | t }}</p>
            </div>
            <div class="inline-flex self-start rounded-xl border border-line-strong bg-white p-1 lg:self-auto" role="radiogroup" [attr.aria-label]="'billing.billing_period' | t">
              @for (option of periods; track option) {
                <button type="button" role="radio" [attr.aria-checked]="period() === option" (click)="period.set(option)"
                        class="h-9 rounded-lg px-4 text-sm font-medium transition"
                        [class]="period() === option ? 'bg-espresso-900 text-white' : 'text-espresso-500 hover:text-espresso-900'">
                  {{ 'billing.period.' + option | t }}
                  @if (option === 'YEARLY' && maxSaving() > 0) {
                    <span class="ml-1 text-xs" [class]="period() === option ? 'text-accent-200' : 'text-accent-600'">−{{ maxSaving() }}%</span>
                  }
                </button>
              }
            </div>
          </div>

          <div class="mt-12 grid gap-5" [class]="gridColumns()">
            @for (plan of plans(); track plan.slug) {
              <article class="flex flex-col rounded-2xl border p-7"
                       [class]="plan.recommended ? 'border-espresso-900 bg-espresso-900 text-white' : 'border-line bg-white text-espresso-900'">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-display text-2xl font-semibold">{{ planName(plan) }}</h3>
                  @if (plan.recommended) {
                    <span class="rounded-full bg-accent-500 px-2.5 py-1 text-xs font-semibold text-white">{{ 'landing.pricing.popular' | t }}</span>
                  }
                </div>
                @if (planDescription(plan)) {
                  <p class="mt-2 text-sm" [class]="plan.recommended ? 'text-espresso-300' : 'text-espresso-500'">{{ planDescription(plan) }}</p>
                }
                <p class="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                  @if (planMonthly(plan) > 0) {
                    <span class="text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums xl:text-[1.7rem]">{{ planPriceText(plan) }}</span>
                    <span class="text-sm" [class]="plan.recommended ? 'text-espresso-300' : 'text-espresso-400'">/ {{ 'billing.per_month' | t }}</span>
                  } @else {
                    <span class="text-3xl font-semibold tracking-tight">{{ 'landing.pricing.free' | t }}</span>
                  }
                </p>

                <ul class="mt-6 flex flex-1 flex-col gap-3 border-t pt-6 text-sm" [class]="plan.recommended ? 'border-espresso-700' : 'border-line'">
                  @for (limit of limits(); track limit.key) {
                    <li class="flex items-start justify-between gap-4">
                      <span [class]="plan.recommended ? 'text-espresso-300' : 'text-espresso-500'">{{ limitName(limit.nameTranslations) }}</span>
                      <span class="text-right font-medium whitespace-nowrap">{{ entitlement(plan, limit) }}</span>
                    </li>
                  }
                </ul>

                <a [routerLink]="signedIn ? '/billing' : '/auth/register'"
                   class="mt-8 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition"
                   [class]="plan.recommended ? 'bg-accent-500 text-white hover:bg-accent-600' : 'border border-line-strong text-espresso-900 hover:bg-canvas'">
                  {{ 'billing.choose' | t }}
                </a>
              </article>
            }
          </div>
        </div>
      </section>
    }

    <!-- FAQ -->
    <section id="faq" class="scroll-mt-16 border-t border-line bg-white">
      <div class="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
        <div>
          <p class="font-mono text-sm text-accent-600">{{ plans().length ? '05' : '04' }}</p>
          <h2 class="mt-3 font-display text-4xl leading-tight font-semibold text-espresso-950">{{ 'landing.faq.title' | t }}</h2>
        </div>
        <div class="border-t border-espresso-900">
          @for (item of faq; track item) {
            <details class="group border-b border-line">
              <summary class="flex cursor-pointer items-center justify-between gap-6 py-5 text-left text-lg font-medium text-espresso-900">
                {{ 'landing.faq.' + item + '.q' | t }}
                <span class="faq-sign shrink-0 text-2xl leading-none font-light text-espresso-400 transition-transform">+</span>
              </summary>
              <p class="max-w-2xl pb-6 leading-relaxed text-espresso-500">{{ 'landing.faq.' + item + '.a' | t }}</p>
            </details>
          }
        </div>
      </div>
    </section>

    <!-- Closing call to action -->
    <section class="bg-accent-500">
      <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <h2 class="max-w-2xl font-display text-4xl leading-tight font-semibold text-white sm:text-5xl">{{ 'landing.cta.title' | t }}</h2>
        <a [routerLink]="signedIn ? dashboardLink : '/auth/register'"
           class="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-xl bg-white px-6 text-base font-semibold text-espresso-950 transition hover:bg-espresso-50 lg:self-auto">
          {{ (signedIn ? 'landing.nav.dashboard' : 'landing.hero.cta') | t }}
          <app-icon name="chevron-right" [size]="18" />
        </a>
      </div>
    </section>

    <footer class="bg-espresso-950 text-espresso-300">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:px-6 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <app-logo [dark]="true" [size]="26" />
          <span>{{ 'landing.footer.tagline' | t }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <a routerLink="/terms" class="hover:text-white">{{ 'legal.terms' | t }}</a>
          <a routerLink="/privacy" class="hover:text-white">{{ 'legal.privacy' | t }}</a>
          <a routerLink="/auth/login" class="hover:text-white">{{ 'landing.nav.login' | t }}</a>
          <span class="text-espresso-500">© {{ year }} AIM</span>
        </div>
      </div>
    </footer>
  `
})
export class LandingComponent implements OnInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private readonly billingService = inject(BillingService);
  private readonly document = inject(DOCUMENT);

  protected readonly dishes = DEMO_DISHES;
  protected readonly categories = DEMO_CATEGORIES;
  protected readonly paperLines = PAPER_LINES;
  protected readonly features = FEATURES;
  protected readonly steps = STEPS;
  protected readonly faq = FAQ;
  protected readonly discounts = DEMO_DISCOUNTS;
  protected readonly periods: BillingPeriod[] = ['MONTHLY', 'YEARLY'];

  protected readonly signedIn = this.authService.isAuthenticated();
  protected readonly dashboardLink = this.authService.currentRole() === ROLE_SUPER_ADMIN ? '/super-admin/cafes' : '/cafe-admin/cafes';
  protected readonly year = new Date().getFullYear();
  protected readonly today = new Date().toLocaleDateString('ru-RU');

  // Live demo
  protected readonly demoPrice = signal(42000);
  protected readonly priceInput = signal(formatNumber(42000));
  protected readonly discount = signal(0);
  protected readonly soldOut = signal(false);
  protected readonly flashing = signal(false);
  protected readonly finalPrice = computed(() => Math.round((this.demoPrice() * (100 - this.discount())) / 100 / 100) * 100);
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  // Pricing
  private readonly catalog = signal<PlanCatalogDto | null>(null);
  protected readonly period = signal<BillingPeriod>('MONTHLY');
  protected readonly plans = computed(() =>
    (this.catalog()?.plans ?? []).filter((plan) => plan.active).sort((a, b) => a.sortOrder - b.sortOrder)
  );
  protected readonly limits = computed(() => [...(this.catalog()?.limits ?? [])].sort((a, b) => a.sortOrder - b.sortOrder));
  protected readonly currency = computed(() => this.catalog()?.currency ?? 'UZS');
  protected readonly maxSaving = computed(() => Math.max(0, ...this.plans().map((plan) => yearlySavingPercent(plan, this.currency()))));

  ngOnInit(): void {
    this.billingService.publicPlans().subscribe({
      next: (response) => this.catalog.set(response.data ?? null),
      error: () => this.catalog.set(null)
    });
  }

  ngOnDestroy(): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
  }

  protected scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected price(amount: number): string {
    return money(amount, 'UZS');
  }

  protected onPrice(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 9);
    const value = digits ? Number(digits) : 0;
    this.demoPrice.set(value);
    this.priceInput.set(digits ? formatNumber(value) : '');
    input.value = this.priceInput();
    this.flash();
  }

  protected setDiscount(value: number): void {
    this.discount.set(value);
    this.flash();
  }

  protected toggleSoldOut(): void {
    this.soldOut.update((value) => !value);
    this.flash();
  }

  protected planName(plan: PlanResponseDto): string {
    return name(plan.nameTranslations, plan.slug);
  }

  protected planDescription(plan: PlanResponseDto): string {
    return name(plan.descriptionTranslations);
  }

  protected planMonthly(plan: PlanResponseDto): number {
    return monthlyEquivalent(plan, this.period(), this.currency());
  }

  protected planPriceText(plan: PlanResponseDto): string {
    return money(this.planMonthly(plan), this.currency());
  }

  protected gridColumns(): string {
    const count = this.plans().length;
    return count >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : count === 3 ? 'md:grid-cols-3' : count === 2 ? 'md:grid-cols-2 lg:max-w-4xl' : 'max-w-md';
  }

  protected limitName(translations: Record<string, string>): string {
    return name(translations);
  }

  protected readonly entitlement = entitlementText;

  /** Restarts the highlight around the demo card so each change is visible. */
  private flash(): void {
    this.flashing.set(false);
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    requestAnimationFrame(() => {
      this.flashing.set(true);
      this.flashTimer = setTimeout(() => this.flashing.set(false), 900);
    });
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU').replace(/\s/g, ' ');
}
