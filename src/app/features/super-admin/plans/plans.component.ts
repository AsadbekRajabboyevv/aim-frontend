import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BillingPeriod, BillingSettingsDto, Currency, LimitDefinitionResponseDto, PaymentResponseDto, PaymentStatus, PlanResponseDto,
  SubscriptionAdminDto
} from '../../../core/models/billing.model';
import { PageResponse } from '../../../core/models/page-response.model';
import { BillingAdminService } from '../../../core/services/billing-admin.service';
import { I18nService } from '../../../core/services/i18n.service';
import {
  entitlementText, formatDate, limitPeriodSuffix, money, name, periodLabel, planPrice, stateLabel as subscriptionStateLabel,
  yearlySavingPercent
} from '../../../core/utils/billing.util';
import { BadgeComponent, BadgeTone } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToggleComponent } from '../../../shared/components/toggle/toggle.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LimitFormComponent } from './limit-form.component';
import { PlanFormComponent } from './plan-form.component';

type Tab = 'plans' | 'limits' | 'subscriptions' | 'payments' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plans', label: 'nav.plans' },
  { id: 'limits', label: 'plans.tab.limits' },
  { id: 'subscriptions', label: 'plans.tab.subscriptions' },
  { id: 'payments', label: 'plans.tab.payments' },
  { id: 'settings', label: 'nav.settings' }
];

const PAGE_SIZE = 20;

