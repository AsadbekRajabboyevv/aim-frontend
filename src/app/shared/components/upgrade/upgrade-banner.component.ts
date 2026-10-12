import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { uiText } from '../../../core/services/i18n.service';
import { UpgradePromptService } from '../../../core/services/upgrade-prompt.service';
import { name } from '../../../core/utils/billing.util';
import { IconComponent } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

/** A strip above every panel page when the plan is running out, suggesting the next plan. */
@Component({
  selector: 'app-upgrade-banner',
  standalone: true,
  imports: [RouterLink, IconComponent, TranslatePipe],
  template: `
    @if (text(); as message) {
      <div class="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm print:hidden"
           [class]="urgent() ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'">
        <app-icon [name]="urgent() ? 'alert' : 'star'" [size]="18" [class]="urgent() ? 'text-red-600' : 'text-amber-600'" />
        <span class="min-w-0 flex-1">{{ message }}</span>
        <a [routerLink]="'/billing'" [queryParams]="{ plan: planSlug() }"
           class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600">
          {{ cta() }}
        </a>
        <button type="button" (click)="prompt.bannerDismissed.set(true)" [attr.aria-label]="'common.close' | t" class="opacity-60 hover:opacity-100">
          <app-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `
})
export class UpgradeBannerComponent {

  protected readonly prompt = inject(UpgradePromptService);

  private readonly suggestion = computed(() =>
    this.prompt.bannerDismissed() ? null : this.prompt.summary()?.suggestion ?? null);

  protected readonly planSlug = computed(() => this.suggestion()?.plan.slug ?? null);

  protected readonly urgent = computed(() => {
    const reason = this.suggestion()?.reason;
    return reason === 'LIMIT_REACHED' || reason === 'EXPIRED';
  });

  protected readonly cta = computed(() => {
    const reason = this.suggestion()?.reason;
    return reason === 'TRIAL_ENDING' || reason === 'EXPIRED' ? uiText('upgrade.activate_subscription') : uiText('upgrade.upgrade_plan');
  });

  protected readonly text = computed(() => {
    const suggestion = this.suggestion();
    const summary = this.prompt.summary();
    if (!suggestion || !summary) {
      return null;
    }
    const plan = name(suggestion.plan.nameTranslations, suggestion.plan.slug);
    const item = summary.usage.find((usage) => usage.key === suggestion.limitKey);
    const limitName = item ? name(item.nameTranslations, item.key) : '';
    switch (suggestion.reason) {
      case 'LIMIT_REACHED':
        return uiText('upgrade.banner.limit_reached', { limit: limitName, plan });
      case 'LIMIT_NEAR':
        return uiText('upgrade.banner.limit_near', { limit: limitName, percent: item?.percent ?? summary.promptPercent, plan });
      case 'TRIAL_ENDING':
        return uiText('upgrade.banner.trial_ending', { days: summary.daysLeft, plan });
      case 'EXPIRED':
        return uiText('upgrade.banner.expired', { plan });
    }
  });
}
