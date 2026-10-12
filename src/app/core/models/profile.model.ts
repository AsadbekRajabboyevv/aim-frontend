import { AuthProvider, Role } from './user.model';

export interface ProfileResponseDto {
  slug: string;
  fullName: string;
  /** Null for Telegram accounts. */
  email: string | null;
  role: Role;
  provider: AuthProvider;
  hasPassword: boolean;
  /** ISO 3166-1 alpha-2; decides the billing currency. */
  country: string | null;
  createdAt: string;
}

export interface ProfileRequestDto {
  fullName: string;
  country?: string;
}

export interface PasswordChangeRequestDto {
  currentPassword: string | null;
  newPassword: string;
}
