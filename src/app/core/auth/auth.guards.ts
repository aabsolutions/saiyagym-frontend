import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/**
 * Guards only hide UI: every permission is enforced again by the API.
 * canMatch (not canActivate) so lazy chunks aren't even downloaded when denied.
 */
export const authGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isAuthenticated()) return true;
  const returnUrl = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/login'], {
    queryParams: returnUrl !== '/' ? { returnUrl } : {},
  });
};

// inject() must run before the first await: after it we're out of the injection context.
export const guestGuard: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

export const adminGuard: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.whenReady();
  return auth.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};

/** Only same-app paths: `returnUrl` comes from the query string, so it is untrusted. */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
}
