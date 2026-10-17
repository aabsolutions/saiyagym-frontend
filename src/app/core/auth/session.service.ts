import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { AuthService as AuthApi } from '../../api/services/auth.service';
import { TokenPairDto } from '../../api/models/token-pair-dto';
import { SKIP_AUTH, SKIP_ERROR_NOTIFY } from '../http/api-request';
import { TokenStorage } from './token-storage';

/** The refresh token is missing, expired, revoked or was reused: the user must sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

const REFRESH_LOCK = 'sg.refresh';

export const silentContext = () =>
  new HttpContext().set(SKIP_AUTH, true).set(SKIP_ERROR_NOTIFY, true);

/** Owns the token pair. Knows nothing about the user; AuthStore builds on top of it. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly authApi = inject(AuthApi);
  private readonly storage = inject(TokenStorage);

  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = this._accessToken.asReadonly();

  private refreshInFlight: Promise<string> | null = null;

  get isRefreshing(): boolean {
    return this.refreshInFlight !== null;
  }

  hasRefreshToken(): boolean {
    return this.storage.get() !== null;
  }

  start(tokens: TokenPairDto): void {
    this._accessToken.set(tokens.accessToken);
    this.storage.set(tokens.refreshToken);
  }

  clear(): void {
    this._accessToken.set(null);
    this.storage.clear();
  }

  /**
   * Rotates the token pair. Concurrent callers share a single request: the API invalidates
   * the presented refresh token, so a parallel second refresh would be flagged as reuse
   * (REFRESH_TOKEN_REUSED) and revoke the whole session.
   */
  refresh(): Promise<string> {
    this.refreshInFlight ??= this.withCrossTabLock(() => this.rotate()).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  /** Revokes this device's refresh token. Best effort: the local session ends regardless. */
  async revoke(): Promise<void> {
    const refreshToken = this.storage.get();
    this.clear();
    if (!refreshToken) return;
    try {
      await this.authApi.authControllerLogout({ body: { refreshToken } }, silentContext());
    } catch {
      // Already invalid or offline: nothing else to do.
    }
  }

  private async rotate(): Promise<string> {
    // Read inside the lock: another tab may have rotated it a moment ago.
    const refreshToken = this.storage.get();
    if (!refreshToken) {
      this._accessToken.set(null);
      throw new SessionExpiredError();
    }
    try {
      const tokens = await this.authApi.authControllerRefresh(
        { body: { refreshToken } },
        silentContext(),
      );
      this.start(tokens);
      return tokens.accessToken;
    } catch (error) {
      // 4xx = the token itself is bad. Network/5xx keep it: the session may still be valid.
      if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
        this.clear();
        throw new SessionExpiredError();
      }
      throw error;
    }
  }

  /** Tabs share the stored refresh token; serialize rotations across them. */
  private withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request(REFRESH_LOCK, task) : task();
  }
}
