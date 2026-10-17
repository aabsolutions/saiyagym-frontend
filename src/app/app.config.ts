import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideI18n } from './core/i18n/i18n.providers';
import { acceptLanguageInterceptor } from './core/http/accept-language.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { baseUrlInterceptor } from './core/http/base-url.interceptor';
import { coldStartInterceptor } from './core/http/cold-start.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      // Order matters (first = outermost): errors are reported only after the auth
      // interceptor has tried refresh-and-retry, and the cold-start retries wrap the
      // raw request so each attempt is re-sent as-is.
      withInterceptors([
        baseUrlInterceptor,
        acceptLanguageInterceptor,
        errorInterceptor,
        authInterceptor,
        coldStartInterceptor,
      ]),
    ),
    provideI18n(),
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    }),
  ],
};
