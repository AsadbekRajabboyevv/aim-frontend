export type Role = 'SUPER_ADMIN' | 'CAFE_ADMIN';
export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'TELEGRAM';

export interface UserResponseDto {
  slug: string;
  fullName: string;
  email: string | null;
  role: Role;
  cafeCount: number;
  provider: AuthProvider;
  active: boolean;
  createdAt: string;
}

export interface UserRequestDto {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
}

export interface UserFilter {
  search?: string;
  role?: Role;
  cafeSlug?: string;
  active?: boolean;
}
