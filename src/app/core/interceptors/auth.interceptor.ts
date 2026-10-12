import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/password', '/auth/telegram', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));
  const accessToken = tokenStorage.getAccessToken();

  const authorizedReq = accessToken && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint && tokenStorage.getRefreshToken()) {
        return authService.refresh().pipe(
          switchMap(() => {
            const retriedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokenStorage.getAccessToken()}` }
            });
            return next(retriedReq);
          }),
          catchError((refreshError) => {
            tokenStorage.clear();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