interface AssignDraft {
  user: SubscriptionAdminDto;
  planSlug: string;
  period: BillingPeriod | '';
  end: string;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [
    FormsModule, PageHeaderComponent, ButtonComponent, IconComponent, BadgeComponent, ModalComponent, ToggleComponent,
    PlanFormComponent, LimitFormComponent, TranslatePipe
  ],
  template: `
    <app-page-header [title]="'plans.title' | t" [subtitle]="'plans.subtitle' | t">
      @if (tab() === 'plans') {
        <app-button icon="plus" (clicked)="editPlan(null)">{{ 'plans.new_plan' | t }}</app-button>
      }
      @if (tab() === 'limits') {
        <app-button icon="plus" (clicked)="editLimit(null)">{{ 'plans.new_limit' | t }}</app-button>
      }
      @if (tab() === 'settings') {
        <app-button icon="check" [loading]="saving()" [disabled]="!settings()" (clicked)="saveSettings()">{{ 'common.save' | t }}</app-button>
      }
    </app-page-header>

    <nav class="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1" [attr.aria-label]="'plans.sections' | t">
      @for (item of tabs; track item.id) {
        <button type="button" (click)="open(item.id)"
                class="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition"
                [class]="tab() === item.id ? 'bg-espresso-900 text-espresso-50' : 'text-espresso-500 hover:bg-espresso-50 hover:text-espresso-900'">
          {{ item.label | t }}
        </button>
      }
    </nav>

    @if (message(); as notice) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
           [class]="notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'">
        <app-icon [name]="notice.ok ? 'check' : 'alert'" [size]="18" class="mt-px" />
        <span class="flex-1">{{ notice.text }}</span>
        <button type="button" (click)="message.set(null)" [attr.aria-label]="'common.close' | t" class="opacity-60 hover:opacity-100">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }

    @switch (tab()) {
      @case ('plans') {
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          @for (plan of plans(); track plan.slug) {
            <article class="flex flex-col rounded-card border border-line bg-surface p-5 shadow-card" [class.opacity-70]="!plan.active">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="text-lg font-bold text-espresso-900">{{ label(plan.nameTranslations, plan.slug) }}</h3>
                  <p class="font-mono text-xs text-espresso-400">{{ plan.slug }}</p>
                </div>
                <div class="flex flex-wrap justify-end gap-1.5">
                  @if (plan.recommended) {
                    <app-badge tone="accent">{{ 'plans.badge.recommended' | t }}</app-badge>
                  }
                  @if (plan.slug === settings()?.trialPlan) {
                    <app-badge tone="warning">{{ 'plans.badge.trial' | t }}</app-badge>
                  }
                  @if (plan.slug === settings()?.fallbackPlan) {
                    <app-badge tone="neutral">{{ 'plans.badge.fallback' | t }}</app-badge>
                  }
                  <app-badge [tone]="plan.active ? 'success' : 'neutral'">{{ (plan.active ? 'plans.badge.on_sale' : 'plans.badge.hidden') | t }}</app-badge>
                </div>
              </div>
              <p class="mt-3 text-sm text-espresso-500">
                <b class="text-lg text-espresso-900">{{ money(plan.monthlyPrice) }}</b> / {{ 'billing.per_month' | t }} ·
                {{ money(plan.yearlyPrice) }} / {{ 'billing.per_year' | t }}
                @if (yearlySaving(plan) > 0) {
                  <span class="text-emerald-600">(-{{ yearlySaving(plan) }}%)</span>
                }
              </p>
              <p class="mt-1 flex flex-wrap gap-x-3 text-xs text-espresso-400">
                @for (currency of foreignCurrencies; track currency) {
                  <span>
                    {{ currency }}:
                    @if (planPrice(plan, 'MONTHLY', currency) > 0) {
                      {{ money(planPrice(plan, 'MONTHLY', currency), currency) }} / {{ money(planPrice(plan, 'YEARLY', currency), currency) }}
                    } @else {
                      <span class="text-amber-600">{{ 'plans.not_priced' | t }}</span>
                    }
                  </span>
                }
              </p>
              <ul class="mt-4 flex flex-1 flex-col gap-1.5 text-sm">
                @for (limit of limits(); track limit.key) {
                  <li class="flex justify-between gap-3">
                    <span class="text-espresso-500">{{ label(limit.nameTranslations, limit.key) }}</span>
                    <b class="text-espresso-900">{{ entitlement(plan, limit) }}</b>
                  </li>
                }
              </ul>
              <div class="mt-5 flex gap-2 border-t border-line pt-4">
                <app-button icon="pencil" variant="secondary" class="flex-1" [block]="true" (clicked)="editPlan(plan)">{{ 'common.edit' | t }}</app-button>
                <app-button variant="danger" icon="trash" [iconOnly]="true" [ariaLabel]="'common.delete' | t" (clicked)="deletePlan(plan)" />
              </div>
            </article>
          }
        </div>
      }

      @case ('limits') {
        <p class="mb-4 max-w-3xl text-sm text-espresso-500">
          {{ 'plans.limits_intro' | t }}
        </p>
        <div class="relative overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-line text-xs tracking-wide text-espresso-400 uppercase">
              <tr>
                <th class="px-4 py-3">{{ 'common.name' | t }}</th>
                <th class="px-4 py-3">{{ 'settings.form.type' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.limit.enforcement' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.limit.default' | t }}</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              @for (limit of limits(); track limit.key) {
                <tr>
                  <td class="px-4 py-3">
                    <p class="font-medium text-espresso-900">{{ label(limit.nameTranslations, limit.key) }}</p>
                    <p class="font-mono text-xs text-espresso-400">{{ limit.key }}</p>
                  </td>
                  <td class="px-4 py-3 text-espresso-600">{{ kindLabel(limit) }}</td>
                  <td class="px-4 py-3">
                    @if (limit.pathPattern) {
                      <code class="rounded bg-espresso-50 px-1.5 py-0.5 text-xs">{{ limit.httpMethod ?? '*' }} {{ limit.pathPattern }}</code>
                    } @else if (limit.enforced) {
                      <app-badge tone="success">{{ 'plans.limit.by_code' | t }}</app-badge>
                    } @else {
                      <app-badge tone="neutral">{{ 'plans.limit.display_only' | t }}</app-badge>
                    }
                  </td>
                  <td class="px-4 py-3 text-espresso-600">{{ defaultLabel(limit) }}</td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-2">
                      <app-button variant="secondary" icon="pencil" [iconOnly]="true" size="sm" [ariaLabel]="'common.edit' | t" (clicked)="editLimit(limit)" />
                      @if (!limit.builtIn) {
                        <app-button variant="danger" icon="trash" [iconOnly]="true" size="sm" [ariaLabel]="'common.delete' | t" (clicked)="deleteLimit(limit)" />
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @case ('subscriptions') {
        <form class="mb-4 flex max-w-md gap-2" (ngSubmit)="loadSubscriptions(0)">
          <input type="search" name="search" [(ngModel)]="search" [placeholder]="'plans.subscriptions.search_placeholder' | t"
                 class="h-10 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
          <app-button type="submit" variant="secondary" icon="search">{{ 'common.search' | t }}</app-button>
        </form>
        <div class="relative overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-line text-xs tracking-wide text-espresso-400 uppercase">
              <tr>
                <th class="px-4 py-3">{{ 'plans.column.user' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.plan' | t }}</th>
                <th class="px-4 py-3">{{ 'common.status.title' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.period_end' | t }}</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              @for (row of subscriptions()?.content ?? []; track row.userSlug) {
                <tr>
                  <td class="px-4 py-3">
                    <p class="font-medium text-espresso-900">{{ row.fullName }}</p>
                    <p class="text-xs text-espresso-400">{{ row.email }}</p>
                  </td>
                  <td class="px-4 py-3">{{ row.planSlug ? label(row.planName, row.planSlug) : '—' }}{{ row.period ? ' · ' + periodLabel(row.period) : '' }}</td>
                  <td class="px-4 py-3"><app-badge [tone]="stateTone(row)">{{ stateLabel(row) }}</app-badge></td>
                  <td class="px-4 py-3 whitespace-nowrap text-espresso-500">{{ date(row.currentPeriodEnd) }}</td>
                  <td class="px-4 py-3 text-right">
                    <app-button variant="secondary" size="sm" icon="pencil" (clicked)="startAssign(row)">{{ 'plans.assign.button' | t }}</app-button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-8 text-center text-espresso-400">{{ 'plans.subscriptions.empty' | t }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if ((subscriptions()?.totalPages ?? 0) > 1) {
          <div class="mt-4 flex items-center justify-end gap-2 text-sm text-espresso-500">
            <app-button variant="secondary" size="sm" icon="chevron-left" [iconOnly]="true" [ariaLabel]="'common.prev_page' | t"
                        [disabled]="subscriptions()!.page === 0" (clicked)="loadSubscriptions(subscriptions()!.page - 1)" />
            {{ subscriptions()!.page + 1 }} / {{ subscriptions()!.totalPages }}
            <app-button variant="secondary" size="sm" icon="chevron-right" [iconOnly]="true" [ariaLabel]="'common.next_page' | t"
                        [disabled]="subscriptions()!.last" (clicked)="loadSubscriptions(subscriptions()!.page + 1)" />
          </div>
        }
      }

      @case ('payments') {
        <div class="mb-4 flex gap-2">
          @for (status of paymentFilters; track status.value) {
            <button type="button" (click)="paymentStatus.set(status.value); loadPayments(0)"
                    class="rounded-full px-3.5 py-1.5 text-sm font-medium transition"
                    [class]="paymentStatus() === status.value ? 'bg-espresso-900 text-espresso-50' : 'bg-surface text-espresso-500 ring-1 ring-line hover:text-espresso-900'">
              {{ status.label | t }}
            </button>
          }
        </div>
        <div class="relative overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-line text-xs tracking-wide text-espresso-400 uppercase">
              <tr>
                <th class="px-4 py-3">{{ 'plans.column.order' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.user' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.plan' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.amount' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.method' | t }}</th>
                <th class="px-4 py-3">{{ 'common.status.title' | t }}</th>
                <th class="px-4 py-3">{{ 'plans.column.date' | t }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              @for (payment of payments()?.content ?? []; track payment.orderNumber) {
                <tr>
                  <td class="px-4 py-3 font-mono text-espresso-500">#{{ payment.orderNumber }}</td>
                  <td class="px-4 py-3">{{ payment.userEmail ?? '—' }}</td>
                  <td class="px-4 py-3">{{ label(payment.planName, payment.planSlug) }} · {{ periodLabel(payment.period) }}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{{ money(payment.amount, payment.currency) }}</td>
                  <td class="px-4 py-3 capitalize">{{ payment.provider }}</td>
                  <td class="px-4 py-3"><app-badge [tone]="paymentTone(payment)">{{ paymentLabel(payment) }}</app-badge></td>
                  <td class="px-4 py-3 whitespace-nowrap text-espresso-500">{{ date(payment.paidAt ?? payment.createdAt) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-8 text-center text-espresso-400">{{ 'plans.payments.empty' | t }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if ((payments()?.totalPages ?? 0) > 1) {
          <div class="mt-4 flex items-center justify-end gap-2 text-sm text-espresso-500">
            <app-button variant="secondary" size="sm" icon="chevron-left" [iconOnly]="true" [ariaLabel]="'common.prev_page' | t"
                        [disabled]="payments()!.page === 0" (clicked)="loadPayments(payments()!.page - 1)" />
            {{ payments()!.page + 1 }} / {{ payments()!.totalPages }}
            <app-button variant="secondary" size="sm" icon="chevron-right" [iconOnly]="true" [ariaLabel]="'common.next_page' | t"
                        [disabled]="payments()!.last" (clicked)="loadPayments(payments()!.page + 1)" />
          </div>
        }
      }

      @case ('settings') {
        @if (settings(); as s) {
          <div class="flex max-w-4xl flex-col gap-6">
            <section class="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 shadow-card">
              <app-toggle [label]="'plans.settings.enabled' | t" [hint]="'plans.settings.enabled_hint' | t"
                          [checked]="s.enabled" (checkedChange)="patch({ enabled: $event })" />
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-espresso-800">{{ 'plans.settings.trial_days' | t }}</span>
                  <input type="number" min="0" max="365" [value]="s.trialDays" (input)="patch({ trialDays: toInt($any($event.target).value) })"
                         class="h-11 rounded-xl border border-line-strong px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
                  <span class="text-xs text-espresso-400">{{ 'plans.settings.trial_days_hint' | t }}</span>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-espresso-800">{{ 'plans.settings.trial_plan' | t }}</span>
                  <select [value]="s.trialPlan" (change)="patch({ trialPlan: $any($event.target).value })"
                          class="h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none">
                    @for (plan of plans(); track plan.slug) {
                      <option [value]="plan.slug" [selected]="plan.slug === s.trialPlan">{{ label(plan.nameTranslations, plan.slug) }}</option>
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-espresso-800">{{ 'plans.settings.fallback_plan' | t }}</span>
                  <select [value]="s.fallbackPlan" (change)="patch({ fallbackPlan: $any($event.target).value })"
                          class="h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none">
                    @for (plan of plans(); track plan.slug) {
                      <option [value]="plan.slug" [selected]="plan.slug === s.fallbackPlan">{{ label(plan.nameTranslations, plan.slug) }}</option>
                    }
                  </select>
                  <span class="text-xs text-espresso-400">{{ 'plans.settings.fallback_plan_hint' | t }}</span>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-espresso-800">{{ 'plans.settings.prompt_percent' | t }}</span>
                  <input type="number" min="1" max="100" [value]="s.promptPercent" (input)="patch({ promptPercent: toInt($any($event.target).value) })"
                         class="h-11 rounded-xl border border-line-strong px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
                  <span class="text-xs text-espresso-400">{{ 'plans.settings.prompt_percent_hint' | t }}</span>
                </label>
              </div>
            </section>

            <section class="flex flex-col gap-3">
              <h2 class="text-sm font-semibold tracking-wide text-espresso-400 uppercase">{{ 'plans.settings.providers' | t }}</h2>
              @for (provider of s.providers; track provider.code) {
                <article class="rounded-card border border-line bg-surface p-5 shadow-card">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 class="text-base font-semibold text-espresso-900">{{ provider.displayName }}</h3>
                      <span class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                            [class]="provider.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-espresso-50 text-espresso-500'">
                        <app-icon [name]="provider.configured ? 'check' : 'lock'" [size]="13" />
                        {{ (provider.configured ? 'plans.settings.keys_set' : 'plans.settings.keys_missing') | t }}
                      </span>
                    </div>
                    <app-toggle [label]="'plans.settings.show_at_checkout' | t" [checked]="provider.enabled"
                                (checkedChange)="toggleProvider(provider.code, $event)" />
                  </div>
                  <dl class="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt class="text-xs text-espresso-400">{{ 'plans.settings.callback_url' | t }}</dt>
                      <dd class="mt-1 flex items-center gap-2">
                        <code class="min-w-0 flex-1 truncate rounded-lg bg-espresso-50 px-2.5 py-1.5 text-xs">{{ provider.callbackUrl }}</code>
                        <app-button variant="ghost" size="sm" icon="copy" [iconOnly]="true" [ariaLabel]="'common.copy' | t" (clicked)="copy(provider.callbackUrl)" />
                      </dd>
                    </div>
                    <div>
                      <dt class="text-xs text-espresso-400">{{ 'plans.settings.env_variables' | t }}</dt>
                      <dd class="mt-1 flex flex-wrap gap-1.5">
                        @for (variable of provider.envVariables; track variable) {
                          <code class="rounded bg-espresso-50 px-1.5 py-0.5 text-xs">{{ variable }}</code>
                        }
                      </dd>
                    </div>
                  </dl>
                </article>
              }
            </section>
          </div>
        }
      }
    }

    @if (planDraft(); as draft) {
      <app-plan-form [plan]="draft.plan" [limits]="limits()" (saved)="planSaved()" (cancelled)="planDraft.set(null)" />
    }
    @if (limitDraft(); as draft) {
      <app-limit-form [limit]="draft.limit" (saved)="limitSaved()" (cancelled)="limitDraft.set(null)" />
    }
    @if (assignDraft(); as draft) {
      <app-modal [title]="'plans.assign.button' | t" [subtitle]="draft.user.email ?? draft.user.fullName" (closed)="assignDraft.set(null)">
        <div class="flex flex-col gap-4">
          <p class="text-sm text-espresso-500">{{ 'plans.assign.hint' | t }}</p>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-espresso-800">{{ 'plans.column.plan' | t }}</span>
            <select [(ngModel)]="draft.planSlug" name="plan"
                    class="h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none">
              @for (plan of plans(); track plan.slug) {
                <option [value]="plan.slug">{{ label(plan.nameTranslations, plan.slug) }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-espresso-800">{{ 'settings.form.type' | t }}</span>
            <select [(ngModel)]="draft.period" name="period"
                    class="h-11 rounded-xl border border-line-strong bg-surface px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none">
              <option value="MONTHLY">{{ 'plans.assign.paid_monthly' | t }}</option>
              <option value="YEARLY">{{ 'plans.assign.paid_yearly' | t }}</option>
              <option value="">{{ 'billing.state.TRIAL' | t }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-espresso-800">{{ 'plans.assign.valid_until' | t }}</span>
            <input type="date" [(ngModel)]="draft.end" name="end"
                   class="h-11 rounded-xl border border-line-strong px-3.5 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
          </label>
        </div>
        <ng-container footer>
          <app-button variant="secondary" (clicked)="assignDraft.set(null)">{{ 'common.cancel' | t }}</app-button>
          <app-button icon="check" [loading]="saving()" (clicked)="assign(draft)">{{ 'common.save' | t }}</app-button>
        </ng-container>
      </app-modal>
    }
  `
})
export class PlansComponent implements OnInit {

