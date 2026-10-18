import { Injectable, computed, inject, signal } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { MeDto } from '../../api/models/me-dto';
import { AuthStore } from '../auth/auth.store';

/** Level and goal drive defaults across the app (tiers, templates): onboarding asks for them. */
export function isProfileIncomplete(user: Pick<MeDto, 'profile'>): boolean {
  return user.profile.level === null || user.profile.goal === null;
}

const skippedKey = (userId: string) => `sg.onboarding.skipped.${userId}`;

/**
 * Whether to send the user through /onboarding. The API has no "onboarded" flag: an
 * incomplete profile means first login. "Skip" is remembered per user on this browser.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingState {
  private readonly auth = inject(AuthStore);
  private readonly skippedNow = signal<string | null>(null);

  readonly needed = computed(() => {
    const user = this.auth.user();
    if (!user || !isProfileIncomplete(user)) return false;
    return this.skippedNow() !== user.id && !this.wasSkipped(user.id);
  });

  skip(): void {
    const id = this.auth.user()?.id;
    if (!id) return;
    try {
      localStorage.setItem(skippedKey(id), '1');
    } catch {
      // Storage unavailable: skipped for this visit only.
    }
    this.skippedNow.set(id);
  }

  private wasSkipped(userId: string): boolean {
    try {
      return localStorage.getItem(skippedKey(userId)) === '1';
    } catch {
      return false;
    }
  }
}

/** Runs after authGuard on the shell: first login lands on the onboarding wizard. */
export const onboardingGuard: CanMatchFn = async () => {
  const onboarding = inject(OnboardingState);
  const router = inject(Router);
  await inject(AuthStore).whenReady();
  return onboarding.needed() ? router.createUrlTree(['/onboarding']) : true;
};
