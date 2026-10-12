import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { PasswordChangeRequestDto, ProfileRequestDto, ProfileResponseDto } from '../models/profile.model';
import { TokenResponseDto } from '../models/token.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly baseUrl = `${API_BASE_URL}/profile`;

  get(): Observable<BaseResponse<ProfileResponseDto>> {
    return this.http.get<BaseResponse<ProfileResponseDto>>(this.baseUrl);
  }

  update(dto: ProfileRequestDto): Observable<BaseResponse<ProfileResponseDto>> {
    return this.http.put<BaseResponse<ProfileResponseDto>>(this.baseUrl, dto);
  }

  changePassword(dto: PasswordChangeRequestDto): Observable<BaseResponse<TokenResponseDto>> {
    return this.http.put<BaseResponse<TokenResponseDto>>(`${this.baseUrl}/password`, dto).pipe(
      tap((response) => {
        if (response.data) {
          this.tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
        }
      })
    );
  }
}
