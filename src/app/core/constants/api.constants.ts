export const SERVER_BASE_URL = 'http://localhost:8080';
export const API_BASE_URL = `${SERVER_BASE_URL}/api/v1`;

export const STORAGE_KEY_ACCESS_TOKEN = 'onlinemenu.accessToken';
export const STORAGE_KEY_REFRESH_TOKEN = 'onlinemenu.refreshToken';
export const STORAGE_KEY_LANGUAGE = 'onlinemenu.language';
/** Read by an inline script in index.html too, so the page paints in the right theme. */
export const STORAGE_KEY_THEME = 'onlinemenu.theme';
export const STORAGE_KEY_MENU_LANGUAGE = 'onlinemenu.menuLanguage';
export const STORAGE_KEY_UI_TRANSLATIONS = 'onlinemenu.uiTranslations';

export const MENU_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const MENU_TABLE_QUERY_PARAM = 'table';

export const LANGUAGE_HEADER = 'X-Lang';
export const DEFAULT_LANGUAGE_CODE = 'uz';

export const ROLE_SUPER_ADMIN = 'SUPER_ADMIN';
export const ROLE_CAFE_ADMIN = 'CAFE_ADMIN';
