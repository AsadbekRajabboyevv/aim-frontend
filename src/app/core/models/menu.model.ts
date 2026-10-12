import { MenuTheme, SocialLinks } from './cafe.model';
import { DropdownDto } from './dropdown.model';

export interface MenuCategoryResponseDto {
  slug: string;
  nameTranslations: Record<string, string>;
  sortOrder: number;
  active: boolean;
  productCount: number;
}

export interface MenuCategoryRequestDto {
  nameTranslations: Record<string, string>;
  active: boolean;
}

export type ProductTag = 'NEW' | 'HIT' | 'SPICY';

export interface ProductResponseDto {
  slug: string;
  categorySlug: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string> | null;
  price: number;
  discountPrice: number | null;
  portion: string | null;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
  available: boolean;
  tags: ProductTag[];
  createdAt: string;
}

export interface ProductRequestDto {
  categorySlug: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  price: number;
  portion?: string | null;
  imageUrl?: string | null;
  active: boolean;
  available: boolean;
  tags: ProductTag[];
}

export interface ProductFilter {
  categorySlug?: string;
}

export interface PublicMenuResponseDto {
  cafe: PublicCafeDto;
  languages: DropdownDto[];
  defaultLanguage: string;
  labels: Record<string, Record<string, string>>;
  categories: PublicCategoryDto[];
}

export interface PublicCafeDto {
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
}

export interface PublicCategoryDto {
  slug: string;
  nameTranslations: Record<string, string>;
  products: PublicProductDto[];
}

export interface PublicProductDto {
  slug: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string> | null;
  price: number;
  discountPrice: number | null;
  portion: string | null;
  imageUrl: string | null;
  available: boolean;
  tags: ProductTag[];
}

export interface MenuLinkDto {
  url: string;
  table: number | null;
}
