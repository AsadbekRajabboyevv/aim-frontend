export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresInMs: number;
  tokenType: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  fullName: string;
  email: string;
  password: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

/** Where the verification code went and when a new one may be requested. */
export interface VerificationSentDto {
  email: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyEmailRequestDto {
  email: string;
  code: string;
}

/** Bot of the Telegram Login Widget; null when Telegram sign-in is off. */
export interface TelegramConfigDto {
  botUsername: string | null;
}

/** The user object the Telegram Login Widget hands its callback; sent to the backend as is. */
export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}
