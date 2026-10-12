import { Currency } from '../models/billing.model';
import { DropdownDto } from '../models/dropdown.model';

/** ISO 3166-1 alpha-2 codes; names come from the browser in the UI language. */
const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF',
  'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG',
  'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH',
  'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM',
  'IN', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML',
  'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI',
  'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW',
  'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO',
  'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV',
  'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA',
  'ZM', 'ZW'
];

/** Same rule as the backend's Currency.forCountry. */
const EURO_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI',
  'ES', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK'
]);

export function currencyForCountry(country: string | null | undefined): Currency {
  const code = (country ?? '').toUpperCase();
  if (!code || code === 'UZ') {
    return 'UZS';
  }
  return EURO_COUNTRIES.has(code) ? 'EUR' : 'USD';
}

export function countryName(code: string, language: string): string {
  try {
    return new Intl.DisplayNames([language, 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** All countries for a select, sorted by name in the UI language; Uzbekistan first. */
export function countryOptions(language: string): DropdownDto[] {
  const collator = new Intl.Collator(language);
  const options = COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code, language) }))
    .sort((a, b) => collator.compare(a.label, b.label));
  const uz = options.findIndex((option) => option.value === 'UZ');
  return uz > 0 ? [options[uz], ...options.slice(0, uz), ...options.slice(uz + 1)] : options;
}

/** A first guess for the registration form: the time zone for Uzbekistan, otherwise the browser locale's region. */
export function guessCountry(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === 'Asia/Tashkent' || zone === 'Asia/Samarkand') {
      return 'UZ';
    }
  } catch {
    // Time zone unavailable: fall through to the locale.
  }
  for (const locale of navigator.languages ?? [navigator.language]) {
    const region = locale.split('-')[1]?.toUpperCase();
    if (region && COUNTRY_CODES.includes(region)) {
      return region;
    }
  }
  return '';
}
