export interface BaseResponse<T> {
  success: boolean;
  message: string | null;
  data: T | null;
  errors: string[] | null;
  timestamp: string;
}
