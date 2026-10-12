import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, TranslateParams } from '../../core/services/i18n.service';

/** `{{ 'auth.login.title' | t }}` — impure so the view follows a language switch. */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {

  private readonly i18n = inject(I18nService);

  transform(key: string, params?: TranslateParams): string {
    return this.i18n.t(key, params);
  }
}
