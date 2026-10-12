import { LanguageResponseDto } from './language.model';

export interface UiTranslationsDto {
  language: string;
  defaultLanguage: string;
  languages: LanguageResponseDto[];
  messages: Record<string, string>;
}
