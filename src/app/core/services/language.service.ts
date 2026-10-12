import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, shareReplay, tap, throwError } from 'rxjs';
import { API_BASE_URL, DEFAULT_LANGUAGE_CODE, STORAGE_KEY_LANGUAGE } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { DropdownDto } from '../models/dropdown.model';
import { LanguageRequestDto, LanguageResponseDto } from '../models/language.model';
import { PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  private readonly http = inject(HttpClient);

  readonly currentLanguage = signal<string>(localStorage.getItem(STORAGE_KEY_LANGUAGE) ?? DEFAULT_LANGUAGE_CODE);

  private active$?: Observable<LanguageResponseDto[]>;

  setLanguage(code: string): void {
    localStorage.setItem(STORAGE_KEY_LANGUAGE, code);
    this.currentLanguage.set(code);
  }

  getActiveLanguages(): Observable<BaseResponse<DropdownDto[]>> {
    return this.http.get<BaseResponse<DropdownDto[]>>(`${API_BASE_URL}/languages/dropdown`);
  }

  getActive(): Observable<LanguageResponseDto[]> {
    if (!this.active$) {
      this.active$ = this.http.get<BaseResponse<LanguageResponseDto[]>>(`${API_BASE_URL}/languages/active`).pipe(
        map((response) => response.data ?? []),
        catchError((error) => {
          this.active$ = undefined;
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.active$;
  }

  getAll(): Observable<BaseResponse<PageResponse<LanguageResponseDto>>> {
    return this.http.get<BaseResponse<PageResponse<LanguageResponseDto>>>(
      `${API_BASE_URL}/languages?page=0&size=100&sort=sortOrder`);
  }

  create(dto: LanguageRequestDto): Observable<BaseResponse<LanguageResponseDto>> {
    return this.http.post<BaseResponse<LanguageResponseDto>>(`${API_BASE_URL}/languages`, dto)
      .pipe(tap(() => this.invalidateActive()));
  }

  update(code: string, dto: LanguageRequestDto): Observable<BaseResponse<LanguageResponseDto>> {
    return this.http.put<BaseResponse<LanguageResponseDto>>(`${API_BASE_URL}/languages/${code}`, dto)
      .pipe(tap(() => this.invalidateActive()));
  }

  delete(code: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${API_BASE_URL}/languages/${code}`)
      .pipe(tap(() => this.invalidateActive()));
  }

  invalidateActive(): void {
    this.active$ = undefined;
  }
}
