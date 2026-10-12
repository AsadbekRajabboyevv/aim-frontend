import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoredFileDto } from '../../../core/models/file.model';
import { I18nService } from '../../../core/services/i18n.service';
import { OrphanFileService } from '../../../core/services/orphan-file.service';
import { mediaUrl } from '../../../core/utils/media-url.util';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

@Component({
  selector: 'app-orphan-files',
  standalone: true,
  imports: [DatePipe, ButtonComponent, IconComponent, BadgeComponent, PageHeaderComponent, StatCardComponent, TranslatePipe],
  template: `
    <app-page-header [title]="'files.title' | t" [subtitle]="'files.subtitle' | t">
      <app-button variant="secondary" icon="refresh" [loading]="loading()" (clicked)="load()">{{ 'common.refresh' | t }}</app-button>
      <app-button variant="danger" icon="trash" [disabled]="selected().size === 0 || deleting()" [loading]="deleting()"
                  (clicked)="deleteSelected()">
        {{ 'files.delete_selected' | t: { count: selected().size } }}
      </app-button>
    </app-page-header>

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <app-stat-card [label]="'files.stats.count' | t" icon="folder" tone="accent" [value]="loading() ? null : files().length" />
      <app-stat-card [label]="'files.stats.size' | t" icon="hard-drive" tone="neutral" [value]="loading() ? null : totalMb()" />
      <app-stat-card [label]="'files.stats.selected' | t" icon="check" tone="danger" [value]="selected().size" />
    </div>

    @if (resultMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <app-icon name="check" [size]="18" class="mt-px" />
        <span class="flex-1">{{ resultMessage() }}</span>
        <button type="button" (click)="resultMessage.set('')" [attr.aria-label]="'common.close' | t"><app-icon name="x" [size]="16" /></button>
      </div>
    }
    @if (errorMessage()) {
      <div class="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <app-icon name="alert" [size]="18" class="mt-px" />
        <span class="flex-1">{{ errorMessage() }}</span>
        <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t"><app-icon name="x" [size]="16" /></button>
      </div>
    }

    <div class="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <label class="flex cursor-pointer items-center gap-3 text-sm font-medium text-espresso-800">
          <input type="checkbox" class="h-4 w-4 accent-accent-500" [checked]="allSelected()" [indeterminate]="someSelected()"
                 [disabled]="deletable().length === 0" (change)="toggleAll($any($event.target).checked)" />
          {{ 'files.select_all' | t: { count: deletable().length } }}
        </label>
        <span class="text-xs text-espresso-400">
          {{ 'files.grace_hint' | t: { minutes: gracePeriodMinutes() } }}
        </span>
      </div>

      @for (file of files(); track file.url) {
        <label class="flex items-center gap-4 border-b border-line px-5 py-3 last:border-b-0"
               [class]="file.recent ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-canvas/70'">
          <input type="checkbox" class="h-4 w-4 shrink-0 accent-accent-500" [checked]="selected().has(file.url)"
                 [disabled]="file.recent" (change)="toggle(file, $any($event.target).checked)" />
          <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-espresso-50">
            @if (isImage(file)) {
              <img [src]="url(file)" alt="" loading="lazy" class="h-full w-full object-cover" />
            } @else {
              <app-icon name="folder" [size]="22" class="text-espresso-300" />
            }
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-mono text-sm text-espresso-900" [title]="file.url">{{ file.fileName }}</p>
            <p class="text-xs text-espresso-400">
              {{ file.cafeSlug ?? '—' }} · {{ file.category ?? '—' }} · {{ size(file.sizeBytes) }} · {{ file.lastModified | date: 'dd.MM.yyyy HH:mm' }}
            </p>
          </div>
          @if (file.recent) {
            <app-badge tone="warning">{{ 'files.recent' | t }}</app-badge>
          }
          <a [href]="url(file)" target="_blank" rel="noopener" (click)="$event.stopPropagation()"
             class="rounded-lg p-2 text-espresso-300 hover:bg-espresso-50 hover:text-espresso-700" [attr.aria-label]="'common.open' | t">
            <app-icon name="external" [size]="18" />
          </a>
        </label>
      } @empty {
        <div class="flex flex-col items-center gap-2 px-5 py-16 text-center text-espresso-400">
          @if (loading()) {
            {{ 'common.loading' | t }}
          } @else {
            <span class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <app-icon name="check" [size]="24" />
            </span>
            <span class="text-sm">{{ 'files.empty' | t }}</span>
          }
        </div>
      }
    </div>
  `
})
export class OrphanFilesComponent implements OnInit {

  private readonly orphanFileService = inject(OrphanFileService);
  private readonly i18n = inject(I18nService);

  protected readonly files = signal<StoredFileDto[]>([]);
  protected readonly totalBytes = signal(0);
  protected readonly gracePeriodMinutes = signal(60);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly loading = signal(true);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly resultMessage = signal('');

  protected readonly deletable = computed(() => this.files().filter((file) => !file.recent));
  protected readonly allSelected = computed(() => this.deletable().length > 0 && this.selected().size === this.deletable().length);
  protected readonly someSelected = computed(() => this.selected().size > 0 && !this.allSelected());
  protected readonly totalMb = computed(() => Math.round((this.totalBytes() / 1024 / 1024) * 10) / 10);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.orphanFileService.get().subscribe({
      next: (response) => {
        const data = response.data;
        this.files.set(data?.files ?? []);
        this.totalBytes.set(data?.totalSizeBytes ?? 0);
        this.gracePeriodMinutes.set(data?.gracePeriodMinutes ?? 60);
        const urls = new Set(this.files().map((file) => file.url));
        this.selected.update((current) => new Set([...current].filter((url) => urls.has(url))));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('files.error.load'));
      }
    });
  }

  protected toggle(file: StoredFileDto, checked: boolean): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(file.url);
      } else {
        next.delete(file.url);
      }
      return next;
    });
  }

  protected toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.deletable().map((file) => file.url)) : new Set());
  }

  protected deleteSelected(): void {
    const urls = [...this.selected()];
    if (urls.length === 0 || !confirm(this.i18n.t('files.confirm_delete', { count: urls.length }))) {
      return;
    }
    this.deleting.set(true);
    this.errorMessage.set('');
    this.orphanFileService.delete(urls).subscribe({
      next: (response) => {
        const result = response.data;
        this.deleting.set(false);
        this.selected.set(new Set());
        if (result) {
          const skipped = result.skipped.length ? this.i18n.t('files.result_skipped', { count: result.skipped.length }) : '';
          this.resultMessage.set(this.i18n.t('files.result', { count: result.deletedCount, size: this.size(result.freedBytes) }) + skipped);
        }
        this.load();
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'));
      }
    });
  }

  protected isImage(file: StoredFileDto): boolean {
    return IMAGE_EXTENSIONS.includes(file.fileName.split('.').pop()?.toLowerCase() ?? '');
  }

  protected url(file: StoredFileDto): string {
    return mediaUrl(file.url) ?? file.url;
  }

  protected size(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
