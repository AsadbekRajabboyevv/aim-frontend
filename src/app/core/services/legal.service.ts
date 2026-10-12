import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { LegalDocumentAdminDto, LegalDocumentDto, LegalDocumentRequestDto, LegalSlug } from '../models/legal.model';

@Injectable({ providedIn: 'root' })
export class LegalService {

  private readonly http = inject(HttpClient);

  /** The document in the current UI language (sent as X-Lang); no sign-in needed. */
  getPublic(slug: LegalSlug): Observable<BaseResponse<LegalDocumentDto>> {
    return this.http.get<BaseResponse<LegalDocumentDto>>(`${API_BASE_URL}/public/legal/${slug}`);
  }

  getAll(): Observable<BaseResponse<LegalDocumentAdminDto[]>> {
    return this.http.get<BaseResponse<LegalDocumentAdminDto[]>>(`${API_BASE_URL}/legal`);
  }

  update(slug: LegalSlug, dto: LegalDocumentRequestDto): Observable<BaseResponse<LegalDocumentAdminDto>> {
    return this.http.put<BaseResponse<LegalDocumentAdminDto>>(`${API_BASE_URL}/legal/${slug}`, dto);
  }
}
