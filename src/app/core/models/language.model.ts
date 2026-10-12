export interface LanguageResponseDto {
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface LanguageRequestDto {
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface LanguageFilter {
  search?: string;
  active?: boolean;
}
