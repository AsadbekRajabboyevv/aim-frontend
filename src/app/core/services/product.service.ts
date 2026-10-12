import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { ProductFilter, ProductRequestDto, ProductResponseDto } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class ProductService {

  private readonly http = inject(HttpClient);

  get(cafeSlug: string, filter: ProductFilter = {}): Observable<BaseResponse<ProductResponseDto[]>> {
    let params = new HttpParams();
    if (filter.categorySlug) {
      params = params.set('categorySlug', filter.categorySlug);
    }
    return this.http.get<BaseResponse<ProductResponseDto[]>>(this.baseUrl(cafeSlug), { params });
  }

  create(cafeSlug: string, dto: ProductRequestDto): Observable<BaseResponse<ProductResponseDto>> {
    return this.http.post<BaseResponse<ProductResponseDto>>(this.baseUrl(cafeSlug), dto);
  }

  update(cafeSlug: string, slug: string, dto: ProductRequestDto): Observable<BaseResponse<ProductResponseDto>> {
    return this.http.put<BaseResponse<ProductResponseDto>>(`${this.baseUrl(cafeSlug)}/${slug}`, dto);
  }

  copy(cafeSlug: string, slug: string): Observable<BaseResponse<ProductResponseDto>> {
    return this.http.post<BaseResponse<ProductResponseDto>>(`${this.baseUrl(cafeSlug)}/${slug}/copy`, {});
  }

  reorder(cafeSlug: string, categorySlug: string, slugs: string[]): Observable<BaseResponse<ProductResponseDto[]>> {
    return this.http.put<BaseResponse<ProductResponseDto[]>>(`${this.baseUrl(cafeSlug)}/order`, { categorySlug, slugs });
  }

  updateAvailability(cafeSlug: string, slug: string, available: boolean): Observable<BaseResponse<ProductResponseDto>> {
    return this.http.patch<BaseResponse<ProductResponseDto>>(`${this.baseUrl(cafeSlug)}/${slug}/availability`, { available });
  }

  updateAvailabilityBulk(cafeSlug: string, available: boolean, slugs?: string[]): Observable<BaseResponse<number>> {
    return this.http.patch<BaseResponse<number>>(`${this.baseUrl(cafeSlug)}/availability`, { available, slugs: slugs ?? null });
  }

  delete(cafeSlug: string, slug: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl(cafeSlug)}/${slug}`);
  }

  private baseUrl(cafeSlug: string): string {
    return `${API_BASE_URL}/cafes/${cafeSlug}/products`;
  }
}
