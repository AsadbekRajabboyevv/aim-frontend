import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UpgradePromptService } from '../../core/services/upgrade-prompt.service';
import { Observable, Subscription } from 'rxjs';
import {
  AiChatActionDto,
  AiConversationDetailDto,
  AiConversationSummaryDto,
  AiJsonSchema,
  AiStatusDto
} from '../../core/models/ai.model';
import { AiChatStreamService, AiStreamEvent } from '../../core/services/ai-chat-stream.service';
import { AiChatService } from '../../core/services/ai-chat.service';
import { I18nService } from '../../core/services/i18n.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AiOptionsService } from './ai-options.service';
import { missingRequired } from './ai-schema.util';
import { chatMarkdown } from './chat-markdown.util';
import { AiSchemaFormComponent } from './ai-schema-form.component';

type LivePart = { kind: 'text'; text: string } | { kind: 'tool'; label: string | null };

interface HistoryGroup {
  label: string;
  conversations: AiConversationSummaryDto[];
}

const SUGGESTIONS = ['ai_chat.suggestion.add_product', 'ai_chat.suggestion.categories', 'ai_chat.suggestion.sold_out'];
const TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [RouterLink, IconComponent, AiSchemaFormComponent, TranslatePipe],
  template: `
    <div class="flex h-[calc(100dvh-14rem)] min-h-[480px] overflow-hidden rounded-card border border-line bg-surface shadow-card
                lg:h-[calc(100dvh-5rem)]">

      <aside class="w-full flex-col border-r border-line bg-canvas/40 md:flex md:w-72 md:shrink-0"
             [class]="mobileView() === 'list' ? 'flex' : 'hidden'">
        <div class="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
          <h1 class="flex items-center gap-2 text-base font-semibold text-espresso-900">
            <app-icon name="sparkles" [size]="18" class="text-accent-500" />
            {{ 'nav.ai_assistant' | t }}
          </h1>
          <button type="button" (click)="newChat()" [title]="'ai_chat.new_chat' | t" [attr.aria-label]="'ai_chat.new_chat' | t"
                  class="flex h-9 items-center gap-1.5 rounded-xl bg-accent-500 px-3 text-sm font-semibold text-white transition hover:bg-accent-600">
            <app-icon name="plus" [size]="16" />
            {{ 'ai_chat.new' | t }}
          </button>
        </div>

        <div class="flex gap-1 px-3 pt-3">
          <button type="button" (click)="showArchived(false)" [class]="tabClasses(!archivedView())">{{ 'ai_chat.conversations' | t }}</button>
          <button type="button" (click)="showArchived(true)" [class]="tabClasses(archivedView())">
            <app-icon name="archive" [size]="14" />
            {{ 'ai_chat.archive' | t }}
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-2 py-3" [attr.aria-label]="'ai_chat.history' | t">
          @for (group of groups(); track group.label) {
            <p class="px-2 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-espresso-400 uppercase first:pt-0">{{ group.label | t }}</p>
            @for (conversation of group.conversations; track conversation.slug) {
              <div class="group flex items-center gap-1 rounded-xl pr-1 transition"
                   [class]="conversation.slug === active()?.slug ? 'bg-accent-50' : 'hover:bg-surface'">
                <button type="button" (click)="open(conversation.slug)" class="min-w-0 flex-1 px-3 py-2.5 text-left">
                  <span class="block truncate text-sm"
                        [class]="conversation.slug === active()?.slug ? 'font-semibold text-espresso-900' : 'text-espresso-700'">
                    {{ conversation.title || ('ai_chat.new_chat' | t) }}
                  </span>
                  <span class="block text-xs text-espresso-400">{{ when(conversation.lastMessageAt) }}</span>
                </button>
                <div class="flex shrink-0 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <button type="button" (click)="toggleArchive(conversation)"
                          [attr.aria-label]="(conversation.archived ? 'ai_chat.unarchive' : 'ai_chat.archive_action') | t"
                          [title]="(conversation.archived ? 'ai_chat.unarchive' : 'ai_chat.archive_action') | t"
                          class="rounded-lg p-1.5 text-espresso-300 hover:bg-espresso-50 hover:text-espresso-700">
                    <app-icon name="archive" [size]="15" />
                  </button>
                  <button type="button" (click)="remove(conversation)" [attr.aria-label]="'common.delete' | t" [title]="'common.delete' | t"
                          class="rounded-lg p-1.5 text-espresso-300 hover:bg-red-50 hover:text-red-600">
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              </div>
            }
          } @empty {
            <p class="px-3 py-8 text-center text-sm text-espresso-400">
              {{ (listLoading() ? 'common.loading' : archivedView() ? 'ai_chat.archive_empty' : 'ai_chat.no_conversations') | t }}
            </p>
          }
        </nav>
      </aside>

      <section class="min-w-0 flex-1 flex-col md:flex" [class]="mobileView() === 'chat' ? 'flex' : 'hidden'">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <button type="button" (click)="mobileView.set('list')" [attr.aria-label]="'ai_chat.conversation_list' | t"
                  class="rounded-lg p-1.5 text-espresso-400 hover:bg-espresso-50 md:hidden">
            <app-icon name="arrow-left" [size]="18" />
          </button>
          <h2 class="min-w-0 flex-1 truncate font-semibold text-espresso-900">{{ active()?.title || ('ai_chat.new_chat' | t) }}</h2>
          @if (active(); as conversation) {
            @if (conversation.archived) {
              <span class="rounded-full bg-espresso-50 px-2.5 py-1 text-xs font-medium text-espresso-500">{{ 'ai_chat.archived' | t }}</span>
            }
          }
        </header>

        <div #scroller class="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          @if (status(); as status) {
            @if (!status.enabled || !status.configured) {
              <div class="mx-auto mb-4 flex max-w-2xl items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <app-icon name="alert" [size]="18" class="mt-px text-amber-600" />
                {{ (!status.enabled ? 'ai_chat.disabled' : 'ai_chat.not_configured') | t }}
              </div>
            }
          }

          @if (!active() && pendingText() === null) {
            <div class="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center">
              <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-500">
                <app-icon name="sparkles" [size]="32" />
              </span>
              <div>
                <p class="text-lg font-semibold text-espresso-900">{{ 'ai_chat.empty.title' | t }}</p>
                <p class="mt-1 text-sm text-espresso-400">{{ 'ai_chat.empty.text' | t }}</p>
              </div>
              <div class="flex flex-wrap justify-center gap-2">
                @for (suggestion of suggestions; track suggestion) {
                  <button type="button" (click)="sendSuggestion(suggestion)" [disabled]="!canSend()"
                          class="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm text-espresso-700 transition hover:border-accent-300 hover:bg-accent-50 disabled:opacity-50">
                    {{ suggestion | t }}
                  </button>
                }
              </div>
            </div>
          }

          <div class="mx-auto flex max-w-3xl flex-col gap-3">
            @for (item of active()?.items ?? []; track $index) {
              @switch (item.type) {
                @case ('USER') {
                  <div class="flex justify-end">
                    <p class="max-w-[85%] rounded-2xl rounded-br-md bg-accent-500 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white">{{ item.text }}</p>
                  </div>
                }
                @case ('ASSISTANT') {
                  <div class="flex gap-2.5">
                    <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-500">
                      <app-icon name="sparkles" [size]="15" />
                    </span>
                    <div class="max-w-[85%] rounded-2xl rounded-tl-md bg-canvas px-4 py-2.5 text-[15px] leading-relaxed text-espresso-900"
                         [innerHTML]="markdown(item.text)"></div>
                  </div>
                }
                @case ('TOOL') {
                  <p class="ml-9 flex items-center gap-1.5 text-xs text-espresso-400">
                    <app-icon name="wrench" [size]="13" />
                    {{ item.title }} <code class="rounded bg-espresso-50 px-1 font-mono">{{ item.toolName }}</code>
                  </p>
                }
                @case ('ACTION') {
                  @if (item.action; as action) {
                    <div class="ml-9 max-w-xl rounded-2xl border p-4"
                         [class]="action.status === 'PENDING' ? 'border-accent-200 bg-accent-50/40' : 'border-line bg-surface'">
                      <div class="mb-3 flex items-center justify-between gap-2">
                        <p class="flex items-center gap-2 font-semibold text-espresso-900">
                          <app-icon name="check" [size]="16" class="text-accent-500" />
                          {{ action.title }}
                        </p>
                        @if (action.status !== 'PENDING') {
                          <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" [class]="statusClasses(action)">
                            {{ statusLabel(action) }}
                          </span>
                        }
                      </div>
                      @if (action.status === 'PENDING' && active()?.awaitingConfirmation) {
                        @if (action.schema && (editing().has(action.toolCallId) || !isComplete(action))) {
                          @if (!isComplete(action) && !editing().has(action.toolCallId)) {
                            <p class="mb-3 text-sm text-espresso-500">{{ 'ai_chat.action.incomplete' | t }}</p>
                          }
                          <app-ai-schema-form
                            [schema]="action.schema"
                            [initialValues]="action.values"
                            [formId]="'action-' + action.toolCallId"
                            [busy]="deciding() === action.toolCallId"
                            (confirmed)="decide(action, true, $event)"
                            (cancelled)="editing().has(action.toolCallId) ? stopEditing(action) : decide(action, false, null)"
                          />
                        } @else {
                          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            @for (row of summary(action); track row.label) {
                              <dt class="text-espresso-400">{{ row.label }}</dt>
                              <dd class="text-espresso-800">{{ row.value }}</dd>
                            }
                          </dl>
                          <div class="mt-4 flex flex-wrap items-center gap-2">
                            <button type="button" (click)="decide(action, true, action.values)" [disabled]="deciding() !== null"
                                    class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50">
                              @if (deciding() === action.toolCallId) {
                                <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                              } @else {
                                <app-icon name="check" [size]="16" />
                              }
                              {{ 'ai_chat.action.confirm' | t }}
                            </button>
                            <button type="button" (click)="decide(action, false, null)" [disabled]="deciding() !== null"
                                    class="h-9 rounded-xl border border-line-strong bg-surface px-3.5 text-sm font-semibold text-espresso-700 transition hover:bg-espresso-50 disabled:opacity-50">
                              {{ 'common.cancel' | t }}
                            </button>
                            <button type="button" (click)="startEditing(action)" [disabled]="deciding() !== null"
                                    class="ml-auto inline-flex h-9 items-center gap-1.5 px-2 text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50">
                              <app-icon name="pencil" [size]="14" />
                              {{ 'ai_chat.action.edit' | t }}
                            </button>
                          </div>
                        }
                      } @else {
                        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                          @for (row of summary(action); track row.label) {
                            <dt class="text-espresso-400">{{ row.label }}</dt>
                            <dd class="text-espresso-800">{{ row.value }}</dd>
                          }
                        </dl>
                        @if (action.status === 'FAILED' && action.message) {
                          <p class="mt-3 flex items-start gap-1.5 text-sm text-red-600">
                            <app-icon name="alert" [size]="15" class="mt-0.5" />
                            {{ action.message }}
                          </p>
                        }
                      }
                    </div>
                  }
                }
              }
            }

            @if (pendingText() !== null) {
              @if (pendingText()) {
                <div class="flex justify-end">
                  <p class="max-w-[85%] rounded-2xl rounded-br-md bg-accent-500/80 px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white">{{ pendingText() }}</p>
                </div>
              }
              <div class="flex flex-col gap-3" aria-live="polite">
                @for (part of liveParts(); track $index) {
                  @if (part.kind === 'text') {
                    <div class="flex gap-2.5">
                      <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-500">
                        <app-icon name="sparkles" [size]="15" />
                      </span>
                      <div class="max-w-[85%] rounded-2xl rounded-tl-md bg-canvas px-4 py-2.5 text-[15px] leading-relaxed text-espresso-900"
                           [innerHTML]="markdown(part.text)"></div>
                    </div>
                  } @else {
                    <p class="ml-9 flex items-center gap-1.5 text-xs text-espresso-400">
                      <span class="h-3 w-3 animate-spin rounded-full border-2 border-espresso-300 border-t-transparent"></span>
                      {{ part.label || ('ai_chat.checking' | t) }}
                    </p>
                  }
                }
              </div>
              @if (liveParts().length === 0 || liveParts()[liveParts().length - 1].kind === 'tool') {
                <div class="flex items-center gap-2.5">
                  <span class="flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-accent-500">
                    <app-icon name="sparkles" [size]="15" />
                  </span>
                  <span class="flex gap-1 rounded-2xl bg-canvas px-4 py-3.5" [attr.aria-label]="'ai_chat.typing' | t">
                    <span class="h-2 w-2 animate-bounce rounded-full bg-espresso-300"></span>
                    <span class="h-2 w-2 animate-bounce rounded-full bg-espresso-300 [animation-delay:150ms]"></span>
                    <span class="h-2 w-2 animate-bounce rounded-full bg-espresso-300 [animation-delay:300ms]"></span>
                  </span>
                </div>
              }
            }

            @if (errorMessage()) {
              <p class="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <app-icon name="alert" [size]="17" class="mt-px" />
                <span class="flex-1">{{ errorMessage() }}</span>
                <button type="button" (click)="errorMessage.set('')" [attr.aria-label]="'common.close' | t" class="text-red-400 hover:text-red-700">
                  <app-icon name="x" [size]="15" />
                </button>
              </p>
            }
          </div>
        </div>

        <footer class="border-t border-line px-4 py-3 sm:px-6">
          @if (active()?.awaitingConfirmation) {
            @if (pendingActions().length > 1) {
              <div class="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-2 rounded-xl bg-accent-50 px-3 py-2">
                <span class="flex-1 text-sm font-medium text-espresso-800">{{ 'ai_chat.action.pending_count' | t: { count: pendingActions().length } }}</span>
                <button type="button" (click)="decideAll(true)" [disabled]="deciding() !== null || !allComplete()"
                        [title]="allComplete() ? '' : ('ai_chat.action.fill_first' | t)"
                        class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50">
                  @if (deciding() === 'ALL') {
                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  } @else {
                    <app-icon name="check" [size]="16" />
                  }
                  {{ 'ai_chat.action.confirm_all' | t }}
                </button>
                <button type="button" (click)="decideAll(false)" [disabled]="deciding() !== null"
                        class="h-9 rounded-xl border border-line-strong bg-surface px-3.5 text-sm font-semibold text-espresso-700 transition hover:bg-espresso-50 disabled:opacity-50">
                  {{ 'ai_chat.action.cancel_all' | t }}
                </button>
              </div>
            } @else {
              <p class="mx-auto mb-2 max-w-3xl text-xs text-espresso-400">{{ 'ai_chat.action.pending_hint' | t }}</p>
            }
          }
          <form (submit)="$event.preventDefault(); sendText(draft())" class="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              #composer
              rows="1"
              [placeholder]="'ai_chat.composer_placeholder' | t"
              [value]="draft()"
              (input)="onDraft($any($event.target))"
              (keydown.enter)="onEnter($any($event))"
              [disabled]="!canSend()"
              [attr.aria-label]="'ai_chat.message' | t"
              class="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-surface px-4 py-2.5 text-[15px] text-espresso-900
                     placeholder:text-espresso-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none disabled:bg-espresso-50"
            ></textarea>
            <button type="submit" [disabled]="!canSend() || !draft().trim()" [attr.aria-label]="'ai_chat.send' | t" [title]="'ai_chat.send' | t"
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500 text-white transition hover:bg-accent-600 disabled:opacity-40">
              <app-icon name="send" [size]="18" />
            </button>
          </form>
          @if (status()?.messages; as allowance) {
            @if (allowance.limit !== null) {
              <p class="mx-auto mt-2 flex max-w-3xl flex-wrap items-center gap-x-2 text-xs"
                 [class]="(allowance.percent ?? 0) >= 100 ? 'text-red-600' : 'text-espresso-400'">
                <span>{{ 'ai_chat.allowance' | t: { used: allowance.used ?? 0, limit: allowance.limit } }}</span>
                @if ((allowance.percent ?? 0) >= 80) {
                  <a routerLink="/billing" class="font-semibold text-accent-600 hover:underline">
                    {{ ((allowance.percent ?? 0) >= 100 ? 'ai_chat.allowance_exhausted' : 'ai_chat.allowance_more') | t }}
                  </a>
                }
              </p>
            }
          }
        </footer>
      </section>
    </div>
  `
})
export class AiChatComponent implements OnInit {

