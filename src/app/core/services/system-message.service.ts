import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { PageableRequest, PageResponse } from '../models/page-response.model';
import { SystemMessageFilter, SystemMessageRequestDto, SystemMessageResponseDto } from '../models/system-message.model';

@Injectable({ providedIn: 'root' })
export class SystemMessageService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/system-messages`;

  get(filter: SystemMessageFilter, pageable: PageableRequest): Observable<BaseResponse<PageResponse<SystemMessageResponseDto>>> {
    let params = new HttpParams()
      .set('page', pageable.page)
      .set('size', pageable.size)
      .set('sort', pageable.sort ?? 'code');
    if (filter.search) {
      params = params.set('search', filter.search);
    }
    if (filter.prefix) {
      params = params.set('prefix', filter.prefix);
    }
    if (filter.missingLanguage) {
      params = params.set('missingLanguage', filter.missingLanguage);
    }
    return this.http.get<BaseResponse<PageResponse<SystemMessageResponseDto>>>(this.baseUrl, { params });
  }

  create(dto: SystemMessageRequestDto): Observable<BaseResponse<SystemMessageResponseDto>> {
    return this.http.post<BaseResponse<SystemMessageResponseDto>>(this.baseUrl, dto);
  }

  update(code: string, dto: SystemMessageRequestDto): Observable<BaseResponse<SystemMessageResponseDto>> {
    return this.http.put<BaseResponse<SystemMessageResponseDto>>(`${this.baseUrl}/${code}`, dto);
  }

  delete(code: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/${code}`);
  }
}
