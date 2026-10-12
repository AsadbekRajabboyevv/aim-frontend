import { SocialLinks, SocialNetwork } from '../models/cafe.model';
import { IconName } from '../../shared/components/icon/icon.component';

export interface SocialNetworkMeta {
  key: SocialNetwork;
  label: string;
  /** Set when the label is a word to translate (ui.* key) rather than a brand name. */
  labelKey?: string;
  icon: IconName;
  placeholder: string;
}

export const SOCIAL_NETWORKS: SocialNetworkMeta[] = [
  { key: 'INSTAGRAM', label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/kafe' },
  { key: 'TELEGRAM', label: 'Telegram', icon: 'telegram', placeholder: 'https://t.me/kafe' },
  { key: 'FACEBOOK', label: 'Facebook', icon: 'facebook', placeholder: 'https://facebook.com/kafe' },
  { key: 'TIKTOK', label: 'TikTok', icon: 'tiktok', placeholder: 'https://tiktok.com/@kafe' },
  { key: 'YOUTUBE', label: 'YouTube', icon: 'youtube', placeholder: 'https://youtube.com/@kafe' },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: 'whatsapp', placeholder: 'https://wa.me/998901234567' },
  { key: 'WEBSITE', label: 'Website', labelKey: 'social.website', icon: 'globe', placeholder: 'https://kafe.uz' }
];

export function filledSocialLinks(links: SocialLinks | null | undefined): (SocialNetworkMeta & { url: string })[] {
  return SOCIAL_NETWORKS
    .filter((network) => !!links?.[network.key])
    .map((network) => ({ ...network, url: links![network.key]! }));
}
