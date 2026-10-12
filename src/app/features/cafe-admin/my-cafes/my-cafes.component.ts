import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UpgradePromptService } from '../../../core/services/upgrade-prompt.service';
import { CafeResponseDto } from '../../../core/models/cafe.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { uiName } from '../../../core/utils/ui-format.util';
import { mediaUrl } from '../../../core/utils/media-url.util';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-my-cafes',
  standalone: true,
  imports: [RouterLink, ButtonComponent, IconComponent, AvatarComponent, BadgeComponent, PageHeaderComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.my_cafes' | t">
      @if (maxCafes() !== null) {
        <div meta class="mt-3 flex items-center gap-3">
          <span class="text-sm text-espresso-500">
            <span class="font-semibold text-espresso-900">{{ cafes().length }} / {{ maxCafes() }}</span> {{ 'my_cafes.cafes_count_suffix' | t }}
          </span>
          <div class="flex gap-1.5" aria-hidden="true">
            @for (slot of slots(); track $index) {
              <span class="h-1.5 w-8 rounded-full" [class]="slot ? 'bg-accent-500' : 'bg-line-strong'"></span>
            }
          </div>
        </div>
      }
      <app-button icon="plus" [disabled]="limitReached() || loading()" (clicked)="createCafe()">{{ 'cafes.new' | t }}</app-button>
    </app-page-header>

    @if (limitReached() && !loading()) {
      <div class="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <app-icon name="alert" [size]="18" class="mt-px text-amber-600" />
        <span class="flex-1">
          <span class="font-semibold">{{ 'my_cafes.limit_reached' | t }}</span>
          {{ 'my_cafes.limit_reached_text' | t: { max: maxCafes() } }}
        </span>
        <a routerLink="/billing" [queryParams]="{ plan: upgradePlan() }"
           class="inline-flex h-9 shrink-0 items-center rounded-xl bg-accent-500 px-3.5 text-sm font-semibold text-white hover:bg-accent-600">
          {{ 'upgrade.upgrade_plan' | t }}
        </a>
      </div>
    }

    @if (errorMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        {{ errorMessage() }}
      </div>
    }

    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      @if (loading()) {
        @for (placeholder of [0, 1, 2]; track placeholder) {
          <div class="h-96 animate-pulse rounded-card border border-line bg-surface"></div>
        }
      } @else {
        @for (cafe of cafes(); track cafe.slug) {
          <article class="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition hover:shadow-pop">
            <div class="relative h-40 bg-linear-to-br from-espresso-700 to-espresso-900">
              @if (cover(cafe); as coverUrl) {
                <img [src]="coverUrl" alt="" class="h-full w-full object-cover" />
              } @else {
                <div class="coffee-pattern absolute inset-0"></div>
              }
              <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-surface p-1 shadow-card">
                <app-avatar [name]="displayName(cafe)" [imageUrl]="cafe.logoUrl" [size]="64" />
              </div>
            </div>

            <div class="flex flex-1 flex-col px-5 pt-11 pb-5">
              <h3 class="text-center text-lg font-semibold text-espresso-900">{{ displayName(cafe) }}</h3>
              <div class="mt-4 flex flex-1 flex-col gap-2 text-sm text-espresso-500">
                <p class="flex items-start gap-2">
                  <app-icon name="map-pin" [size]="16" class="mt-0.5 text-espresso-300" />
                  <span>{{ cafe.address || ('my_cafes.no_address' | t) }}</span>
                </p>
                <p class="flex items-center gap-2">
                  <app-icon name="phone" [size]="16" class="text-espresso-300" />
                  <span>{{ cafe.phone || ('my_cafes.no_phone' | t) }}</span>
                </p>
              </div>
              <div class="mt-4">
                <app-badge [tone]="cafe.active ? 'success' : 'neutral'">{{ (cafe.active ? 'common.status.active' : 'common.status.inactive') | t }}</app-badge>
              </div>
            </div>

            <div class="flex gap-3 border-t border-line px-5 py-4">
              <app-button icon="book-open" class="flex-1" [block]="true" (clicked)="openMenu(cafe)">{{ 'cafes.action.menu' | t }}</app-button>
              <app-button variant="secondary" icon="ban" [iconOnly]="true" [ariaLabel]="'cafes.action.stop_list' | t" (clicked)="openStopList(cafe)" />
              <app-button variant="secondary" icon="qr" [iconOnly]="true" [ariaLabel]="'cafes.action.qr' | t" (clicked)="openQr(cafe)" />
              <app-button variant="secondary" icon="pencil" [iconOnly]="true" [ariaLabel]="'common.edit' | t" (clicked)="editCafe(cafe)" />
              <app-button variant="danger" icon="trash" [iconOnly]="true" [ariaLabel]="'common.delete' | t" (clicked)="deleteCafe(cafe)" />
            </div>
          </article>
        }

        @if (!limitReached()) {
          <button
            type="button"
            (click)="createCafe()"
            class="group flex min-h-96 flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed
                   border-accent-200 bg-surface/40 p-6 text-center transition hover:border-accent-500 hover:bg-accent-50/50"
          >
            <span class="flex h-20 w-20 items-center justify-center rounded-full bg-accent-50 text-accent-500 transition group-hover:scale-105">
              <app-icon name="plus" [size]="36" [strokeWidth]="2" />
            </span>
            <span class="text-lg font-semibold text-espresso-900">{{ 'my_cafes.add_cafe' | t }}</span>
            @if (remaining() !== null) {
              <span class="text-sm text-espresso-400">{{ 'my_cafes.remaining' | t: { count: remaining() } }}</span>
            }
          </button>
        }
      }
    </div>
  `
})
export class MyCafesComponent implements OnInit {

  private readonly cafeService = inject(CafeService);
  private readonly router = inject(Router);
  private readonly upgradePrompt = inject(UpgradePromptService);
  private readonly i18n = inject(I18nService);

  /** The plan the summary suggests for more cafes, if any. */
  protected readonly upgradePlan = computed(() => {
    const suggestion = this.upgradePrompt.summary()?.suggestion;
    return suggestion?.limitKey === 'cafes' ? suggestion.plan.slug : null;
  });

  protected readonly cafes = signal<CafeResponseDto[]>([]);
  protected readonly maxCafes = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly limitReached = computed(() => {
    const max = this.maxCafes();
    return max !== null && this.cafes().length >= max;
  });

  protected readonly remaining = computed(() => {
    const max = this.maxCafes();
    return max === null ? null : Math.max(max - this.cafes().length, 0);
  });

  protected readonly slots = computed(() =>
    Array.from({ length: this.maxCafes() ?? 0 }, (_, index) => index < this.cafes().length));

  ngOnInit(): void {
    this.load();
  }

  protected displayName(cafe: CafeResponseDto): string {
    return uiName(cafe.nameTranslations) || cafe.slug;
  }

  protected cover(cafe: CafeResponseDto): string | null {
    return mediaUrl(cafe.coverUrl);
  }

  protected createCafe(): void {
    this.router.navigate(['/cafe-admin/cafes/new']);
  }

  protected openQr(cafe: CafeResponseDto): void {
    this.router.navigate(['/cafe-admin/cafes', cafe.slug, 'qr']);
  }

  protected openStopList(cafe: CafeResponseDto): void {
    this.router.navigate(['/cafe-admin/cafes', cafe.slug, 'stop-list']);
  }

  protected openMenu(cafe: CafeResponseDto): void {
    this.router.navigate(['/cafe-admin/cafes', cafe.slug, 'menu']);
  }

  protected editCafe(cafe: CafeResponseDto): void {
    this.router.navigate(['/cafe-admin/cafes', cafe.slug, 'edit']);
  }

  protected deleteCafe(cafe: CafeResponseDto): void {
    if (!confirm(this.i18n.t('cafes.confirm_delete', { name: this.displayName(cafe) }))) {
      return;
    }
    this.cafeService.delete(cafe.slug).subscribe({
      next: () => this.load(),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.cafeService.getMy().subscribe({
      next: (response) => {
        this.cafes.set(response.data?.cafes ?? []);
        this.maxCafes.set(response.data?.maxCafes ?? null);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('cafes.error.load'));
      }
    });
  }
}
