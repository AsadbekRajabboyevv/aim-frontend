import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, MENU_TABLE_QUERY_PARAM } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { MenuLinkDto, PublicMenuResponseDto } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class PublicMenuService {

  private readonly http = inject(HttpClient);

  get(cafeSlug: string): Observable<BaseResponse<PublicMenuResponseDto>> {
    return this.http.get<BaseResponse<PublicMenuResponseDto>>(`${API_BASE_URL}/public/menu/${cafeSlug}`);
  }

  link(cafeSlug: string, table?: number | null): Observable<BaseResponse<MenuLinkDto>> {
    const params = table ? new HttpParams().set(MENU_TABLE_QUERY_PARAM, table) : undefined;
    return this.http.get<BaseResponse<MenuLinkDto>>(`${API_BASE_URL}/public/menu/${cafeSlug}/link`, { params });
  }

  qrImageUrl(cafeSlug: string, table?: number | null): string {
    const query = table ? `?${MENU_TABLE_QUERY_PARAM}=${table}` : '';
    return `${API_BASE_URL}/public/menu/${cafeSlug}/qr.svg${query}`;
  }
}
