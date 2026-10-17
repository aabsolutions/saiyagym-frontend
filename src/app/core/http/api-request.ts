import { HttpContextToken, HttpRequest } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Generated clients use root-relative paths (`/api/v1/...`); baseUrlInterceptor prefixes the origin. */
export const API_PREFIX = '/api/';

/** Don't attach the bearer token nor try to refresh on 401 (refresh/logout calls themselves). */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/** The caller handles the error itself; don't show the global snackbar. */
export const SKIP_ERROR_NOTIFY = new HttpContextToken<boolean>(() => false);

export function isApiRequest(req: HttpRequest<unknown>): boolean {
  return req.url.startsWith(API_PREFIX) || req.url.startsWith(environment.apiUrl + API_PREFIX);
}

/** Unauthenticated auth routes. Their 401 means bad credentials/token, never "refresh me". */
const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/password/forgot',
  '/api/v1/auth/password/reset',
];

export function isPublicAuthEndpoint(req: HttpRequest<unknown>): boolean {
  const path = req.url.startsWith(environment.apiUrl)
    ? req.url.slice(environment.apiUrl.length)
    : req.url;
  return PUBLIC_AUTH_PATHS.includes(path.split('?')[0]);
}
