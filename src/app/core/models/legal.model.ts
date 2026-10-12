export type LegalSlug = 'terms' | 'privacy';

/** A legal document in one language, for the public pages. */
export interface LegalDocumentDto {
  slug: LegalSlug;
  title: string;
  content: string;
  language: string;
  updatedAt: string | null;
}

/** A legal document with all its translations, for the super admin editor. */
export interface LegalDocumentAdminDto {
  slug: LegalSlug;
  titleTranslations: Record<string, string>;
  contentTranslations: Record<string, string>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface LegalDocumentRequestDto {
  titleTranslations: Record<string, string>;
  contentTranslations: Record<string, string>;
}
