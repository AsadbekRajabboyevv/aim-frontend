import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { AiSettingsRequestDto, AiSettingsResponseDto } from '../models/ai.model';
import { BaseResponse } from '../models/base-response.model';

@Injectable({ providedIn: 'root' })
export class AiSettingsService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/ai/settings`;

  get(): Observable<BaseResponse<AiSettingsResponseDto>> {
    return this.http.get<BaseResponse<AiSettingsResponseDto>>(this.baseUrl);
  }

  update(dto: AiSettingsRequestDto): Observable<BaseResponse<AiSettingsResponseDto>> {
    return this.http.put<BaseResponse<AiSettingsResponseDto>>(this.baseUrl, dto);
  }

  models(provider: string): Observable<BaseResponse<string[]>> {
    return this.http.get<BaseResponse<string[]>>(`${this.baseUrl}/models`, { params: new HttpParams().set('provider', provider) });
  }
}
