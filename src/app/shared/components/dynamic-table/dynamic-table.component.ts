import { Component, OnChanges, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseResponse } from '../../../core/models/base-response.model';
import { PageableRequest, PageResponse } from '../../../core/models/page-response.model';
import { AvatarComponent } from '../avatar/avatar.component';
import { BadgeComponent, BadgeTone } from '../badge/badge.component';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
import { IconComponent, IconName } from '../icon/icon.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface TableMediaCell {
  imageUrl: string | null;
  title: string;
  subtitle?: string | null;
}

export interface TableBadgeCell {
  /** Translation key (plain text passes through unchanged). */
  label: string;
  tone: BadgeTone;
}

export interface TableColumn<T> {
  key: string;
  /** Translation key (plain text passes through unchanged). */
  header: string;
  cell?: (row: T) => string;
  media?: (row: T) => TableMediaCell;
  person?: (row: T) => string | null;
  badge?: (row: T) => TableBadgeCell;
}

export interface TableAction<T> {
  /** Translation key (plain text passes through unchanged). */
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  handler: (row: T) => void;
}

@Component({
  selector: 'app-dynamic-table',
  standalone: true,
  imports: [ButtonComponent, IconComponent, AvatarComponent, BadgeComponent, TranslatePipe],
  template: `
    <div class="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div class="relative overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-line">
              @for (column of columns(); track column.key) {
                <th class="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-espresso-400 uppercase">
                  {{ column.header | t }}
                </th>
              }
              @if (actions().length) {
                <th class="px-5 py-3.5"><span class="sr-only">{{ 'common.actions' | t }}</span></th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            @if (loading() && rows().length === 0) {
              @for (placeholder of skeletonRows; track placeholder) {
                <tr>
                  @for (column of columns(); track column.key) {
                    <td class="px-5 py-4"><div class="h-4 w-3/4 animate-pulse rounded bg-espresso-50"></div></td>
                  }
                  @if (actions().length) {
                    <td class="px-5 py-4"></td>
                  }
                </tr>
              }
            }
            @for (row of rows(); track $index) {
              <tr class="transition hover:bg-canvas/70">
                @for (column of columns(); track column.key) {
                  <td class="px-5 py-3.5 text-espresso-700">
                    @if (column.media) {
                      @let media = column.media(row);
                      <div class="flex items-center gap-3">
                        <app-avatar [name]="media.title" [imageUrl]="media.imageUrl" shape="rounded" [size]="44" />
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-espresso-900">{{ media.title }}</p>
                          @if (media.subtitle) {
                            <p class="truncate text-xs text-espresso-400">{{ media.subtitle }}</p>
                          }
                        </div>
                      </div>
                    } @else if (column.person) {
                      @let person = column.person(row);
                      @if (person) {
                        <div class="flex items-center gap-2.5">
                          <app-avatar [name]="person" [size]="32" />
                          <span class="truncate">{{ person }}</span>
                        </div>
                      } @else {
                        <span class="text-espresso-300">—</span>
                      }
                    } @else if (column.badge) {
                      @let badge = column.badge(row);
                      <app-badge [tone]="badge.tone">{{ badge.label | t }}</app-badge>
                    } @else {
                      {{ cellValue(row, column) }}
                    }
                  </td>
                }
                @if (actions().length) {
                  <td class="px-5 py-3.5">
                    <div class="flex justify-end gap-2">
                      @for (action of actions(); track action.label) {
                        @if (action.icon) {
                          <app-button
                            [variant]="action.variant ?? 'secondary'"
                            size="sm"
                            [icon]="action.icon"
                            [iconOnly]="true"
                            [ariaLabel]="action.label | t"
                            (clicked)="action.handler(row)"
                          />
                        } @else {
                          <app-button [variant]="action.variant ?? 'secondary'" size="sm" (clicked)="action.handler(row)">
                            {{ action.label | t }}
                          </app-button>
                        }
                      }
                    </div>
                  </td>
                }
              </tr>
            }
            @if (!loading() && rows().length === 0) {
              <tr>
                <td [attr.colspan]="columns().length + (actions().length ? 1 : 0)" class="px-5 py-14 text-center">
                  <div class="flex flex-col items-center gap-2 text-espresso-400">
                    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-espresso-50">
                      <app-icon name="search" [size]="22" />
                    </span>
                    <span class="text-sm">{{ emptyText() || ('common.no_data' | t) }}</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-espresso-500">
        <span>{{ 'common.total' | t }}: <span class="font-semibold text-espresso-800">{{ totalElements() }}</span></span>
        <div class="flex items-center gap-3">
          <app-button variant="secondary" size="sm" icon="chevron-left" [iconOnly]="true" [ariaLabel]="'common.prev_page' | t"
                      [disabled]="page() === 0" (clicked)="goToPage(page() - 1)" />
          <span class="tabular-nums">{{ page() + 1 }} / {{ totalPages() || 1 }}</span>
          <app-button variant="secondary" size="sm" icon="chevron-right" [iconOnly]="true" [ariaLabel]="'common.next_page' | t"
                      [disabled]="page() + 1 >= totalPages()" (clicked)="goToPage(page() + 1)" />
        </div>
      </div>
    </div>
  `
})
export class DynamicTableComponent<T> implements OnChanges {

  readonly columns = input.required<TableColumn<T>[]>();
  readonly actions = input<TableAction<T>[]>([]);
  readonly pageSize = input<number>(20);
  readonly loader = input.required<(pageable: PageableRequest) => Observable<BaseResponse<PageResponse<T>>>>();
  readonly reloadTrigger = input<number>(0);
  /** Defaults to the common "nothing found" text. */
  readonly emptyText = input<string>('');

  readonly loadError = output<unknown>();
  readonly loaded = output<PageResponse<T>>();

  protected readonly skeletonRows = [0, 1, 2, 3];
  protected readonly rows = signal<T[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly loading = signal(false);

  ngOnChanges(): void {
    this.page.set(0);
    this.fetch();
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.fetch();
  }

  protected cellValue(row: T, column: TableColumn<T>): string {
    if (column.cell) {
      return column.cell(row);
    }
    const value = (row as Record<string, unknown>)[column.key];
    return value === null || value === undefined ? '' : String(value);
  }

  private fetch(): void {
    this.loading.set(true);
    this.loader()({ page: this.page(), size: this.pageSize() }).subscribe({
      next: (response) => {
        const data = response.data;
        this.rows.set(data?.content ?? []);
        this.totalPages.set(data?.totalPages ?? 0);
        this.totalElements.set(data?.totalElements ?? 0);
        this.loading.set(false);
        if (data) {
          this.loaded.emit(data);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.loadError.emit(error);
      }
    });
  }
}
