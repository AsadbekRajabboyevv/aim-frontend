import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL, ROLE_SUPER_ADMIN, SERVER_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import {
  LoginRequestDto,
  RegisterRequestDto,
  TelegramAuthData,
  TelegramConfigDto,
  TokenResponseDto,
  VerificationSentDto,
  VerifyEmailRequestDto
} from '../models/token.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  login(dto: LoginRequestDto): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/login`, dto).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  /** Creates the account and emails a code; tokens come from {@link verifyEmail}. */
  register(dto: RegisterRequestDto): Observable<BaseResponse<VerificationSentDto>> {
    return this.http.post<BaseResponse<VerificationSentDto>>(`${API_BASE_URL}/auth/register`, dto);
  }

  verifyEmail(dto: VerifyEmailRequestDto): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/verify-email`, dto).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  verifyEmailLink(token: string): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/verify-email/link`, { token }).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  resendVerification(email: string): Observable<BaseResponse<VerificationSentDto>> {
    return this.http.post<BaseResponse<VerificationSentDto>>(`${API_BASE_URL}/auth/verify-email/resend`, { email });
  }

  /** Emails a reset code and link; the answer is the same for unknown addresses. */
  forgotPassword(email: string): Observable<BaseResponse<VerificationSentDto>> {
    return this.http.post<BaseResponse<VerificationSentDto>>(`${API_BASE_URL}/auth/password/forgot`, { email });
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/password/reset`, { email, code, newPassword }).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  resetPasswordLink(token: string, newPassword: string): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/password/reset/link`, { token, newPassword }).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  telegramConfig(): Observable<BaseResponse<TelegramConfigDto>> {
    return this.http.get<BaseResponse<TelegramConfigDto>>(`${API_BASE_URL}/auth/telegram/config`);
  }

  telegramLogin(data: TelegramAuthData): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/telegram`, data).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  refresh(): Observable<BaseResponse<TokenResponseDto>> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    return this.http.post<BaseResponse<TokenResponseDto>>(`${API_BASE_URL}/auth/refresh`, { refreshToken }).pipe(
      tap((response) => this.persistTokens(response))
    );
  }

  logout(): Observable<BaseResponse<void>> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    this.tokenStorage.clear();
    return this.http.post<BaseResponse<void>>(`${API_BASE_URL}/auth/logout`, { refreshToken });
  }

  googleLoginUrl(): string {
    return `${SERVER_BASE_URL}/oauth2/authorization/google`;
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.isAuthenticated();
  }

  currentRole(): string | null {
    return this.tokenStorage.getClaims()?.role ?? null;
  }

  /** Where a freshly signed-in user lands. */
  homeRoute(): string {
    return this.currentRole() === ROLE_SUPER_ADMIN ? '/super-admin/cafes' : '/cafe-admin/cafes';
  }

  private persistTokens(response: BaseResponse<TokenResponseDto>): void {
    if (response.data) {
      this.tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
    }
  }
}
