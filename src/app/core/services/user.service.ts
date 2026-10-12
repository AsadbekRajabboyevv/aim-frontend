import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { DropdownDto } from '../models/dropdown.model';
import { Role } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/users`;

  getDropdown(role?: Role): Observable<BaseResponse<DropdownDto[]>> {
    const params = role ? new HttpParams().set('role', role) : undefined;
    return this.http.get<BaseResponse<DropdownDto[]>>(`${this.baseUrl}/dropdown`, { params });
  }
}
