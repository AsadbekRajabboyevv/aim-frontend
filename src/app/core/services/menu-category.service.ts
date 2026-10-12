import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { MenuCategoryRequestDto, MenuCategoryResponseDto } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuCategoryService {

  private readonly http = inject(HttpClient);

  get(cafeSlug: string): Observable<BaseResponse<MenuCategoryResponseDto[]>> {
    return this.http.get<BaseResponse<MenuCategoryResponseDto[]>>(this.baseUrl(cafeSlug));
  }

  create(cafeSlug: string, dto: MenuCategoryRequestDto): Observable<BaseResponse<MenuCategoryResponseDto>> {
    return this.http.post<BaseResponse<MenuCategoryResponseDto>>(this.baseUrl(cafeSlug), dto);
  }

  update(cafeSlug: string, slug: string, dto: MenuCategoryRequestDto): Observable<BaseResponse<MenuCategoryResponseDto>> {
    return this.http.put<BaseResponse<MenuCategoryResponseDto>>(`${this.baseUrl(cafeSlug)}/${slug}`, dto);
  }

  reorder(cafeSlug: string, slugs: string[]): Observable<BaseResponse<MenuCategoryResponseDto[]>> {
    return this.http.put<BaseResponse<MenuCategoryResponseDto[]>>(`${this.baseUrl(cafeSlug)}/order`, { slugs });
  }

  delete(cafeSlug: string, slug: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl(cafeSlug)}/${slug}`);
  }

  private baseUrl(cafeSlug: string): string {
    return `${API_BASE_URL}/cafes/${cafeSlug}/categories`;
  }
}
