import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanMatchFn, Route, Router, UrlSegment, UrlTree, provideRouter } from '@angular/router';
import { adminGuard, authGuard, guestGuard, safeReturnUrl } from './auth.guards';
import { AuthStore } from './auth.store';

describe('auth guards', () => {
  const isAuthenticated = signal(false);
  const isAdmin = signal(false);

  beforeEach(() => {
    isAuthenticated.set(false);
    isAdmin.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: { whenReady: () => Promise.resolve(), isAuthenticated, isAdmin },
        },
      ],
    });
  });

  const run = (guard: CanMatchFn, path = '') =>
    TestBed.runInInjectionContext(() =>
      guard(
        {} as Route,
        path ? path.split('/').map((p) => new UrlSegment(p, {})) : [],
        {} as Parameters<CanMatchFn>[2],
      ),
    ) as Promise<boolean | UrlTree>;

  const serialize = (result: boolean | UrlTree) =>
    result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

  it('authGuard sends guests to /login keeping where they were going', async () => {
    expect(serialize(await run(authGuard, 'routines/42'))).toBe(
      '/login?returnUrl=%2Froutines%2F42',
    );
  });

  it('authGuard lets signed-in users through', async () => {
    isAuthenticated.set(true);
    expect(await run(authGuard, 'routines')).toBe(true);
  });

  it('guestGuard sends signed-in users to the dashboard', async () => {
    isAuthenticated.set(true);
    expect(serialize(await run(guestGuard))).toBe('/dashboard');
  });

  it('adminGuard only lets admins through', async () => {
    isAuthenticated.set(true);
    expect(serialize(await run(adminGuard))).toBe('/dashboard');
    isAdmin.set(true);
    expect(await run(adminGuard)).toBe(true);
  });

  it.each([
    ['/routines/1', '/routines/1'],
    ['//evil.com', '/dashboard'],
    ['https://evil.com', '/dashboard'],
    [undefined, '/dashboard'],
  ])('safeReturnUrl(%s) → %s', (input, expected) => {
    expect(safeReturnUrl(input)).toBe(expected);
  });
});
