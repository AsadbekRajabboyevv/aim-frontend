import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CafeResponseDto } from '../../../core/models/cafe.model';
import { CafeService } from '../../../core/services/cafe.service';
import { I18nService } from '../../../core/services/i18n.service';
import { PublicMenuService } from '../../../core/services/public-menu.service';
import { uiName } from '../../../core/utils/ui-format.util';
import { menuThemeStyle } from '../../../core/utils/menu-theme.util';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

type StickerSize = 'S' | 'M' | 'L';

const STICKER_WIDTH_CM: Record<StickerSize, number> = { S: 5, M: 7, L: 9 };

const MAX_TABLES = 200;

@Component({
  selector: 'app-qr-print',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, ButtonComponent, IconComponent, AvatarComponent, TranslatePipe],
  template: `
    <div class="print:hidden">
      <app-page-header
        [title]="cafeName() ? cafeName() + ' — ' + ('cafes.action.qr' | t) : ('cafes.action.qr' | t)"
        [subtitle]="'qr.subtitle' | t"
        [backLink]="returnLink()"
        [backLabel]="'cafe_editor.back' | t"
      >
        <app-button icon="printer" [disabled]="stickers().length === 0" (clicked)="print()">{{ 'qr.print' | t: { count: stickers().length } }}</app-button>
      </app-page-header>

      <section class="mb-8 grid gap-6 rounded-card border border-line bg-surface p-6 shadow-card lg:grid-cols-4">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-espresso-800">{{ 'settings.form.type' | t }}</span>
          <div class="flex rounded-xl bg-espresso-50 p-1">
            <button type="button" (click)="mode.set('tables')" class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
                    [class]="mode() === 'tables' ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400'">{{ 'qr.mode.tables' | t }}</button>
            <button type="button" (click)="mode.set('general')" class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
                    [class]="mode() === 'general' ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400'">{{ 'qr.mode.general' | t }}</button>
          </div>
        </div>

        @if (mode() === 'tables') {
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium text-espresso-800">{{ 'qr.table_numbers' | t }}</span>
            <div class="flex items-center gap-2">
              <input type="number" min="1" [max]="maxTables" [ngModel]="from()" (ngModelChange)="from.set(clamp($event))"
                     [attr.aria-label]="'qr.first_table' | t" class="h-11 w-full rounded-xl border border-line-strong px-3 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
              <span class="text-espresso-400">—</span>
              <input type="number" min="1" [max]="maxTables" [ngModel]="to()" (ngModelChange)="to.set(clamp($event))"
                     [attr.aria-label]="'qr.last_table' | t" class="h-11 w-full rounded-xl border border-line-strong px-3 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
            </div>
          </div>
        } @else {
          <div class="flex flex-col gap-2">
            <span class="text-sm font-medium text-espresso-800">{{ 'qr.copies' | t }}</span>
            <input type="number" min="1" [max]="maxTables" [ngModel]="copies()" (ngModelChange)="copies.set(clamp($event))"
                   [attr.aria-label]="'qr.copies' | t" class="h-11 w-full rounded-xl border border-line-strong px-3 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
          </div>
        }

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-espresso-800">{{ 'qr.size' | t }}</span>
          <div class="flex rounded-xl bg-espresso-50 p-1">
            @for (option of sizeOptions; track option) {
              <button type="button" (click)="size.set(option)" class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
                      [class]="size() === option ? 'bg-surface text-espresso-900 shadow-sm' : 'text-espresso-400'">
                {{ widthCm(option) }} {{ 'qr.cm' | t }}
              </button>
            }
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="qr-caption" class="text-sm font-medium text-espresso-800">{{ 'qr.caption' | t }}</label>
          <input id="qr-caption" type="text" maxlength="60" [ngModel]="caption()" (ngModelChange)="caption.set($event)"
                 class="h-11 w-full rounded-xl border border-line-strong px-3 text-sm focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none" />
        </div>

        @if (menuUrl()) {
          <p class="flex items-center gap-2 text-sm text-espresso-500 lg:col-span-4">
            <app-icon name="qr" [size]="16" class="text-accent-600" />
            {{ 'qr.url_label' | t }}
            <a [href]="menuUrl()" target="_blank" rel="noopener" class="font-mono text-accent-600 hover:underline">{{ menuUrl() }}</a>
            <span class="text-espresso-300">{{ 'qr.url_hint' | t }}</span>
          </p>
        }
      </section>

      @if (errorMessage()) {
        <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <app-icon name="alert" [size]="18" class="mt-px" />
          {{ errorMessage() }}
        </div>
      }
    </div>

    <div class="palette-light flex flex-wrap gap-4 print:gap-3" [style]="themeStyle()">
      @for (sticker of stickers(); track sticker.key) {
        <div class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface p-4 text-center print:break-inside-avoid"
             [style.width.cm]="widthCm(size())">
          <div class="flex items-center gap-2">
            <app-avatar [name]="cafeName()" [imageUrl]="cafe()?.logoUrl ?? null" [size]="size() === 'S' ? 22 : 28" />
            <span class="font-display font-semibold text-espresso-900" [class]="size() === 'S' ? 'text-sm' : 'text-base'">{{ cafeName() }}</span>
          </div>
          <img [src]="sticker.qr" alt="QR" class="aspect-square w-full" />
          @if (sticker.table) {
            <span class="rounded-full bg-accent-500 px-3 py-0.5 font-semibold text-white" [class]="size() === 'S' ? 'text-sm' : 'text-lg'">
              {{ 'qr.table' | t: { number: sticker.table } }}
            </span>
          }
          <span class="leading-tight text-espresso-500" [class]="size() === 'S' ? 'text-[10px]' : 'text-xs'">{{ caption() }}</span>
        </div>
      }
    </div>
  `
})
export class QrPrintComponent implements OnInit {

