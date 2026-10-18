import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { AuthResponseDto } from '../../api/models/auth-response-dto';
import { ChangePasswordDto } from '../../api/models/change-password-dto';
import { LoginDto } from '../../api/models/login-dto';
import { MeDto } from '../../api/models/me-dto';
import { RegisterDto } from '../../api/models/register-dto';
import { UpdateMeDto } from '../../api/models/update-me-dto';
import { AuthService as AuthApi } from '../../api/services/auth.service';
import { UsersService } from '../../api/services/users.service';
import { Notifier } from '../notify/notifier';
import { FeatureKey, LimitKey } from '../plans/entitlements';
import { SessionExpiredError, SessionService } from './session.service';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  user: MeDto | null;
  status: AuthStatus;
}

const initialState: AuthState = { user: null, status: 'unknown' };

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _session: inject(SessionService),
    _authApi: inject(AuthApi),
    _usersApi: inject(UsersService),
    _router: inject(Router),
    _notifier: inject(Notifier),
  })),
  withComputed(({ user, status }) => ({
    isAuthenticated: computed(() => status() === 'authenticated'),
    isAdmin: computed(() => user()?.role === 'admin'),
    plan: computed(() => user()?.plan ?? null),
    entitlements: computed(() => user()?.plan.entitlements ?? null),
    displayName: computed(() => user()?.profile.name || user()?.email || ''),
  })),
  withMethods(({ entitlements }) => ({
    /** UI hint only: the API enforces the plan again on every request. */
    hasFeature(feature: FeatureKey): boolean {
      return entitlements()?.features[feature] ?? false;
    },
    /** null = unlimited (or unknown while signed out). */
    limit(key: LimitKey): number | null {
      return entitlements()?.limits[key] ?? null;
    },
  })),
  withMethods((store) => {
    let ready: Promise<void> | null = null;

    const signIn = (response: AuthResponseDto) => {
      store._session.start(response.tokens);
      patchState(store, { user: response.user, status: 'authenticated' });
    };

    const signOutLocally = () => {
      patchState(store, { user: null, status: 'anonymous' });
    };

    /** Restores the session from the stored refresh token (page load). */
    const restore = async (): Promise<void> => {
      if (!store._session.hasRefreshToken()) {
        patchState(store, { status: 'anonymous' });
        return;
      }
      try {
        await store._session.refresh();
        const user = await store._usersApi.meControllerMe();
        patchState(store, { user, status: 'authenticated' });
      } catch (error) {
        // Not an expiry (e.g. server unreachable): keep the token, retry on next load.
        if (!(error instanceof SessionExpiredError)) console.warn('Session restore failed', error);
        signOutLocally();
      }
    };

    return {
      /** Resolves once the initial session check is done. Guards await it. */
      whenReady(): Promise<void> {
        ready ??= restore();
        return ready;
      },

      async login(credentials: LoginDto): Promise<void> {
        signIn(await store._authApi.authControllerLogin({ body: credentials }));
      },

      async register(dto: RegisterDto): Promise<void> {
        signIn(await store._authApi.authControllerRegister({ body: dto }));
      },

      async reloadUser(): Promise<void> {
        patchState(store, { user: await store._usersApi.meControllerMe() });
      },

      async updateMe(patch: UpdateMeDto): Promise<void> {
        patchState(store, { user: await store._usersApi.meControllerUpdate({ body: patch }) });
      },

      async logout(): Promise<void> {
        await store._session.revoke();
        signOutLocally();
        await store._router.navigateByUrl('/login');
      },

      async logoutAll(): Promise<void> {
        await store._authApi.authControllerLogoutAll();
        store._session.clear();
        signOutLocally();
        await store._router.navigateByUrl('/login');
      },

      /** The API revokes every other session; this one stays signed in. */
      async changePassword(dto: ChangePasswordDto): Promise<void> {
        await store._usersApi.accountControllerChangePassword({ body: dto });
      },

      /** Soft delete + anonymization on the API; all sessions end. */
      async deleteAccount(password: string): Promise<void> {
        await store._usersApi.accountControllerDeleteAccount({ body: { password } });
        store._session.clear();
        signOutLocally();
        await store._router.navigateByUrl('/login');
      },

      /** Called by authInterceptor when refreshing failed. Idempotent. */
      handleSessionExpired(): void {
        if (store.status() !== 'authenticated') return;
        store._session.clear();
        signOutLocally();
        store._notifier.info('errors.SESSION_EXPIRED');
        const returnUrl = store._router.url;
        void store._router.navigate(['/login'], {
          queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {},
        });
      },
    };
  }),
);

export type AuthStore = InstanceType<typeof AuthStore>;
