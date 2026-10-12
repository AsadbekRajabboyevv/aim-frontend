import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LANGUAGE_HEADER } from '../constants/api.constants';
import { LanguageService } from '../services/language.service';

export const langInterceptor: HttpInterceptorFn = (req, next) => {
  const languageService = inject(LanguageService);
  const cloned = req.clone({
    setHeaders: { [LANGUAGE_HEADER]: languageService.currentLanguage() }
  });
  return next(cloned);
};
