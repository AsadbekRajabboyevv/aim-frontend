import { ProductTag } from '../models/menu.model';
import type { IconName } from '../../shared/components/icon/icon.component';

export interface ProductTagMeta {
  value: ProductTag;
  /** Admin panel label (ui.* key). */
  uiKey: string;
  /** Public menu label (menu.ui.* key). */
  labelKey: string;
  icon: IconName;
  classes: string;
}

export const PRODUCT_TAGS: ProductTagMeta[] = [
  { value: 'NEW', uiKey: 'product_tag.new', labelKey: 'tag_new', icon: 'sparkles', classes: 'bg-emerald-500 text-white' },
  { value: 'HIT', uiKey: 'product_tag.hit', labelKey: 'tag_hit', icon: 'star', classes: 'bg-amber-400 text-espresso-950' },
  { value: 'SPICY', uiKey: 'product_tag.spicy', labelKey: 'tag_spicy', icon: 'flame', classes: 'bg-red-600 text-white' }
];

export function productTagMeta(tag: ProductTag): ProductTagMeta {
  return PRODUCT_TAGS.find((meta) => meta.value === tag) ?? PRODUCT_TAGS[0];
}

export function discountPercent(price: number, discountPrice: number | null | undefined): number {
  if (discountPrice === null || discountPrice === undefined || price <= 0) {
    return 0;
  }
  return Math.max(Math.round(((price - discountPrice) / price) * 100), 0);
}
