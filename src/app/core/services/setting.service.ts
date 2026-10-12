import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { PageableRequest, PageResponse } from '../models/page-response.model';
import { SettingCreateRequestDto, SettingFilter, SettingRequestDto, SettingResponseDto } from '../models/setting.model';

@Injectable({ providedIn: 'root' })
export class SettingService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/settings`;

  get(filter: SettingFilter, pageable: PageableRequest): Observable<BaseResponse<PageResponse<SettingResponseDto>>> {
    let params = new HttpParams()
      .set('page', pageable.page)
      .set('size', pageable.size);
    if (pageable.sort) {
      params = params.set('sort', pageable.sort);
    }
    if (filter.search) {
      params = params.set('search', filter.search);
    }
    return this.http.get<BaseResponse<PageResponse<SettingResponseDto>>>(this.baseUrl, { params });
  }

  create(dto: SettingCreateRequestDto): Observable<BaseResponse<SettingResponseDto>> {
    return this.http.post<BaseResponse<SettingResponseDto>>(this.baseUrl, dto);
  }

  update(key: string, dto: SettingRequestDto): Observable<BaseResponse<SettingResponseDto>> {
    return this.http.put<BaseResponse<SettingResponseDto>>(`${this.baseUrl}/${key}`, dto);
  }

  delete(key: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/${key}`);
  }
}
