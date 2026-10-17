import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { isApiRequest } from './api-request';

/** The API localizes error messages and catalog content (`{es,en}` maps) by this header. */
export const acceptLanguageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req)) return next(req);
  const lang = inject(TranslocoService).getActiveLang();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
