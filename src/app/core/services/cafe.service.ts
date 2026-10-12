import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { CafeFilter, CafeRequestDto, CafeResponseDto, MyCafesResponseDto } from '../models/cafe.model';
import { DropdownDto } from '../models/dropdown.model';
import { PageableRequest, PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class CafeService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/cafes`;

  get(filter: CafeFilter, pageable: PageableRequest): Observable<BaseResponse<PageResponse<CafeResponseDto>>> {
    let params = new HttpParams()
      .set('page', pageable.page)
      .set('size', pageable.size);
    if (pageable.sort) {
      params = params.set('sort', pageable.sort);
    }
    if (filter.search) {
      params = params.set('search', filter.search);
    }
    if (filter.active !== undefined && filter.active !== null) {
      params = params.set('active', filter.active);
    }
    if (filter.ownerSlug) {
      params = params.set('ownerSlug', filter.ownerSlug);
    }
    return this.http.get<BaseResponse<PageResponse<CafeResponseDto>>>(this.baseUrl, { params });
  }

  getBySlug(slug: string): Observable<BaseResponse<CafeResponseDto>> {
    return this.http.get<BaseResponse<CafeResponseDto>>(`${this.baseUrl}/${slug}`);
  }

  getMy(): Observable<BaseResponse<MyCafesResponseDto>> {
    return this.http.get<BaseResponse<MyCafesResponseDto>>(`${this.baseUrl}/my`);
  }

  getDropdown(): Observable<BaseResponse<DropdownDto[]>> {
    return this.http.get<BaseResponse<DropdownDto[]>>(`${this.baseUrl}/dropdown`);
  }

  create(dto: CafeRequestDto): Observable<BaseResponse<CafeResponseDto>> {
    return this.http.post<BaseResponse<CafeResponseDto>>(this.baseUrl, dto);
  }

  update(slug: string, dto: CafeRequestDto): Observable<BaseResponse<CafeResponseDto>> {
    return this.http.put<BaseResponse<CafeResponseDto>>(`${this.baseUrl}/${slug}`, dto);
  }

  delete(slug: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/${slug}`);
  }

  uploadFile(cafeSlug: string, file: File, category: 'IMAGE' | 'VIDEO'): Observable<BaseResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams().set('category', category);
    return this.http.post<BaseResponse<{ url: string }>>(`${this.baseUrl}/${cafeSlug}/files`, formData, { params });
  }
}