  private readonly adminService = inject(BillingAdminService);
  private readonly i18n = inject(I18nService);

  protected readonly tabs = TABS;
  protected readonly paymentFilters: { value: PaymentStatus | ''; label: string }[] = [
    { value: '', label: 'system_messages.group.all' },
    { value: 'PAID', label: 'payment_status.PAID' },
    { value: 'PENDING', label: 'payment_status.PENDING' },
    { value: 'CANCELLED', label: 'payment_status.CANCELLED' }
  ];

  protected readonly tab = signal<Tab>('plans');
  protected readonly plans = signal<PlanResponseDto[]>([]);
  protected readonly limits = signal<LimitDefinitionResponseDto[]>([]);
  protected readonly settings = signal<BillingSettingsDto | null>(null);
  protected readonly subscriptions = signal<PageResponse<SubscriptionAdminDto> | null>(null);
  protected readonly payments = signal<PageResponse<PaymentResponseDto> | null>(null);
  protected readonly paymentStatus = signal<PaymentStatus | ''>('');
  protected readonly planDraft = signal<{ plan: PlanResponseDto | null } | null>(null);
  protected readonly limitDraft = signal<{ limit: LimitDefinitionResponseDto | null } | null>(null);
  protected readonly assignDraft = signal<AssignDraft | null>(null);
  protected readonly saving = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected search = '';

