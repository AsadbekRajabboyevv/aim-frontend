import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { LanguageResponseDto } from '../models/language.model';

export type Translations = Record<string, string>;

export function requiredTranslation(languageCode: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as Translations | null;
    return value?.[languageCode]?.trim() ? null : { requiredTranslation: languageCode };
  };
}

export function cleanTranslations(value: Translations | null | undefined): Translations {
  const result: Translations = {};
  for (const [code, text] of Object.entries(value ?? {})) {
    if (text?.trim()) {
      result[code] = text.trim();
    }
  }
  return result;
}

export function defaultLanguageCode(languages: LanguageResponseDto[]): string {
  return languages.find((language) => language.isDefault)?.code ?? languages[0]?.code ?? '';
}
