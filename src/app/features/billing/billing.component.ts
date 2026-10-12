import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BillingPeriod, BillingSummaryDto, LimitDefinitionResponseDto, PaymentProviderDto, PaymentResponseDto,
  PlanResponseDto, QuoteDto, Currency
} from '../../core/models/billing.model';
import { ROLE_CAFE_ADMIN } from '../../core/constants/api.constants';
import { BillingService } from '../../core/services/billing.service';
import { I18nService } from '../../core/services/i18n.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { UpgradePromptService } from '../../core/services/upgrade-prompt.service';
import {
  entitlementText, formatDate, money, monthlyEquivalent, name, periodLabel, planPrice, stateLabel as subscriptionStateLabel,
  usageText, yearlySavingPercent
} from '../../core/utils/billing.util';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const POLL_INTERVAL_MS = 3000;
const POLL_ATTEMPTS = 20;

const PROVIDER_STYLES: Record<string, string> = {
  payme: 'text-[#00b8c4]',
  click: 'text-[#0073ff]',
  uzum: 'text-[#7000ff]'
};

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, ButtonComponent, IconComponent, BadgeComponent, ModalComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.billing' | t" [subtitle]="'billing.subtitle' | t" />

    @if (notice(); as n) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
           [class]="n.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
             : n.tone === 'wait' ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-red-200 bg-red-50 text-red-700'">
        @if (n.tone === 'wait') {
          <span class="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
        } @else {
          <app-icon [name]="n.tone === 'ok' ? 'check' : 'alert'" [size]="18" class="mt-px" />
        }
        <span class="flex-1">{{ n.text }}</span>
        <button type="button" (click)="notice.set(null)" [attr.aria-label]="'common.close' | t" class="opacity-60 hover:opacity-100">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    @if (summary(); as s) {
      <section class="mb-8 grid gap-6 lg:grid-cols-5">
        <article class="rounded-card border border-line bg-surface p-6 shadow-card lg:col-span-2">
          <p class="text-xs font-semibold tracking-wide text-espresso-400 uppercase">{{ 'billing.current_plan' | t }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <h2 class="text-2xl font-bold text-espresso-900">{{ planName(s.plan) }}</h2>
            <app-badge [tone]="stateTone(s)">{{ stateLabel(s) }}</app-badge>
          </div>
          <dl class="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-espresso-400">{{ 'billing.billing_period' | t }}</dt>
              <dd class="mt-0.5 font-semibold text-espresso-900">{{ s.period ? periodLabel(s.period) : '—' }}</dd>
            </div>
            <div>
              <dt class="text-espresso-400">{{ (s.state === 'EXPIRED' ? 'billing.ended_on' : 'billing.valid_until') | t }}</dt>
              <dd class="mt-0.5 font-semibold text-espresso-900">
                {{ date(s.currentPeriodEnd) }}
                @if (s.daysLeft !== null) {
                  <span class="font-normal text-espresso-400">({{ 'billing.days' | t: { count: s.daysLeft } }})</span>
                }
              </dd>
            </div>
          </dl>
          @if (s.state === 'TRIAL') {
            <p class="mt-5 rounded-xl bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700">
              {{ 'billing.trial_notice' | t: { plan: planName(s.plan) } }}
            </p>
          }
          @if (s.state === 'EXPIRED' || s.state === 'FREE') {
            <p class="mt-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {{ 'billing.inactive_notice' | t }}
            </p>
          }
        </article>

        <article class="rounded-card border border-line bg-surface p-6 shadow-card lg:col-span-3">
          <p class="text-xs font-semibold tracking-wide text-espresso-400 uppercase">{{ 'billing.usage' | t }}</p>
          <ul class="mt-4 flex flex-col gap-4">
            @for (item of s.usage; track item.key) {
              <li>
                <div class="flex items-center justify-between gap-3 text-sm">
                  <span class="font-medium text-espresso-800">{{ label(item.nameTranslations, item.key) }}</span>
                  <span class="shrink-0 text-espresso-500" [class.text-red-600]="(item.percent ?? 0) >= 100"
                        [class.font-semibold]="(item.percent ?? 0) >= s.promptPercent">{{ usage(item) }}</span>
                </div>
                @if (item.kind !== 'FEATURE') {
                  <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-espresso-50">
                    <div class="h-full rounded-full transition-all" [style.width.%]="item.limit === null ? 4 : item.percent ?? 0"
                         [class]="(item.percent ?? 0) >= 100 ? 'bg-red-500' : (item.percent ?? 0) >= s.promptPercent ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                  </div>
                }
              </li>
            }
          </ul>
        </article>
      </section>
    } @else if (loading()) {
      <div class="mb-8 h-64 animate-pulse rounded-card bg-surface"></div>
    }

    @if (canBuy() && summary() && !summary()!.country) {
      <div class="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <app-icon name="globe" [size]="18" class="text-amber-600" />
        <span class="min-w-0 flex-1">{{ 'billing.country_missing' | t }}</span>
        <a routerLink="/profile"
           class="inline-flex h-9 items-center rounded-xl bg-accent-500 px-3.5 text-sm font-semibold text-white hover:bg-accent-600">
          {{ 'billing.choose_country' | t }}
        </a>
      </div>
    }

    <section class="mb-10">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-espresso-900">{{ 'nav.plans' | t }}</h2>
          <p class="text-sm text-espresso-400">{{ 'billing.plans_hint' | t }}</p>
        </div>
        <div class="inline-flex rounded-xl border border-line-strong bg-surface p-1" role="radiogroup" [attr.aria-label]="'billing.billing_period' | t">
          @for (option of periods; track option) {
            <button type="button" role="radio" [attr.aria-checked]="period() === option" (click)="period.set(option)"
                    class="rounded-lg px-4 py-1.5 text-sm font-semibold transition"
                    [class]="period() === option ? 'bg-espresso-900 text-espresso-50' : 'text-espresso-500 hover:text-espresso-900'">
              {{ periodLabel(option) }}
              @if (option === 'YEARLY' && maxSaving() > 0) {
                <span class="ml-1 rounded bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-espresso-950">-{{ maxSaving() }}%</span>
              }
            </button>
          }
        </div>
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        @for (plan of plans(); track plan.slug) {
          @let current = isCurrent(plan);
          @let highlighted = plan.slug === highlight();
          <article class="relative flex flex-col rounded-card border-2 bg-surface p-5 shadow-card transition"
                   [class]="highlighted ? 'border-accent-500 shadow-pop' : plan.recommended ? 'border-accent-200' : 'border-transparent'">
            @if (plan.recommended) {
              <span class="absolute -top-3 left-5 rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-bold text-white">{{ 'plans.badge.recommended' | t }}</span>
            }
            <h3 class="text-lg font-bold text-espresso-900">{{ planName(plan) }}</h3>
            <p class="text-sm text-espresso-400">{{ label(plan.descriptionTranslations) }}</p>
            <p class="mt-4">
              @if (soldIn(plan)) {
                <span class="text-2xl font-black text-espresso-900">{{ price(plan) }}</span>
                <span class="text-sm text-espresso-400"> / {{ 'billing.per_month' | t }}</span>
              } @else {
                <span class="text-base font-semibold text-espresso-400">{{ 'billing.not_in_currency' | t }}</span>
              }
            </p>
            @if (period() === 'YEARLY' && soldIn(plan)) {
              <p class="text-xs text-espresso-400">{{ 'billing.per_year_total' | t: { price: amount(planPrice(plan, 'YEARLY', currency()), currency()) } }}</p>
            }
            <ul class="mt-4 flex flex-1 flex-col gap-2 text-sm">
              @for (limit of limits(); track limit.key) {
                @let text = entitlement(plan, limit);
                @let excluded = isExcluded(plan, limit);
                <li class="flex items-start gap-2" [class.text-espresso-300]="excluded">
                  <app-icon [name]="excluded ? 'x' : 'check'" [size]="16"
                            [class]="excluded ? 'mt-0.5 text-espresso-300' : 'mt-0.5 text-emerald-600'" />
                  <span>{{ label(limit.nameTranslations, limit.key) }}: <b>{{ text }}</b></span>
                </li>
              }
            </ul>
            <app-button class="mt-5" [block]="true" [variant]="highlighted || plan.recommended ? 'primary' : 'secondary'"
                        [disabled]="!canBuy() || !soldIn(plan)" (clicked)="choose(plan)">
              {{ (current ? 'billing.extend' : upgradeLabel(plan)) | t }}
            </app-button>
          </article>
        } @empty {
          @if (!loading()) {
            <p class="text-sm text-espresso-400">{{ 'billing.no_plans' | t }}</p>
          }
        }
      </div>
      @if (!canBuy() && summary()) {
        <p class="mt-3 text-sm text-espresso-400">{{ 'billing.cafe_admin_buys' | t }}</p>
      }
    </section>

    <section>
      <h2 class="mb-4 text-xl font-bold text-espresso-900">{{ 'billing.history' | t }}</h2>
      <div class="relative overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-line text-xs tracking-wide text-espresso-400 uppercase">
            <tr>
              <th class="px-4 py-3">{{ 'plans.column.order' | t }}</th>
              <th class="px-4 py-3">{{ 'plans.column.plan' | t }}</th>
              <th class="px-4 py-3">{{ 'plans.column.amount' | t }}</th>
              <th class="px-4 py-3">{{ 'billing.payment_method' | t }}</th>
              <th class="px-4 py-3">{{ 'common.status.title' | t }}</th>
              <th class="px-4 py-3">{{ 'plans.column.date' | t }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            @for (payment of payments(); track payment.orderNumber) {
              <tr>
                <td class="px-4 py-3 font-mono text-espresso-500">#{{ payment.orderNumber }}</td>
                <td class="px-4 py-3 font-medium text-espresso-900">{{ label(payment.planName, payment.planSlug) }} · {{ periodLabel(payment.period) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ amount(payment.amount, payment.currency) }}</td>
                <td class="px-4 py-3 capitalize">{{ payment.provider }}</td>
                <td class="px-4 py-3"><app-badge [tone]="paymentTone(payment)">{{ paymentLabel(payment) }}</app-badge></td>
                <td class="px-4 py-3 whitespace-nowrap text-espresso-500">{{ date(payment.paidAt ?? payment.createdAt) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-espresso-400">{{ 'billing.no_payments' | t }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (selected(); as plan) {
      <app-modal [title]="'billing.checkout.title' | t: { plan: planName(plan) }" [subtitle]="'billing.checkout.subtitle' | t: { period: periodLabel(period()) }" (closed)="selected.set(null)">
        <div class="flex flex-col gap-5">
          <div class="rounded-2xl bg-canvas p-4">
            <div class="flex items-baseline justify-between">
              <span class="text-sm text-espresso-500">{{ 'billing.checkout.amount' | t }}</span>
              <span class="text-2xl font-black text-espresso-900">{{ amount(quote()?.amount ?? planPrice(plan, period(), currency()), quote()?.currency ?? currency()) }}</span>
            </div>
            @if (quote(); as q) {
              <p class="mt-2 text-sm text-espresso-500">
                @if (q.renewal) {
                  {{ 'billing.checkout.renewal' | t: { date: date(q.endsAt) } }}
                } @else {
                  {{ 'billing.checkout.immediate' | t: { date: date(q.endsAt) } }}
                  @if (q.bonusDays > 0) {
                    <br /><b>{{ 'billing.checkout.bonus' | t: { days: q.bonusDays } }}</b>
                  }
                }
              </p>
            }
          </div>

          <div>
            <p class="mb-2 text-sm font-medium text-espresso-800">{{ 'billing.payment_method' | t }}</p>
            <div class="grid gap-2 sm:grid-cols-3" role="radiogroup" [attr.aria-label]="'billing.payment_method' | t">
              @for (provider of providers(); track provider.code) {
                <button type="button" role="radio" [attr.aria-checked]="provider.code === providerCode()"
                        (click)="providerCode.set(provider.code)"
                        class="flex h-14 items-center justify-center rounded-xl border-2 text-base font-bold transition"
                        [class]="(provider.code === providerCode() ? 'border-accent-500 bg-accent-50/50 ' : 'border-line hover:border-line-strong ') + providerStyle(provider)">
                  {{ provider.displayName }}
                </button>
              } @empty {
                <p class="col-span-3 text-sm text-red-600">{{ 'billing.checkout.no_providers' | t }}</p>
              }
            </div>
          </div>
        </div>
        <ng-container footer>
          <app-button variant="secondary" (clicked)="selected.set(null)">{{ 'common.cancel' | t }}</app-button>
          <app-button icon="external" [loading]="paying()" [disabled]="!providerCode()" (clicked)="pay(plan)">{{ 'billing.checkout.pay' | t }}</app-button>
        </ng-container>
      </app-modal>
    }
  `
})
export class BillingComponent implements OnInit, OnDestroy {

  private readonly billingService = inject(BillingService);
  private readonly upgradePrompt = inject(UpgradePromptService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly periods: BillingPeriod[] = ['MONTHLY', 'YEARLY'];

  protected readonly summary = signal<BillingSummaryDto | null>(null);
  protected readonly plans = signal<PlanResponseDto[]>([]);
  protected readonly limits = signal<LimitDefinitionResponseDto[]>([]);
  protected readonly providers = signal<PaymentProviderDto[]>([]);
  protected readonly payments = signal<PaymentResponseDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly period = signal<BillingPeriod>('MONTHLY');
  protected readonly highlight = signal<string | null>(null);
  protected readonly selected = signal<PlanResponseDto | null>(null);
  protected readonly quote = signal<QuoteDto | null>(null);
  protected readonly providerCode = signal('');
  protected readonly paying = signal(false);
  protected readonly notice = signal<{ tone: 'ok' | 'wait' | 'error'; text: string } | null>(null);

  protected readonly canBuy = signal(inject(TokenStorageService).getClaims()?.role === ROLE_CAFE_ADMIN);
  /** From the user's country: so'm in Uzbekistan, euros in the euro area, dollars elsewhere. */
  protected readonly currency = computed<Currency>(() => this.summary()?.currency ?? this.catalogCurrency());
  private readonly catalogCurrency = signal<Currency>('UZS');
  protected readonly maxSaving = computed(() =>
    Math.max(0, ...this.plans().map((plan) => yearlySavingPercent(plan, this.currency()))));

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.highlight.set(params.get('plan'));
    this.load();
    const order = Number(params.get('order'));
    if (order) {
      this.watchPayment(order, POLL_ATTEMPTS);
    }
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
  }

  protected choose(plan: PlanResponseDto): void {
    this.selected.set(plan);
    this.quote.set(null);
    if (!this.providerCode() && this.providers().length > 0) {
      this.providerCode.set(this.providers()[0].code);
    }
    this.billingService.quote(plan.slug, this.period()).subscribe({
      next: (response) => this.quote.set(response.data ?? null),
      error: () => this.quote.set(null)
    });
  }

  protected pay(plan: PlanResponseDto): void {
    if (this.paying() || !this.providerCode()) {
      return;
    }
    this.paying.set(true);
    this.billingService.checkout({ planSlug: plan.slug, period: this.period(), provider: this.providerCode() }).subscribe({
      next: (response) => {
        const redirect = response.data?.redirectUrl;
        if (redirect) {
          window.location.href = redirect;
        } else {
          this.paying.set(false);
        }
      },
      error: (error) => {
        this.paying.set(false);
        this.selected.set(null);
        this.notice.set({ tone: 'error', text: error?.error?.message ?? this.i18n.t('billing.error.checkout') });
      }
    });
  }

  /** After returning from the payment page the callback may still be on its way; poll for a bit. */
  private watchPayment(order: number, attemptsLeft: number): void {
    this.billingService.payment(order).subscribe({
      next: (response) => {
        const payment = response.data;
        if (payment?.status === 'PAID') {
          this.notice.set({ tone: 'ok', text: this.i18n.t('billing.msg.paid', { plan: this.label(payment.planName, payment.planSlug) }) });
          this.clearOrderParam();
          this.load();
          this.upgradePrompt.refresh(true);
        } else if (payment?.status === 'CANCELLED') {
          this.notice.set({ tone: 'error', text: this.i18n.t('billing.msg.cancelled') });
          this.clearOrderParam();
        } else if (attemptsLeft > 0) {
          this.notice.set({ tone: 'wait', text: this.i18n.t('billing.msg.waiting', { order }) });
          this.pollTimer = setTimeout(() => this.watchPayment(order, attemptsLeft - 1), POLL_INTERVAL_MS);
        } else {
          this.notice.set({ tone: 'wait', text: this.i18n.t('billing.msg.not_confirmed') });
        }
      },
      error: () => this.notice.set({ tone: 'error', text: this.i18n.t('billing.msg.order_not_found', { order }) })
    });
  }

  private clearOrderParam(): void {
    this.router.navigate([], { queryParams: { order: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private load(): void {
    this.billingService.me().subscribe({
      next: (response) => {
        this.summary.set(response.data ?? null);
        if (response.data?.period) {
          this.period.set(response.data.period);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.notice.set({ tone: 'error', text: error?.error?.message ?? this.i18n.t('billing.error.load') });
      }
    });
    this.billingService.plans().subscribe({
      next: (response) => {
        this.plans.set(response.data?.plans ?? []);
        this.catalogCurrency.set(response.data?.currency ?? 'UZS');
        this.limits.set(response.data?.limits ?? []);
      }
    });
    this.billingService.providers().subscribe({
      next: (response) => this.providers.set(response.data ?? [])
    });
    this.billingService.payments().subscribe({
      next: (response) => this.payments.set(response.data ?? [])
    });
  }

  protected isCurrent(plan: PlanResponseDto): boolean {
    const summary = this.summary();
    return !!summary && summary.state === 'ACTIVE' && summary.plan.slug === plan.slug && summary.period === this.period();
  }

  /** Translation key of the plan button. */
  protected upgradeLabel(plan: PlanResponseDto): string {
    const current = this.summary()?.plan;
    if (!current || this.summary()?.state !== 'ACTIVE') {
      return 'billing.choose';
    }
    return plan.monthlyPrice > current.monthlyPrice ? 'billing.switch_up' : 'billing.switch';
  }

  protected isExcluded(plan: PlanResponseDto, limit: LimitDefinitionResponseDto): boolean {
    return limit.kind === 'FEATURE' && (plan.entitlements[limit.key] ?? limit.defaultValue) === 0;
  }

  protected stateLabel(summary: BillingSummaryDto): string {
    return subscriptionStateLabel(summary.state);
  }

  protected stateTone(summary: BillingSummaryDto): BadgeTone {
    return { TRIAL: 'accent', ACTIVE: 'success', EXPIRED: 'danger', FREE: 'neutral' }[summary.state] as BadgeTone;
  }

  protected paymentLabel(payment: PaymentResponseDto): string {
    return this.i18n.t(`payment_status.${payment.status}`);
  }

  protected paymentTone(payment: PaymentResponseDto): BadgeTone {
    return ({ PENDING: 'warning', PAID: 'success', CANCELLED: 'neutral' } as const)[payment.status];
  }

  protected providerStyle(provider: PaymentProviderDto): string {
    return PROVIDER_STYLES[provider.code] ?? 'text-espresso-800';
  }

  protected planName(plan: PlanResponseDto): string {
    return name(plan.nameTranslations, plan.slug);
  }

  protected label(translations: Record<string, string>, fallback = ''): string {
    return name(translations, fallback);
  }

  protected price(plan: PlanResponseDto): string {
    return money(monthlyEquivalent(plan, this.period(), this.currency()), this.currency());
  }

  /** Free plans are "sold" everywhere; a paid plan only where it has a price in the user's currency. */
  protected soldIn(plan: PlanResponseDto): boolean {
    const free = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
    return free || planPrice(plan, this.period(), this.currency()) > 0;
  }

  protected amount = money;
  protected planPrice = planPrice;
  protected date = formatDate;
  protected usage = usageText;
  protected entitlement = entitlementText;
  protected periodLabel = (period: BillingPeriod) => periodLabel(period);
}
