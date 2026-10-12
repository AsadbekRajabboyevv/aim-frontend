import { BillingPeriod, Currency, LimitDefinitionResponseDto, LimitPeriod, PlanResponseDto, SubscriptionState, UsageItemDto } from '../models/billing.model';
import { uiLanguage, uiText } from '../services/i18n.service';
import { formatPrice } from './menu-format.util';

// i18n: billing.period.MONTHLY, billing.period.YEARLY
export function periodLabel(period: BillingPeriod): string {
  return uiText(`billing.period.${period}`);
}

// i18n: billing.limit_period.DAY, billing.limit_period.MONTH
export function limitPeriodSuffix(period: LimitPeriod): string {
  return period === 'NONE' ? '' : uiText(`billing.limit_period.${period}`);
}

// i18n: billing.state.TRIAL, billing.state.ACTIVE, billing.state.EXPIRED, billing.state.FREE
export function stateLabel(state: SubscriptionState): string {
  return uiText(`billing.state.${state}`);
}

/** The text of a translations map in the UI language, falling back to any filled language. */
export function name(translations: Record<string, string> | null | undefined, fallback = ''): string {
  if (!translations) {
    return fallback;
  }
  return translations[uiLanguage()] || Object.values(translations).find((value) => !!value) || fallback;
}

/** A plan price in the currency's smallest unit (so'm, cents); 0 when the plan is not sold in it. */
export function planPrice(plan: PlanResponseDto, period: BillingPeriod, currency: Currency = 'UZS'): number {
  const yearly = period === 'YEARLY';
  switch (currency) {
    case 'USD':
      return yearly ? plan.yearlyPriceUsd : plan.monthlyPriceUsd;
    case 'EUR':
      return yearly ? plan.yearlyPriceEur : plan.monthlyPriceEur;
    default:
      return yearly ? plan.yearlyPrice : plan.monthlyPrice;
  }
}

/** Monthly price shown for a period: the yearly price is spread over 12 months. */
export function monthlyEquivalent(plan: PlanResponseDto, period: BillingPeriod, currency: Currency = 'UZS'): number {
  const price = planPrice(plan, period, currency);
  return period === 'YEARLY' ? Math.round(price / 12) : price;
}

export function yearlySavingPercent(plan: PlanResponseDto, currency: Currency = 'UZS'): number {
  const full = planPrice(plan, 'MONTHLY', currency) * 12;
  const yearly = planPrice(plan, 'YEARLY', currency);
  return full > 0 && yearly > 0 ? Math.round((1 - yearly / full) * 100) : 0;
}

export function som(amount: number): string {
  return formatPrice(amount, uiText('common.currency'));
}

/** An amount in its currency: so'm as before, dollars and euros from cents with the symbol. */
export function money(amount: number, currency: Currency = 'UZS'): string {
  if (currency === 'UZS') {
    return som(amount);
  }
  try {
    return new Intl.NumberFormat(uiLanguage(), {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount / 100);
  } catch {
    return (currency === 'EUR' ? '€' : 'US$') + (amount / 100).toFixed(2);
  }
}

/** How a plan's value for a limit reads on a pricing card. */
export function entitlementText(plan: PlanResponseDto, limit: LimitDefinitionResponseDto): string {
  const value = plan.entitlements[limit.key] ?? limit.defaultValue;
  if (limit.kind === 'FEATURE') {
    return value !== 0 ? uiText('billing.feature_included') : uiText('billing.feature_excluded');
  }
  if (value < 0) {
    return uiText('billing.unlimited');
  }
  const suffix = limitPeriodSuffix(limit.period);
  return suffix ? `${value.toLocaleString('ru-RU')} / ${suffix}` : value.toLocaleString('ru-RU');
}

export function usageText(item: UsageItemDto): string {
  if (item.kind === 'FEATURE') {
    return item.enabled ? uiText('billing.feature_available') : uiText('billing.feature_not_in_plan');
  }
  const suffix = limitPeriodSuffix(item.period);
  const used = item.used ?? 0;
  const limit = item.limit === null ? uiText('billing.unlimited_lower') : item.limit.toLocaleString('ru-RU');
  return `${used.toLocaleString('ru-RU')} / ${limit}${suffix ? ' ' + suffix : ''}`;
}

export function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('ru-RU') : '—';
}