  ngOnInit(): void {
    this.loadPlans();
    this.loadLimits();
    this.loadSettings();
  }

  protected open(tab: Tab): void {
    this.tab.set(tab);
    this.message.set(null);
    if (tab === 'subscriptions' && !this.subscriptions()) {
      this.loadSubscriptions(0);
    }
    if (tab === 'payments' && !this.payments()) {
      this.loadPayments(0);
    }
  }

  protected editPlan(plan: PlanResponseDto | null): void {
    this.planDraft.set({ plan });
  }

  protected planSaved(): void {
    this.planDraft.set(null);
    this.message.set({ ok: true, text: this.i18n.t('plans.msg.plan_saved') });
    this.loadPlans();
  }

  protected deletePlan(plan: PlanResponseDto): void {
    if (!confirm(this.i18n.t('plans.confirm_delete_plan', { name: this.label(plan.nameTranslations, plan.slug) }))) {
      return;
    }
    this.adminService.deletePlan(plan.slug).subscribe({
      next: () => {
        this.message.set({ ok: true, text: this.i18n.t('plans.msg.plan_deleted') });
        this.loadPlans();
      },
      error: (error) => this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('common.error.delete') })
    });
  }

  protected editLimit(limit: LimitDefinitionResponseDto | null): void {
    this.limitDraft.set({ limit });
  }

  protected limitSaved(): void {
    this.limitDraft.set(null);
    this.message.set({ ok: true, text: this.i18n.t('plans.msg.limit_saved') });
    this.loadLimits();
  }

  protected deleteLimit(limit: LimitDefinitionResponseDto): void {
    if (!confirm(this.i18n.t('plans.confirm_delete_limit', { name: this.label(limit.nameTranslations, limit.key) }))) {
      return;
    }
    this.adminService.deleteLimit(limit.key).subscribe({
      next: () => {
        this.message.set({ ok: true, text: this.i18n.t('plans.msg.limit_deleted') });
        this.loadLimits();
        this.loadPlans();
      },
      error: (error) => this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('common.error.delete') })
    });
  }

  protected startAssign(user: SubscriptionAdminDto): void {
    const end = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    this.assignDraft.set({
      user,
      planSlug: user.planSlug ?? this.plans().find((plan) => plan.recommended)?.slug ?? this.plans()[0]?.slug ?? '',
      period: 'MONTHLY',
      end
    });
  }

  protected assign(draft: AssignDraft): void {
    if (!draft.planSlug || !draft.end) {
      return;
    }
    this.saving.set(true);
    this.adminService.assign(draft.user.userSlug, {
      planSlug: draft.planSlug,
      period: draft.period || null,
      currentPeriodEnd: new Date(`${draft.end}T23:59:59`).toISOString()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.assignDraft.set(null);
        this.message.set({ ok: true, text: this.i18n.t('plans.msg.assigned', { email: draft.user.email ?? draft.user.fullName }) });
        this.loadSubscriptions(this.subscriptions()?.page ?? 0);
      },
      error: (error) => {
        this.saving.set(false);
        this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('common.error.save') });
      }
    });
  }

  protected patch(change: Partial<BillingSettingsDto>): void {
    this.settings.update((settings) => settings ? { ...settings, ...change } : settings);
  }

  protected toggleProvider(code: string, enabled: boolean): void {
    this.settings.update((settings) => settings ? {
      ...settings,
      providers: settings.providers.map((provider) => provider.code === code ? { ...provider, enabled } : provider)
    } : settings);
  }

  protected saveSettings(): void {
    const settings = this.settings();
    if (!settings || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.adminService.updateSettings({
      enabled: settings.enabled,
      trialDays: settings.trialDays,
      trialPlan: settings.trialPlan,
      fallbackPlan: settings.fallbackPlan,
      promptPercent: settings.promptPercent,
      providers: Object.fromEntries(settings.providers.map((provider) => [provider.code, provider.enabled]))
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.settings.set(response.data ?? settings);
        this.message.set({ ok: true, text: this.i18n.t('common.saved') });
      },
      error: (error) => {
        this.saving.set(false);
        const details = error?.error?.errors?.join('; ');
        this.message.set({ ok: false, text: [error?.error?.message ?? this.i18n.t('common.error.save'), details].filter(Boolean).join(': ') });
      }
    });
  }

  protected copy(text: string): void {
    navigator.clipboard?.writeText(text).then(() => this.message.set({ ok: true, text: this.i18n.t('common.copied') }));
  }

  protected loadSubscriptions(page: number): void {
    this.adminService.subscriptions(this.search.trim(), { page, size: PAGE_SIZE }).subscribe({
      next: (response) => this.subscriptions.set(response.data ?? null),
      error: (error) => this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('plans.error.load_subscriptions') })
    });
  }

  protected loadPayments(page: number): void {
    this.adminService.payments(this.paymentStatus(), { page, size: PAGE_SIZE }).subscribe({
      next: (response) => this.payments.set(response.data ?? null),
      error: (error) => this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('plans.error.load_payments') })
    });
  }

  private loadPlans(): void {
    this.adminService.plans().subscribe({
      next: (response) => this.plans.set(response.data ?? []),
      error: (error) => this.message.set({ ok: false, text: error?.error?.message ?? this.i18n.t('plans.error.load_plans') })
    });
  }

  private loadLimits(): void {
    this.adminService.limits().subscribe({
      next: (response) => this.limits.set(response.data ?? [])
    });
  }

  private loadSettings(): void {
    this.adminService.settings().subscribe({
      next: (response) => this.settings.set(response.data ?? null)
    });
  }

  protected kindLabel(limit: LimitDefinitionResponseDto): string {
    const suffix = limitPeriodSuffix(limit.period);
    // i18n: limit_kind.COUNT, limit_kind.METERED, limit_kind.FEATURE
    const kind = this.i18n.t(`limit_kind.${limit.kind}`);
    return limit.kind === 'METERED' && suffix ? `${kind} · ${suffix}` : kind;
  }

  protected defaultLabel(limit: LimitDefinitionResponseDto): string {
    if (limit.kind === 'FEATURE') {
      return this.i18n.t(limit.defaultValue !== 0 ? 'billing.feature_included' : 'billing.feature_excluded');
    }
    return limit.defaultValue < 0 ? this.i18n.t('billing.unlimited') : String(limit.defaultValue);
  }

  protected stateLabel(row: SubscriptionAdminDto): string {
    return subscriptionStateLabel(row.state);
  }

  protected stateTone(row: SubscriptionAdminDto): BadgeTone {
    return ({ TRIAL: 'accent', ACTIVE: 'success', EXPIRED: 'danger', FREE: 'neutral' } as const)[row.state];
  }

  protected paymentLabel(payment: PaymentResponseDto): string {
    // i18n: payment_status.PENDING, payment_status.PAID, payment_status.CANCELLED
    return this.i18n.t(`payment_status.${payment.status}`);
  }

  protected paymentTone(payment: PaymentResponseDto): BadgeTone {
    return ({ PENDING: 'warning', PAID: 'success', CANCELLED: 'neutral' } as const)[payment.status];
  }

  protected toInt(raw: string): number {
    const value = Math.floor(Number(raw));
    return Number.isFinite(value) ? value : 0;
  }

  protected label(translations: Record<string, string>, fallback = ''): string {
    return name(translations, fallback);
  }

  protected yearlySaving = yearlySavingPercent;
  protected money = money;
  protected planPrice = planPrice;
  protected readonly foreignCurrencies: Currency[] = ['USD', 'EUR'];
  protected date = formatDate;
  protected entitlement = entitlementText;
  protected periodLabel = (period: BillingPeriod) => periodLabel(period);
}
