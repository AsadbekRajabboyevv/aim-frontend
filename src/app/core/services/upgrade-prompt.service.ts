import { Injectable, inject, signal } from '@angular/core';
import { BillingSummaryDto, PlanLimitErrorDto } from '../models/billing.model';
import { BillingService } from './billing.service';

const SUMMARY_MAX_AGE_MS = 60 * 1000;

/**
 * Plan state for the panel chrome: the summary behind the upgrade banner, and the limit that just
 * blocked a request (shown as the upgrade dialog).
 */
@Injectable({ providedIn: 'root' })
export class UpgradePromptService {

  private readonly billingService = inject(BillingService);

  readonly summary = signal<BillingSummaryDto | null>(null);
  readonly blocked = signal<PlanLimitErrorDto | null>(null);
  readonly bannerDismissed = signal(false);

  private loadedAt = 0;
  private loading = false;

  /** Opens the upgrade dialog; called by the interceptor on HTTP 402. */
  show(limit: PlanLimitErrorDto): void {
    this.blocked.set(limit);
    this.refresh(true);
  }

  close(): void {
    this.blocked.set(null);
  }

  refresh(force = false): void {
    if (this.loading || (!force && Date.now() - this.loadedAt < SUMMARY_MAX_AGE_MS)) {
      return;
    }
    this.loading = true;
    this.billingService.me().subscribe({
      next: (response) => {
        const previous = this.summary()?.suggestion;
        const next = response.data?.suggestion;
        if (next && (next.reason !== previous?.reason || next.limitKey !== previous?.limitKey)) {
          this.bannerDismissed.set(false);
        }
        this.summary.set(response.data ?? null);
        this.loadedAt = Date.now();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  clear(): void {
    this.summary.set(null);
    this.blocked.set(null);
    this.loadedAt = 0;
  }
}
