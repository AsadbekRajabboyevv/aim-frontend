import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { AiToolRequestDto, AiToolResponseDto } from '../models/ai.model';
import { BaseResponse } from '../models/base-response.model';
import { PageableRequest, PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class AiToolService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/ai/tools`;

  get(search: string | undefined, pageable: PageableRequest): Observable<BaseResponse<PageResponse<AiToolResponseDto>>> {
    let params = new HttpParams().set('page', pageable.page).set('size', pageable.size);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<BaseResponse<PageResponse<AiToolResponseDto>>>(this.baseUrl, { params });
  }

  create(dto: AiToolRequestDto): Observable<BaseResponse<AiToolResponseDto>> {
    return this.http.post<BaseResponse<AiToolResponseDto>>(this.baseUrl, dto);
  }

  update(name: string, dto: AiToolRequestDto): Observable<BaseResponse<AiToolResponseDto>> {
    return this.http.put<BaseResponse<AiToolResponseDto>>(`${this.baseUrl}/${name}`, dto);
  }

  delete(name: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/${name}`);
  }
}
