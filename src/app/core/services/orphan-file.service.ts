import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';
import { BaseResponse } from '../models/base-response.model';
import { DeleteFilesResultDto, OrphanFilesDto } from '../models/file.model';

@Injectable({ providedIn: 'root' })
export class OrphanFileService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/files/orphans`;

  get(): Observable<BaseResponse<OrphanFilesDto>> {
    return this.http.get<BaseResponse<OrphanFilesDto>>(this.baseUrl);
  }

  delete(urls: string[]): Observable<BaseResponse<DeleteFilesResultDto>> {
    return this.http.post<BaseResponse<DeleteFilesResultDto>>(`${this.baseUrl}/delete`, { urls });
  }
}
