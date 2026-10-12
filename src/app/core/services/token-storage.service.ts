import { Injectable } from '@angular/core';
import { STORAGE_KEY_ACCESS_TOKEN, STORAGE_KEY_REFRESH_TOKEN } from '../constants/api.constants';
import { decodeJwtPayload, isTokenExpired, JwtUserClaims } from '../utils/jwt.util';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  }

  getClaims(): JwtUserClaims | null {
    const token = this.getAccessToken();
    return token ? decodeJwtPayload(token) : null;
  }

  isAuthenticated(): boolean {
    return !isTokenExpired(this.getClaims());
  }
}
