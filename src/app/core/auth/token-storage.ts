import { Injectable } from '@angular/core';

const REFRESH_TOKEN_KEY = 'sg.refreshToken';

/**
 * Only the refresh token is persisted (so a reload keeps the session); the access token
 * lives in memory. Rotation + reuse detection on the API limit the damage of a stolen one.
 * Storage can throw (private mode, blocked site data): then the session lasts until reload.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  get(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  set(refreshToken: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // Storage unavailable: keep going with an in-memory session.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Nothing persisted, nothing to clear.
    }
  }
}
