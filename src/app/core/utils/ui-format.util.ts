import { uiLanguage, uiText } from '../services/i18n.service';
import { formatPrice, translate } from './menu-format.util';

/** Admin panels: a translations map (cafe, category, product names) in the UI language. */
export function uiName(translations: Record<string, string> | null | undefined): string {
  return translate(translations, uiLanguage());
}

/** Admin panels: a price with the currency name in the UI language. */
export function uiPrice(price: number | null | undefined): string {
  return formatPrice(price, uiText('common.currency'));
}
