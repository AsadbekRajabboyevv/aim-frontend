export interface StoredFileDto {
  url: string;
  cafeSlug: string | null;
  category: string | null;
  fileName: string;
  sizeBytes: number;
  lastModified: string;
  recent: boolean;
}

export interface OrphanFilesDto {
  files: StoredFileDto[];
  totalSizeBytes: number;
  gracePeriodMinutes: number;
}

export interface DeleteFilesResultDto {
  deletedCount: number;
  freedBytes: number;
  skipped: string[];
}
