import {
  HttpErrorResponse,
  HttpEventType,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, retry, take, tap, throwError, timer } from 'rxjs';
import { ColdStartService, SLOW_REQUEST_MS } from '../cold-start/cold-start.service';
import { isApiRequest } from './api-request';

/** 1, 2, 4, 8, 8… s: ~55 s of automatic retries, about what a Render cold start takes. */
export const MAX_AUTO_RETRIES = 9;
const MAX_BACKOFF_MS = 8000;

export function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

/**
 * 502/503 come from Render's proxy before the app sees the request: always safe to retry.
 * Status 0 / 504 may have reached the app, so only idempotent methods are retried.
 */
export function isWakeUpError(req: HttpRequest<unknown>, error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 502 || error.status === 503) return true;
  return IDEMPOTENT.has(req.method) && (error.status === 0 || error.status === 504);
}

function answeredByApp(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status > 0 &&
    ![502, 503, 504].includes(error.status)
  );
}

/**
 * Innermost interceptor, so every retry re-sends the exact request (bearer included).
 * After the automatic retries the request stays pending until the user hits "Retry".
 */
export const coldStartInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req)) return next(req);
  const coldStart = inject(ColdStartService);

  const slowTimer = coldStart.mightBeAsleep()
    ? setTimeout(() => coldStart.markWaking(), SLOW_REQUEST_MS)
    : undefined;

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) coldStart.markAwake();
      },
      error: (error: unknown) => {
        if (answeredByApp(error)) coldStart.markAwake();
      },
    }),
    retry({
      delay: (error: unknown, attempt) => {
        if (!isWakeUpError(req, error)) return throwError(() => error);
        if (attempt <= MAX_AUTO_RETRIES) {
          coldStart.markWaking();
          return timer(backoffMs(attempt));
        }
        coldStart.markFailed();
        return coldStart.retryRequested$.pipe(take(1));
      },
    }),
    finalize(() => clearTimeout(slowTimer)),
  );
};
