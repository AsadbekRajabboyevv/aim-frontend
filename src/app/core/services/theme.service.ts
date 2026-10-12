import { Injectable, computed, signal } from '@angular/core';
import { STORAGE_KEY_THEME } from '../constants/api.constants';

export type ThemePreference = 'light' | 'dark' | 'system';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Light / dark mode of the panel. Without a saved choice it follows the OS. The class goes on <html>;
 * index.html sets it before Angular starts, so the first paint is already in the right theme.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly preference = signal<ThemePreference>(this.readPreference());

  private readonly systemDark = signal(this.mediaQuery()?.matches ?? false);

  readonly isDark = computed(() => {
    const preference = this.preference();
    return preference === 'dark' || (preference === 'system' && this.systemDark());
  });

  constructor() {
    this.mediaQuery()?.addEventListener('change', (event) => {
      this.systemDark.set(event.matches);
      this.apply();
    });
    this.apply();
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      if (preference === 'system') {
        localStorage.removeItem(STORAGE_KEY_THEME);
      } else {
        localStorage.setItem(STORAGE_KEY_THEME, preference);
      }
    } catch {
      // Storage blocked: the choice lasts for this page only
    }
    this.apply();
  }

  private apply(): void {
    document.documentElement.classList.toggle('dark', this.isDark());
  }

  private readPreference(): ThemePreference {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  }

  private mediaQuery(): MediaQueryList | null {
    return typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null;
  }
}
