export type DiscountStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED';

export interface DiscountResponseDto {
  slug: string;
  cafeSlug: string;
  cafeNameTranslations: Record<string, string>;
  productSlug: string;
  productNameTranslations: Record<string, string>;
  productImageUrl: string | null;
  productPrice: number;
  discountPrice: number;
  percent: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  status: DiscountStatus;
  createdAt: string;
}

export interface DiscountRequestDto {
  productSlug: string;
  discountPrice: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

export interface DiscountFilter {
  search?: string;
  cafeSlug?: string;
  status?: DiscountStatus;
}
