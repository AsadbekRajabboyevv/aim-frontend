export type MenuTheme = 'ESPRESSO' | 'OLIVE' | 'OCEAN' | 'BURGUNDY' | 'MIDNIGHT' | 'SAFFRON';

export type SocialNetwork = 'INSTAGRAM' | 'TELEGRAM' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP' | 'WEBSITE';

export type SocialLinks = Partial<Record<SocialNetwork, string>>;

export interface CafeResponseDto {
  slug: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string> | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  workingHours: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  socialLinks: SocialLinks | null;
  theme: MenuTheme;
  active: boolean;
  ownerSlug: string | null;
  ownerFullName: string | null;
  createdAt: string;
}

export interface CafeRequestDto {
  nameTranslations: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  logoUrl?: string;
  coverUrl?: string;
  phone?: string;
  address?: string;
  email?: string | null;
  workingHours?: string | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  socialLinks?: SocialLinks;
  theme?: MenuTheme;
  active: boolean;
  ownerSlug?: string | null;
}

export interface CafeFilter {
  search?: string;
  active?: boolean;
  ownerSlug?: string;
}

export interface MyCafesResponseDto {
  cafes: CafeResponseDto[];
  /** Null when the plan has no cafe limit. */
  maxCafes: number | null;
}
