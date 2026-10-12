export type SettingType = 'STRING' | 'INTEGER' | 'BOOLEAN';

export interface SettingResponseDto {
  key: string;
  value: string;
  type: SettingType;
  description: string | null;
  protectedKey: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SettingCreateRequestDto {
  key: string;
  value: string;
  type: SettingType;
  description?: string | null;
}

export interface SettingRequestDto {
  value: string;
  type?: SettingType;
  description?: string | null;
}

export interface SettingFilter {
  search?: string;
}
