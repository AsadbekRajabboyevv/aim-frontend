import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import {
  BillingSettingsDto, BillingSettingsRequestDto, LimitDefinitionRequestDto, LimitDefinitionResponseDto,
  PaymentResponseDto, PaymentStatus, PlanRequestDto, PlanResponseDto, SubscriptionAdminDto,
  SubscriptionAssignRequestDto
} from '../models/billing.model';
import { PageableRequest, PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class BillingAdminService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/billing/admin`;

  plans(): Observable<BaseResponse<PlanResponseDto[]>> {
    return this.http.get<BaseResponse<PlanResponseDto[]>>(`${this.baseUrl}/plans`);
  }

  createPlan(dto: PlanRequestDto): Observable<BaseResponse<PlanResponseDto>> {
    return this.http.post<BaseResponse<PlanResponseDto>>(`${this.baseUrl}/plans`, dto);
  }

  updatePlan(slug: string, dto: PlanRequestDto): Observable<BaseResponse<PlanResponseDto>> {
    return this.http.put<BaseResponse<PlanResponseDto>>(`${this.baseUrl}/plans/${slug}`, dto);
  }

  deletePlan(slug: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/plans/${slug}`);
  }

  limits(): Observable<BaseResponse<LimitDefinitionResponseDto[]>> {
    return this.http.get<BaseResponse<LimitDefinitionResponseDto[]>>(`${this.baseUrl}/limits`);
  }

  createLimit(dto: LimitDefinitionRequestDto): Observable<BaseResponse<LimitDefinitionResponseDto>> {
    return this.http.post<BaseResponse<LimitDefinitionResponseDto>>(`${this.baseUrl}/limits`, dto);
  }

  updateLimit(key: string, dto: LimitDefinitionRequestDto): Observable<BaseResponse<LimitDefinitionResponseDto>> {
    return this.http.put<BaseResponse<LimitDefinitionResponseDto>>(`${this.baseUrl}/limits/${encodeURIComponent(key)}`, dto);
  }

  deleteLimit(key: string): Observable<BaseResponse<void>> {
    return this.http.delete<BaseResponse<void>>(`${this.baseUrl}/limits/${encodeURIComponent(key)}`);
  }

  settings(): Observable<BaseResponse<BillingSettingsDto>> {
    return this.http.get<BaseResponse<BillingSettingsDto>>(`${this.baseUrl}/settings`);
  }

  updateSettings(dto: BillingSettingsRequestDto): Observable<BaseResponse<BillingSettingsDto>> {
    return this.http.put<BaseResponse<BillingSettingsDto>>(`${this.baseUrl}/settings`, dto);
  }

  subscriptions(search: string, pageable: PageableRequest): Observable<BaseResponse<PageResponse<SubscriptionAdminDto>>> {
    let params = new HttpParams().set('page', pageable.page).set('size', pageable.size);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<BaseResponse<PageResponse<SubscriptionAdminDto>>>(`${this.baseUrl}/subscriptions`, { params });
  }

  assign(userSlug: string, dto: SubscriptionAssignRequestDto): Observable<BaseResponse<SubscriptionAdminDto>> {
    return this.http.put<BaseResponse<SubscriptionAdminDto>>(`${this.baseUrl}/subscriptions/${userSlug}`, dto);
  }

  payments(status: PaymentStatus | '', pageable: PageableRequest): Observable<BaseResponse<PageResponse<PaymentResponseDto>>> {
    let params = new HttpParams().set('page', pageable.page).set('size', pageable.size);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<BaseResponse<PageResponse<PaymentResponseDto>>>(`${this.baseUrl}/payments`, { params });
  }
}
