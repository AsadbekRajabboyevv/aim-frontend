import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { DiscountFilter, DiscountRequestDto, DiscountResponseDto } from '../models/discount.model';
import { PageableRequest, PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class DiscountService {

  private readonly http = inject(HttpClient);

  get(filter: DiscountFilter, pageable: PageableRequest): Observable<BaseResponse<PageResponse<DiscountResponseDto>>> {
    let params = new HttpParams()
      .set('page', pageable.page)
      .set('size', pageable.size);
    if (pageable.sort) {
      params = params.set('sort', pageable.sort);
    }
    if (filter.search) {
      params = params.set('search', filter.search);
    }
    if (filter.cafeSlug) {
      params = params.set('cafeSlug', filter.cafeSlug);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    return this.http.get<BaseResponse<PageResponse<DiscountResponseDto>>>(`${API_BASE_URL}/discounts`, { params });
  }

  create(cafeSlug: string, dto: DiscountRequestDto): Observable<BaseResponse<DiscountResponseDto>> {
    return this.http.post<BaseResponse<DiscountResponseDto>>(this.cafeUrl(cafeSlug), dto);
  }

  update(cafeSlug: string, slug: string, dto: DiscountRequestDto): Observable<BaseResponse<DiscountResponseDto>> {
    return this.http.put<BaseResponse<DiscountResponseDto>>(`${this.cafeUrl(cafeSlug)}/${slug}`, dto);
  }

  delete(cafeSlug: string, slug: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.cafeUrl(cafeSlug)}/${slug}`);
  }

  private cafeUrl(cafeSlug: string): string {
    return `${API_BASE_URL}/cafes/${cafeSlug}/discounts`;
  }
}
