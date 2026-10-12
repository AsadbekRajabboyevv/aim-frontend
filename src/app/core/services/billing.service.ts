import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import {
  BillingPeriod, BillingSummaryDto, CheckoutRequestDto, CheckoutResponseDto, PaymentProviderDto,
  PaymentResponseDto, PlanCatalogDto, QuoteDto
} from '../models/billing.model';

@Injectable({ providedIn: 'root' })
export class BillingService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/billing`;

  me(): Observable<BaseResponse<BillingSummaryDto>> {
    return this.http.get<BaseResponse<BillingSummaryDto>>(`${this.baseUrl}/me`);
  }

  plans(): Observable<BaseResponse<PlanCatalogDto>> {
    return this.http.get<BaseResponse<PlanCatalogDto>>(`${this.baseUrl}/plans`);
  }

  /** Plans for the landing page; no sign-in needed. */
  publicPlans(): Observable<BaseResponse<PlanCatalogDto>> {
    return this.http.get<BaseResponse<PlanCatalogDto>>(`${API_BASE_URL}/public/billing/plans`);
  }

  providers():Observable<BaseResponse<PaymentProviderDto[]>> {
    return this.http.get<BaseResponse<PaymentProviderDto[]>>(`${this.baseUrl}/providers`);
  }

  quote(plan: string, period: BillingPeriod): Observable<BaseResponse<QuoteDto>> {
    const params = new HttpParams().set('plan', plan).set('period', period);
    return this.http.get<BaseResponse<QuoteDto>>(`${this.baseUrl}/quote`, { params });
  }

  checkout(dto: CheckoutRequestDto): Observable<BaseResponse<CheckoutResponseDto>> {
    return this.http.post<BaseResponse<CheckoutResponseDto>>(`${this.baseUrl}/checkout`, dto);
  }

  payments(): Observable<BaseResponse<PaymentResponseDto[]>> {
    return this.http.get<BaseResponse<PaymentResponseDto[]>>(`${this.baseUrl}/payments`);
  }

  payment(orderNumber: number): Observable<BaseResponse<PaymentResponseDto>> {
    return this.http.get<BaseResponse<PaymentResponseDto>>(`${this.baseUrl}/payments/${orderNumber}`);
  }
}
