import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UpgradePromptService } from '../../../core/services/upgrade-prompt.service';
import { entitlementText, monthlyEquivalent, money, name } from '../../../core/utils/billing.util';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { ModalComponent } from '../modal/modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** Shown when a plan limit blocks an action (HTTP 402); offers the plan that allows more. */
@Component({
  selector: 'app-upgrade-dialog',
  standalone: true,
  imports: [ModalComponent, ButtonComponent, IconComponent, TranslatePipe],
  template: `
    @if (prompt.blocked(); as limit) {
      <app-modal [title]="'upgrade.dialog.title' | t" [subtitle]="limitName()" (closed)="prompt.close()">
        <div class="flex flex-col gap-5">
          <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <app-icon name="alert" [size]="18" class="mt-px text-amber-600" />
            <span>
              @if (limit.kind === 'FEATURE') {
                <b>{{ limitName() }}</b> {{ 'upgrade.dialog.not_in_plan' | t }}
              } @else {
                <b>{{ limitName() }}</b>: {{ 'upgrade.dialog.used' | t: { used: limit.used ?? limit.limit, limit: limit.limit } }}
              }
              {{ 'upgrade.dialog.upgrade_to_continue' | t }}
            </span>
          </div>

          @if (limit.suggestedPlan; as plan) {
            <div class="rounded-2xl border-2 border-accent-500 bg-accent-50/40 p-5">
              <p class="text-xs font-semibold tracking-wide text-accent-600 uppercase">{{ 'upgrade.dialog.recommended' | t }}</p>
              <div class="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <h3 class="text-xl font-bold text-espresso-900">{{ planName(plan) }}</h3>
                <p class="text-sm text-espresso-500"><b class="text-lg text-espresso-900">{{ price(plan) }}</b> / {{ 'billing.per_month' | t }}</p>
              </div>
              <p class="mt-3 flex items-center gap-2 text-sm text-espresso-700">
                <app-icon name="check" [size]="16" class="text-emerald-600" />
                {{ limitName() }}: <b>{{ suggestedValue() }}</b>
              </p>
            </div>
          } @else {
            <p class="text-sm text-espresso-500">{{ 'upgrade.dialog.top_plan' | t }}</p>
          }
        </div>
        <ng-container footer>
          <app-button variant="secondary" (clicked)="prompt.close()">{{ 'upgrade.dialog.later' | t }}</app-button>
          <app-button icon="star" (clicked)="upgrade()">{{ (limit.suggestedPlan ? 'upgrade.upgrade_plan' : 'upgrade.view_plans') | t }}</app-button>
        </ng-container>
      </app-modal>
    }
  `
})
export class UpgradeDialogComponent {

  protected readonly prompt = inject(UpgradePromptService);
  private readonly router = inject(Router);

  protected readonly limitName = computed(() => {
    const limit = this.prompt.blocked();
    return limit ? name(limit.limitName, limit.limitKey) : '';
  });

  protected readonly suggestedValue = computed(() => {
    const limit = this.prompt.blocked();
    const plan = limit?.suggestedPlan;
    if (!limit || !plan) {
      return '';
    }
    return entitlementText(plan, {
      key: limit.limitKey, nameTranslations: limit.limitName, kind: limit.kind, period: 'NONE',
      httpMethod: null, pathPattern: null, defaultValue: -1, sortOrder: 0, builtIn: false, enforced: true
    });
  });

  protected planName = (plan: { nameTranslations: Record<string, string>; slug: string }) => name(plan.nameTranslations, plan.slug);
  /** In the user's billing currency. */
  protected price = (plan: Parameters<typeof monthlyEquivalent>[0]) => {
    const currency = this.prompt.summary()?.currency ?? 'UZS';
    return money(monthlyEquivalent(plan, 'MONTHLY', currency), currency);
  };

  protected upgrade(): void {
    const plan = this.prompt.blocked()?.suggestedPlan;
    this.prompt.close();
    this.router.navigate(['/billing'], { queryParams: plan ? { plan: plan.slug } : {} });
  }
}
