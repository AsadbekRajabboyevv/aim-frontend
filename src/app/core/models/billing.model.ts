export type LimitKind = 'COUNT' | 'METERED' | 'FEATURE';
export type LimitPeriod = 'NONE' | 'DAY' | 'MONTH';
export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type SubscriptionState = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'FREE';
export type UpgradeReason = 'LIMIT_NEAR' | 'LIMIT_REACHED' | 'TRIAL_ENDING' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';
/** UZS amounts are whole so'm; USD and EUR amounts are cents. */
export type Currency = 'UZS' | 'USD' | 'EUR';

export interface PlanResponseDto {
  slug: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Cents; 0 = not sold in that currency. */
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  monthlyPriceEur: number;
  yearlyPriceEur: number;
  /** Limit key → value; -1 is unlimited, a missing key uses the limit's default value. */
  entitlements: Record<string, number>;
  sortOrder: number;
  recommended: boolean;
  active: boolean;
}

export interface PlanRequestDto {
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  monthlyPriceEur: number;
  yearlyPriceEur: number;
  entitlements: Record<string, number>;
  sortOrder: number | null;
  recommended: boolean;
  active: boolean;
}

export interface LimitDefinitionResponseDto {
  key: string;
  nameTranslations: Record<string, string>;
  kind: LimitKind;
  period: LimitPeriod;
  httpMethod: string | null;
  pathPattern: string | null;
  defaultValue: number;
  sortOrder: number;
  builtIn: boolean;
  /** Whether going over the limit is actually blocked; otherwise it is only shown. */
  enforced: boolean;
}

export interface LimitDefinitionRequestDto {
  key?: string;
  nameTranslations: Record<string, string>;
  kind: LimitKind;
  period: LimitPeriod | null;
  httpMethod: string | null;
  pathPattern: string | null;
  defaultValue: number;
  sortOrder: number | null;
}

export interface PlanCatalogDto {
  plans: PlanResponseDto[];
  limits: LimitDefinitionResponseDto[];
  currency: Currency;
}

export interface UsageItemDto {
  key: string;
  nameTranslations: Record<string, string>;
  kind: LimitKind;
  period: LimitPeriod;
  /** Null when unlimited. */
  limit: number | null;
  used: number | null;
  percent: number | null;
  enabled: boolean;
}

export interface UpgradeSuggestionDto {
  reason: UpgradeReason;
  limitKey: string | null;
  plan: PlanResponseDto;
}

export interface BillingSummaryDto {
  plan: PlanResponseDto;
  state: SubscriptionState;
  period: BillingPeriod | null;
  currentPeriodEnd: string | null;
  daysLeft: number | null;
  usage: UsageItemDto[];
  suggestion: UpgradeSuggestionDto | null;
  promptPercent: number;
  enforced: boolean;
  currency: Currency;
  /** Null until a Google sign-up picks a country. */
  country: string | null;
}

export interface QuoteDto {
  planSlug: string;
  period: BillingPeriod;
  amount: number;
  currency: Currency;
  renewal: boolean;
  bonusDays: number;
  startsAt: string;
  endsAt: string;
}

export interface CheckoutRequestDto {
  planSlug: string;
  period: BillingPeriod;
  provider: string;
}

export interface CheckoutResponseDto {
  orderNumber: number;
  amount: number;
  currency: Currency;
  provider: string;
  redirectUrl: string;
}

export interface PaymentProviderDto {
  code: string;
  displayName: string;
}

export interface PaymentResponseDto {
  orderNumber: number;
  planSlug: string;
  planName: Record<string, string>;
  period: BillingPeriod;
  amount: number;
  currency: Currency;
  provider: string;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
  userEmail: string | null;
}

/** Body data of an HTTP 402 answer: a plan limit blocked the request. */
export interface PlanLimitErrorDto {
  limitKey: string;
  limitName: Record<string, string>;
  kind: LimitKind;
  limit: number | null;
  used: number | null;
  currentPlan: string;
  suggestedPlan: PlanResponseDto | null;
}

export interface ProviderSettingsDto {
  code: string;
  displayName: string;
  configured: boolean;
  enabled: boolean;
  callbackUrl: string;
  envVariables: string[];
}

export interface BillingSettingsDto {
  enabled: boolean;
  trialDays: number;
  trialPlan: string;
  fallbackPlan: string;
  promptPercent: number;
  providers: ProviderSettingsDto[];
}

export interface BillingSettingsRequestDto {
  enabled: boolean;
  trialDays: number;
  trialPlan: string;
  fallbackPlan: string;
  promptPercent: number;
  providers: Record<string, boolean>;
}

export interface SubscriptionAdminDto {
  userSlug: string;
  fullName: string;
  /** Null for Telegram accounts. */
  email: string | null;
  planSlug: string | null;
  planName: Record<string, string>;
  state: SubscriptionState;
  period: BillingPeriod | null;
  currentPeriodEnd: string | null;
}

export interface SubscriptionAssignRequestDto {
  planSlug: string;
  period: BillingPeriod | null;
  currentPeriodEnd: string;
}