  private readonly cafeService = inject(CafeService);
  private readonly publicMenuService = inject(PublicMenuService);
  private readonly i18n = inject(I18nService);

  readonly cafeSlug = input.required<string>();
  readonly returnLink = input.required<string>();

  protected readonly maxTables = MAX_TABLES;
  protected readonly sizeOptions: StickerSize[] = ['S', 'M', 'L'];
  protected readonly cafe = signal<CafeResponseDto | null>(null);
  protected readonly menuUrl = signal('');
  protected readonly errorMessage = signal('');
  protected readonly mode = signal<'tables' | 'general'>('tables');
  protected readonly from = signal(1);
  protected readonly to = signal(10);
  protected readonly copies = signal(1);
  protected readonly size = signal<StickerSize>('M');
  protected readonly caption = signal(this.i18n.t('qr.caption_default'));

  protected readonly cafeName = computed(() => uiName(this.cafe()?.nameTranslations ?? null));
  protected readonly themeStyle = computed(() => menuThemeStyle(this.cafe()?.theme));

  protected readonly stickers = computed(() => {
    const slug = this.cafeSlug();
    if (this.mode() === 'general') {
      return Array.from({ length: this.copies() }, (_, index) => ({
        key: `general-${index}`, table: null as number | null, qr: this.publicMenuService.qrImageUrl(slug)
      }));
    }
    const first = Math.min(this.from(), this.to());
    const last = Math.min(Math.max(this.from(), this.to()), first + MAX_TABLES - 1);
    return Array.from({ length: last - first + 1 }, (_, index) => {
      const table = first + index;
      return { key: `table-${table}`, table: table as number | null, qr: this.publicMenuService.qrImageUrl(slug, table) };
    });
  });

  ngOnInit(): void {
    this.cafeService.getBySlug(this.cafeSlug()).subscribe({
      next: (response) => this.cafe.set(response.data ?? null),
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('cafe_editor.error.load'))
    });
    this.publicMenuService.link(this.cafeSlug()).subscribe({
      next: (response) => this.menuUrl.set(response.data?.url ?? ''),
      error: () => this.menuUrl.set('')
    });
  }

  protected widthCm(size: StickerSize): number {
    return STICKER_WIDTH_CM[size];
  }

  protected clamp(value: unknown): number {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(Math.max(number, 1), MAX_TABLES) : 1;
  }

  protected print(): void {
    window.print();
  }
}
