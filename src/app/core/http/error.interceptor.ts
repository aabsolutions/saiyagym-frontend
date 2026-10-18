import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Notifier } from '../notify/notifier';
import { planRestrictionOf } from '../plans/entitlements';
import { UpgradePrompt } from '../plans/upgrade-prompt';
import { ApiErrorMessages } from './api-error';
import { SKIP_ERROR_NOTIFY, isApiRequest, isPublicAuthEndpoint } from './api-request';

/**
 * Shows API errors in a snackbar, translated by `code`; PLAN_* errors open the upgrade
 * dialog instead. The error is re-thrown so callers can still react (stop a spinner, mark a
 * field). Registered outside authInterceptor, so it only sees errors that survived the
 * refresh-and-retry.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req) || req.context.get(SKIP_ERROR_NOTIFY)) return next(req);
  const notifier = inject(Notifier);
  const messages = inject(ApiErrorMessages);
  const upgradePrompt = inject(UpgradePrompt);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);

      // A 401 on a protected route means the session is gone: AuthStore already says so once.
      const sessionLost = error.status === 401 && !isPublicAuthEndpoint(req);
      const restriction = planRestrictionOf(error);
      if (restriction) {
        upgradePrompt.open(restriction).catch(() => notifier.error(messages.resolve(error)));
      } else if (!sessionLost) {
        notifier.error(messages.resolve(error));
      }
      return throwError(() => error);
    }),
  );
};
