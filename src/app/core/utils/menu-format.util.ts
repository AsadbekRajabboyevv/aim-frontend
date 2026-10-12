import { DEFAULT_LANGUAGE_CODE } from '../constants/api.constants';

const PRICE_FORMAT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatPrice(price: number | null | undefined, currency = "so'm"): string {
  if (price === null || price === undefined) {
    return '';
  }
  return `${PRICE_FORMAT.format(price).replace(/ /g, ' ')} ${currency}`;
}

export function translate(
  translations: Record<string, string> | null | undefined,
  language: string,
  fallbackLanguage: string = DEFAULT_LANGUAGE_CODE
): string {
  if (!translations) {
    return '';
  }
  return translations[language]
    || translations[fallbackLanguage]
    || Object.values(translations).find((value) => !!value)
    || '';
}
