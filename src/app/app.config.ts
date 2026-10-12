import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { billingInterceptor } from './core/interceptors/billing.interceptor';
import { langInterceptor } from './core/interceptors/lang.interceptor';
import { routes } from './app.routes';
import { I18nService } from './core/services/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, langInterceptor, billingInterceptor])),
    provideAppInitializer(() => inject(I18nService).init())
  ]
};
