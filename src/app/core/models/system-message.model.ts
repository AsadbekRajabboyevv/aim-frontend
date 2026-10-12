export interface SystemMessageResponseDto {
  code: string;
  translations: Record<string, string>;
}

export interface SystemMessageRequestDto {
  code: string;
  translations: Record<string, string>;
}

export interface SystemMessageFilter {
  search?: string;
  /** Only codes starting with this. */
  prefix?: string;
  /** Only messages with no text in this language. */
  missingLanguage?: string;
}
