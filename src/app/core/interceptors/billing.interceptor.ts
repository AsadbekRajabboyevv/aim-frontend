import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { PlanLimitErrorDto } from '../models/billing.model';
import { UpgradePromptService } from '../services/upgrade-prompt.service';

/** HTTP 402 means a plan limit blocked the request: offer a bigger plan, then pass the error on. */
export const billingInterceptor: HttpInterceptorFn = (req, next) => {
  const upgradePrompt = inject(UpgradePromptService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const limit = error.status === 402 ? (error.error?.data as PlanLimitErrorDto | null) : null;
      if (limit?.limitKey) {
        upgradePrompt.show(limit);
      }
      return throwError(() => error);
    })
  );
};
