import { SERVER_BASE_URL } from '../constants/api.constants';

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  return url.startsWith('/') ? `${SERVER_BASE_URL}${url}` : url;
}
