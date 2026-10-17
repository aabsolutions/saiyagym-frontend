import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Notifier } from '../notify/notifier';
import { ApiErrorMessages } from './api-error';
import { SKIP_ERROR_NOTIFY, isApiRequest, isPublicAuthEndpoint } from './api-request';

/**
 * Shows API errors in a snackbar, translated by `code`. The error is re-thrown so callers
 * can still react (stop a spinner, mark a field). Registered outside authInterceptor, so it
 * only sees errors that survived the refresh-and-retry.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req) || req.context.get(SKIP_ERROR_NOTIFY)) return next(req);
  const notifier = inject(Notifier);
  const messages = inject(ApiErrorMessages);

  return next(req).pipe(
    catchError((error: unknown) => {
      // A 401 on a protected route means the session is gone: AuthStore already says so once.
      const sessionLost =
        error instanceof HttpErrorResponse && error.status === 401 && !isPublicAuthEndpoint(req);
      if (error instanceof HttpErrorResponse && !sessionLost) {
        notifier.error(messages.resolve(error));
      }
      return throwError(() => error);
    }),
  );
};