  private readonly chatService = inject(AiChatService);
  private readonly streamService = inject(AiChatStreamService);
  private streamSubscription: Subscription | null = null;
  private readonly optionsService = inject(AiOptionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly upgradePrompt = inject(UpgradePromptService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  protected readonly suggestions = SUGGESTIONS;

  protected readonly status = signal<AiStatusDto | null>(null);
  protected readonly conversations = signal<AiConversationSummaryDto[]>([]);
  protected readonly archivedView = signal(false);
  protected readonly listLoading = signal(true);
  protected readonly active = signal<AiConversationDetailDto | null>(null);
  protected readonly draft = signal('');
  protected readonly pendingText = signal<string | null>(null);
  protected readonly deciding = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly mobileView = signal<'list' | 'chat'>('list');
  private readonly optionLabels = signal<Record<string, string>>({});
  protected readonly liveParts = signal<LivePart[]>([]);
  protected readonly editing = signal<ReadonlySet<string>>(new Set());

  protected readonly pendingActions = computed<AiChatActionDto[]>(() => {
    const conversation = this.active();
    if (!conversation?.awaitingConfirmation) {
      return [];
    }
    return conversation.items
      .map((item) => item.action)
      .filter((action): action is AiChatActionDto => !!action && action.status === 'PENDING');
  });

  protected readonly allComplete = computed(() => this.pendingActions().every((action) => this.isComplete(action)));

  protected readonly canSend = computed(() => {
    const status = this.status();
    return !!status && status.enabled && status.configured && this.pendingText() === null && this.deciding() === null;
  });

  protected readonly groups = computed<HistoryGroup[]>(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = startOfToday.getTime();
    const buckets: HistoryGroup[] = [
      { label: 'ai_chat.group.today', conversations: [] },
      { label: 'ai_chat.group.yesterday', conversations: [] },
      { label: 'ai_chat.group.week', conversations: [] },
      { label: 'ai_chat.group.month', conversations: [] },
      { label: 'ai_chat.group.older', conversations: [] }
    ];
    for (const conversation of this.conversations()) {
      const time = new Date(conversation.lastMessageAt).getTime();
      const index = time >= today ? 0 : time >= today - DAY_MS ? 1 : time >= today - 6 * DAY_MS ? 2 : time >= today - 29 * DAY_MS ? 3 : 4;
      buckets[index].conversations.push(conversation);
    }
    return buckets.filter((bucket) => bucket.conversations.length > 0);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.streamSubscription?.unsubscribe());
  }

  private loadStatus(): void {
    this.chatService.status().subscribe({
      next: (response) => this.status.set(response.data ?? null),
      error: () => this.status.set({ enabled: false, configured: false, messages: null })
    });
  }

  ngOnInit(): void {
    this.loadStatus();
    this.loadList();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.active.set(null);
        return;
      }
      if (slug !== this.active()?.slug) {
        this.load(slug);
      }
      this.mobileView.set('chat');
    });
  }

  protected tabClasses(on: boolean): string {
    return [
      'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition',
      on ? 'bg-surface text-espresso-900 shadow-sm ring-1 ring-line' : 'text-espresso-400 hover:text-espresso-700'
    ].join(' ');
  }

  protected when(iso: string): string {
    const date = new Date(iso);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return date.getTime() >= startOfToday.getTime() ? TIME_FORMAT.format(date) : DATE_FORMAT.format(date);
  }

  protected newChat(): void {
    this.errorMessage.set('');
    this.draft.set('');
    this.mobileView.set('chat');
    this.router.navigate(['/ai-chat']);
    setTimeout(() => this.composer()?.nativeElement.focus());
  }

  protected open(slug: string): void {
    this.errorMessage.set('');
    this.router.navigate(['/ai-chat', slug]);
  }

  protected showArchived(archived: boolean): void {
    if (this.archivedView() !== archived) {
      this.archivedView.set(archived);
      this.loadList();
    }
  }

  protected onDraft(textarea: HTMLTextAreaElement): void {
    this.draft.set(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  protected onEnter(event: KeyboardEvent): void {
    if (!event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendText(this.draft());
    }
  }

  protected sendSuggestion(key: string): void {
    this.sendText(this.i18n.t(key));
  }

  protected sendText(raw: string): void {
    const text = raw.trim();
    if (!text || !this.canSend()) {
      return;
    }
    this.errorMessage.set('');
    this.pendingText.set(text);
    this.draft.set('');
    this.resetComposerHeight();
    this.scrollToBottom();
    const current = this.active();
    this.runTurn(current ? this.streamService.send(current.slug, text) : this.streamService.create(text), {
      onError: () => this.draft.set(text)
    });
  }

  private runTurn(events: Observable<AiStreamEvent>, options: { onError?: () => void } = {}): void {
    this.liveParts.set([]);
    let slug = this.active()?.slug ?? null;
    const startedNew = slug === null;
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = events.subscribe((event) => {
      switch (event.type) {
        case 'conversation':
          slug = event.slug;
          break;
        case 'delta':
          this.liveParts.update((parts) => {
            const last = parts[parts.length - 1];
            return last?.kind === 'text'
              ? [...parts.slice(0, -1), { kind: 'text', text: last.text + event.text }]
              : [...parts, { kind: 'text', text: event.text }];
          });
          this.scrollToBottom();
          break;
        case 'tool':
          this.liveParts.update((parts) => parts[parts.length - 1]?.kind === 'tool'
            ? [...parts.slice(0, -1), { kind: 'tool', label: event.label }]
            : [...parts, { kind: 'tool', label: event.label }]);
          this.scrollToBottom();
          break;
        case 'done':
          this.finishTurn();
          this.loadStatus();
          this.show(event.detail);
          if (startedNew) {
            this.router.navigate(['/ai-chat', event.detail.slug], { replaceUrl: true });
          }
          this.loadList();
          break;
        case 'error':
          this.finishTurn();
          options.onError?.();
          this.errorMessage.set(event.message);
          if (event.limit) {
            this.upgradePrompt.show(event.limit);
            this.loadStatus();
          }
          if (slug) {
            this.load(slug);
            if (startedNew) {
              this.router.navigate(['/ai-chat', slug], { replaceUrl: true });
            }
          }
          this.loadList();
          break;
      }
    });
  }

  private finishTurn(): void {
    this.pendingText.set(null);
    this.deciding.set(null);
    this.liveParts.set([]);
  }

  protected decide(action: AiChatActionDto, approved: boolean, values: Record<string, unknown> | null): void {
    const conversation = this.active();
    if (!conversation || this.deciding()) {
      return;
    }
    this.errorMessage.set('');
    this.deciding.set(action.toolCallId);
    this.pendingText.set('');
    this.scrollToBottom();
    this.runTurn(this.streamService.decide(conversation.slug, action.toolCallId, approved, values));
  }

  protected toggleArchive(conversation: AiConversationSummaryDto): void {
    this.chatService.update(conversation.slug, { archived: !conversation.archived }).subscribe({
      next: () => {
        this.conversations.update((list) => list.filter((item) => item.slug !== conversation.slug));
        const active = this.active();
        if (active?.slug === conversation.slug) {
          this.active.set({ ...active, archived: !conversation.archived });
        }
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.save'))
    });
  }

  protected remove(conversation: AiConversationSummaryDto): void {
    if (!confirm(this.i18n.t('ai_chat.confirm_delete', { name: conversation.title || this.i18n.t('ai_chat.new_chat') }))) {
      return;
    }
    this.chatService.delete(conversation.slug).subscribe({
      next: () => {
        this.conversations.update((list) => list.filter((item) => item.slug !== conversation.slug));
        if (this.active()?.slug === conversation.slug) {
          this.active.set(null);
          this.router.navigate(['/ai-chat']);
          this.mobileView.set('list');
        }
      },
      error: (error) => this.errorMessage.set(error?.error?.message ?? this.i18n.t('common.error.delete'))
    });
  }

  protected isComplete(action: AiChatActionDto): boolean {
    return missingRequired(action.schema, action.values ?? {}).length === 0;
  }

  protected startEditing(action: AiChatActionDto): void {
    this.editing.update((ids) => new Set(ids).add(action.toolCallId));
  }

  protected stopEditing(action: AiChatActionDto): void {
    this.editing.update((ids) => {
      const next = new Set(ids);
      next.delete(action.toolCallId);
      return next;
    });
  }

  protected decideAll(approved: boolean): void {
    const conversation = this.active();
    if (!conversation || this.deciding()) {
      return;
    }
    this.errorMessage.set('');
    this.deciding.set('ALL');
    this.pendingText.set('');
    this.scrollToBottom();
    this.runTurn(this.streamService.decideAll(conversation.slug, approved));
  }

  protected markdown(text: string | null): string {
    return chatMarkdown(text ?? '');
  }

  protected statusLabel(action: AiChatActionDto): string {
    // i18n: ai_chat.action_status.PENDING, ai_chat.action_status.EXECUTED, ai_chat.action_status.FAILED, ai_chat.action_status.CANCELLED
    return this.i18n.t(`ai_chat.action_status.${action.status}`);
  }

  protected statusClasses(action: AiChatActionDto): string {
    return {
      PENDING: 'bg-accent-50 text-accent-700',
      EXECUTED: 'bg-emerald-50 text-emerald-700',
      FAILED: 'bg-red-50 text-red-700',
      CANCELLED: 'bg-espresso-50 text-espresso-500'
    }[action.status];
  }

  protected summary(action: AiChatActionDto): { label: string; value: string }[] {
    const values = action.values ?? {};
    const properties = action.schema?.properties ?? Object.fromEntries(Object.keys(values).map((key) => [key, {} as AiJsonSchema]));
    const labels = this.optionLabels();
    return Object.entries(properties)
      .map(([key, schema]) => ({
        label: schema.title || key,
        value: labels[`${action.toolCallId}|${key}`] ?? this.format(values[key], schema)
      }))
      .filter((row) => row.value !== '');
  }

  private resolveOptionLabels(detail: AiConversationDetailDto): void {
    for (const item of detail.items) {
      const action = item.action;
      if (!action || !action.schema?.properties || !action.values) {
        continue;
      }
      for (const [key, schema] of Object.entries(action.schema.properties)) {
        const source = schema['x-options'];
        const value = action.values[key];
        const labelKey = `${action.toolCallId}|${key}`;
        if (!source || value === undefined || value === null || this.optionLabels()[labelKey]) {
          continue;
        }
        const path = this.optionsService.resolvePath(source, action.values);
        if (path) {
          this.optionsService.load(source, path).subscribe((options) => {
            const label = options.find((option) => option.value === String(value))?.label;
            if (label) {
              this.optionLabels.update((all) => ({ ...all, [labelKey]: label }));
            }
          });
        }
      }
    }
  }

  private format(value: unknown, schema: AiJsonSchema): string {
    if (value === undefined || value === null || value === '') {
      return '';
    }
    if (typeof value === 'boolean') {
      return this.i18n.t(value ? 'common.yes' : 'common.no');
    }
    if (schema.format === 'date-time' && typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) {
      return DATE_TIME_FORMAT.format(new Date(value));
    }
    if (typeof value === 'number') {
      return value.toLocaleString('ru-RU');
    }
    if (Array.isArray(value)) {
      const labels = schema.items?.enum ? schema['x-enum-labels'] ?? {} : {};
      return value.map((item) => labels[String(item)] ?? String(item)).join(', ');
    }
    if (typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).filter((item) => item !== '' && item !== null).join(' / ');
    }
    return String(value);
  }

  private show(detail: AiConversationDetailDto): void {
    this.active.set(detail);
    this.resolveOptionLabels(detail);
    this.mobileView.set('chat');
    this.scrollToBottom();
  }

  private load(slug: string): void {
    this.chatService.getBySlug(slug).subscribe({
      next: (response) => response.data && this.show(response.data),
      error: (error) => {
        this.active.set(null);
        this.errorMessage.set(error?.error?.message ?? this.i18n.t('ai_chat.error.open'));
      }
    });
  }

  private loadList(): void {
    this.chatService.get(this.archivedView()).subscribe({
      next: (response) => {
        this.conversations.set(response.data ?? []);
        this.listLoading.set(false);
      },
      error: () => this.listLoading.set(false)
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const element = this.scroller()?.nativeElement;
      element?.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    });
  }

  private resetComposerHeight(): void {
    const textarea = this.composer()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }
}
