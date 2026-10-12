import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL, LANGUAGE_HEADER } from '../constants/api.constants';
import { AiConversationDetailDto } from '../models/ai.model';
import { PlanLimitErrorDto } from '../models/billing.model';
import { AuthService } from './auth.service';
import { uiText } from './i18n.service';
import { LanguageService } from './language.service';
import { TokenStorageService } from './token-storage.service';

export type AiStreamEvent =
  | { type: 'conversation'; slug: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; label: string | null }
  | { type: 'done'; detail: AiConversationDetailDto }
  | { type: 'error'; message: string; status: number; limit?: PlanLimitErrorDto };

const MIN_TOKEN_LIFETIME_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AiChatStreamService {

  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${API_BASE_URL}/ai/conversations`;

  create(text: string): Observable<AiStreamEvent> {
    return this.stream(`${this.baseUrl}/stream`, { text });
  }

  send(slug: string, text: string): Observable<AiStreamEvent> {
    return this.stream(`${this.baseUrl}/${slug}/messages/stream`, { text });
  }

  decide(slug: string, toolCallId: string, approved: boolean, args: Record<string, unknown> | null): Observable<AiStreamEvent> {
    return this.stream(`${this.baseUrl}/${slug}/actions/${encodeURIComponent(toolCallId)}/stream`, { approved, arguments: args });
  }

  decideAll(slug: string, approved: boolean): Observable<AiStreamEvent> {
    return this.stream(`${this.baseUrl}/${slug}/actions/stream`, { approved });
  }

  private stream(url: string, body: unknown): Observable<AiStreamEvent> {
    return new Observable<AiStreamEvent>((subscriber) => {
      const controller = new AbortController();
      const emitError = (message: string, status = 0) => {
        subscriber.next({ type: 'error', message, status });
        subscriber.complete();
      };

      (async () => {
        await this.ensureFreshToken();
        let response = await this.post(url, body, controller.signal);
        if (response.status === 401 && this.tokenStorage.getRefreshToken()) {
          if (!(await this.refresh())) {
            emitError(uiText('ai_chat.error.session_expired'), 401);
            return;
          }
          response = await this.post(url, body, controller.signal);
        }
        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          emitError(payload?.message ?? uiText('ai_chat.error.send'), response.status);
          return;
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          buffer += value;
          let boundary: number;
          while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, '');
            const event = this.parse(block);
            if (event) {
              subscriber.next(event);
            }
          }
        }
        subscriber.complete();
      })().catch((error: unknown) => {
        if ((error as Error)?.name !== 'AbortError') {
          emitError(uiText('ai_chat.error.connection_lost'));
        }
      });

      return () => controller.abort();
    });
  }

  private parse(block: string): AiStreamEvent | null {
    let name = 'message';
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        name = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (data.length === 0) {
      return null;
    }
    const payload = JSON.parse(data.join('\n'));
    switch (name) {
      case 'conversation':
        return { type: 'conversation', slug: payload.slug };
      case 'delta':
        return { type: 'delta', text: payload.text };
      case 'tool':
        return { type: 'tool', label: payload.label ?? null };
      case 'done':
        return { type: 'done', detail: payload };
      case 'error':
        return { type: 'error', message: payload.message, status: payload.status, limit: payload.limit };
      default:
        return null;
    }
  }

  private post(url: string, body: unknown, signal: AbortSignal): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${this.tokenStorage.getAccessToken() ?? ''}`,
        [LANGUAGE_HEADER]: this.languageService.currentLanguage()
      },
      body: JSON.stringify(body),
      signal
    });
  }

  private async ensureFreshToken(): Promise<void> {
    const exp = this.tokenStorage.getClaims()?.exp;
    if (exp && exp * 1000 - Date.now() < MIN_TOKEN_LIFETIME_MS && this.tokenStorage.getRefreshToken()) {
      await this.refresh();
    }
  }

  private async refresh(): Promise<boolean> {
    try {
      await firstValueFrom(this.authService.refresh());
      return true;
    } catch {
      this.tokenStorage.clear();
      this.router.navigate(['/auth/login']);
      return false;
    }
  }
}
