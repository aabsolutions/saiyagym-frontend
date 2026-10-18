import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlTree, provideRouter } from '@angular/router';
import { CanMatchFn } from '@angular/router';
import { MeDto } from '../../api/models/me-dto';
import { AuthStore } from '../auth/auth.store';
import { OnboardingState, isProfileIncomplete, onboardingGuard } from './onboarding';

const userWith = (level: string | null, goal: string | null) =>
  ({ id: 'u1', profile: { level, goal } }) as unknown as MeDto;

describe('onboarding', () => {
  const user = signal<MeDto | null>(null);

  beforeEach(() => {
    localStorage.clear();
    user.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { user, whenReady: () => Promise.resolve() } },
      ],
    });
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      onboardingGuard({} as Route, [], {} as Parameters<CanMatchFn>[2]),
    ) as Promise<boolean | UrlTree>;

  it('treats a profile without level or goal as first login', () => {
    expect(isProfileIncomplete(userWith(null, null))).toBe(true);
    expect(isProfileIncomplete(userWith('beginner', null))).toBe(true);
    expect(isProfileIncomplete(userWith('beginner', 'both'))).toBe(false);
  });

  it('sends incomplete profiles to /onboarding', async () => {
    user.set(userWith(null, null));
    const result = await runGuard();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/onboarding');
  });

  it('lets complete profiles through', async () => {
    user.set(userWith('advanced', 'powerlifting'));
    expect(await runGuard()).toBe(true);
  });

  it('remembers "skip" per user', async () => {
    user.set(userWith(null, null));
    TestBed.inject(OnboardingState).skip();
    expect(await runGuard()).toBe(true);
    expect(localStorage.getItem('sg.onboarding.skipped.u1')).toBe('1');

    user.set({ ...userWith(null, null), id: 'u2' });
    expect(await runGuard()).toBeInstanceOf(UrlTree);
  });
});
