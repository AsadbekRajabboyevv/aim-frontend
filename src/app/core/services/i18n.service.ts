import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, map, tap } from 'rxjs';
import { API_BASE_URL, DEFAULT_LANGUAGE_CODE, STORAGE_KEY_UI_TRANSLATIONS } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { UiTranslationsDto } from '../models/i18n.model';
import { LanguageResponseDto } from '../models/language.model';
import { LanguageService } from './language.service';

export type TranslateParams = Record<string, string | number | null | undefined>;

let instance: I18nService | null = null;

/** For plain functions (utils) that have no injector; reads signals, so computeds and templates stay reactive. */
export function uiText(key: string, params?: TranslateParams): string {
  return instance ? instance.t(key, params) : key;
}

/** Current UI language, for picking a text out of a translations map. */
export function uiLanguage(): string {
  return instance ? instance.language() : DEFAULT_LANGUAGE_CODE;
}

/**
 * UI texts of the login page and the admin panels. They live in the database as `ui.*` system messages,
 * so a super admin can translate the whole interface into any language from the "Tizim xabarlari" page.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {

  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly document = inject(DOCUMENT);

  /** Current UI language; also sent as X-Lang so backend messages match. */
  readonly language = this.languageService.currentLanguage;
  /** Active languages the user can switch to. */
  readonly languages = signal<LanguageResponseDto[]>([]);
  readonly switching = signal(false);

  private readonly messages = signal<Record<string, string>>({});
  private readonly hasCache: boolean;

  constructor() {
    instance = this;
    const cached = readCache();
    this.hasCache = cached?.language === this.language();
    if (cached && this.hasCache) {
      this.apply(cached);
    }
  }

  /**
   * With a cached dictionary the app renders at once and the fresh one swaps in when it arrives;
   * on the very first visit the first render waits for it. On failure the raw keys are shown.
   */
  init(): Promise<void> {
    const loaded = firstValueFrom(this.load(this.language())).catch(() => undefined);
    return this.hasCache ? Promise.resolve() : loaded;
  }

  /** Re-fetches the current language, e.g. after languages or ui.* texts were changed. */
  refresh(): void {
    this.load(this.language()).subscribe({ error: () => undefined });
  }

  use(code: string): Observable<void> {
    this.switching.set(true);
    return this.load(code).pipe(tap({ finalize: () => this.switching.set(false) }));
  }

  /** Text for `key` (without the `ui.` prefix); `{name}` placeholders are filled from `params`. */
  t(key: string, params?: TranslateParams): string {
    const text = this.messages()[key] ?? key;
    if (!params) {
      return text;
    }
    return text.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      return value === null || value === undefined ? match : String(value);
    });
  }

  private load(code: string): Observable<void> {
    return this.http.get<BaseResponse<UiTranslationsDto>>(`${API_BASE_URL}/public/i18n/${encodeURIComponent(code)}`).pipe(
      map((response) => response.data),
      map((data) => {
        if (data) {
          this.apply(data);
          writeCache(data);
        }
      })
    );
  }

  private apply(data: UiTranslationsDto): void {
    this.messages.set(data.messages ?? {});
    this.languages.set(data.languages ?? []);
    if (data.language && data.language !== this.language()) {
      this.languageService.setLanguage(data.language);
    }
    this.document.documentElement.lang = data.language || this.language();
  }
}

function readCache(): UiTranslationsDto | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UI_TRANSLATIONS);
    return raw ? (JSON.parse(raw) as UiTranslationsDto) : null;
  } catch {
    return null;
  }
}

function writeCache(data: UiTranslationsDto): void {
  try {
    localStorage.setItem(STORAGE_KEY_UI_TRANSLATIONS, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the dictionary is simply fetched again next time.
  }
}
