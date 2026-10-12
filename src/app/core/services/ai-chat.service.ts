import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import {
  AiConversationDetailDto,
  AiConversationSummaryDto,
  AiConversationUpdateRequestDto,
  AiStatusDto
} from '../models/ai.model';
import { BaseResponse } from '../models/base-response.model';

@Injectable({ providedIn: 'root' })
export class AiChatService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/ai`;

  status(): Observable<BaseResponse<AiStatusDto>> {
    return this.http.get<BaseResponse<AiStatusDto>>(`${this.baseUrl}/status`);
  }

  get(archived: boolean): Observable<BaseResponse<AiConversationSummaryDto[]>> {
    return this.http.get<BaseResponse<AiConversationSummaryDto[]>>(`${this.baseUrl}/conversations`,
      { params: new HttpParams().set('archived', archived) });
  }

  getBySlug(slug: string): Observable<BaseResponse<AiConversationDetailDto>> {
    return this.http.get<BaseResponse<AiConversationDetailDto>>(`${this.baseUrl}/conversations/${slug}`);
  }

  create(text: string): Observable<BaseResponse<AiConversationDetailDto>> {
    return this.http.post<BaseResponse<AiConversationDetailDto>>(`${this.baseUrl}/conversations`, { text });
  }

  send(slug: string, text: string): Observable<BaseResponse<AiConversationDetailDto>> {
    return this.http.post<BaseResponse<AiConversationDetailDto>>(`${this.baseUrl}/conversations/${slug}/messages`, { text });
  }

  decide(slug: string, toolCallId: string, approved: boolean, args: Record<string, unknown> | null)
    : Observable<BaseResponse<AiConversationDetailDto>> {
    return this.http.post<BaseResponse<AiConversationDetailDto>>(
      `${this.baseUrl}/conversations/${slug}/actions/${encodeURIComponent(toolCallId)}`, { approved, arguments: args });
  }

  decideAll(slug: string, approved: boolean): Observable<BaseResponse<AiConversationDetailDto>> {
    return this.http.post<BaseResponse<AiConversationDetailDto>>(`${this.baseUrl}/conversations/${slug}/actions`, { approved });
  }

  update(slug: string, dto: AiConversationUpdateRequestDto): Observable<BaseResponse<AiConversationSummaryDto>> {
    return this.http.patch<BaseResponse<AiConversationSummaryDto>>(`${this.baseUrl}/conversations/${slug}`, dto);
  }

  delete(slug: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/conversations/${slug}`);
  }
}
