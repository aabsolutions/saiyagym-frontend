import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, defer, from, of, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { SessionExpiredError, SessionService } from '../auth/session.service';
import { SKIP_AUTH, isApiRequest, isPublicAuthEndpoint } from './api-request';

const withBearer = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/**
 * Bearer token + transparent refresh.
 * - While a refresh is in flight, new requests wait for it (the queue) instead of going
 *   out with a token that is about to be replaced.
 * - On 401 the request is retried once with a fresh token; all concurrent 401s share the
 *   same refresh (SessionService.refresh is single-flight).
 * - If the refresh fails, AuthStore ends the session and the original 401 propagates.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req) || req.context.get(SKIP_AUTH) || isPublicAuthEndpoint(req)) {
    return next(req);
  }
  const session = inject(SessionService);
  const auth = inject(AuthStore);

  const mustWaitForRefresh = () =>
    session.isRefreshing || (!session.accessToken() && session.hasRefreshToken());

  const token$ = defer(() =>
    mustWaitForRefresh()
      ? from(session.refresh()).pipe(catchError(() => of(session.accessToken())))
      : of(session.accessToken()),
  );

  return token$.pipe(
    switchMap((sentToken) =>
      next(withBearer(req, sentToken)).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !sentToken) {
            return throwError(() => error);
          }
          // Someone else already rotated while this request was in flight: just retry.
          const current = session.accessToken();
          const fresh$ = current && current !== sentToken ? of(current) : from(session.refresh());
          return fresh$.pipe(
            catchError((refreshError: unknown) => {
              if (refreshError instanceof SessionExpiredError) auth.handleSessionExpired();
              return throwError(() => error);
            }),
            switchMap((token) => next(withBearer(req, token))),
          );
        }),
      ),
    ),
  );
};
