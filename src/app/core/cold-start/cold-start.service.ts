import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ColdStartState = 'idle' | 'waking' | 'failed';

/** A request slower than this while the server may be asleep shows the banner. */
export const SLOW_REQUEST_MS = 3000;
/** Render's free plan spins the service down after ~15 min without traffic. */
export const ASLEEP_AFTER_MS = 10 * 60_000;

/**
 * Tracks whether the API (Render free plan) is waking up from a cold start.
 * Fed by coldStartInterceptor; read by the banner.
 */
@Injectable({ providedIn: 'root' })
export class ColdStartService {
  private readonly _state = signal<ColdStartState>('idle');
  readonly state = this._state.asReadonly();

  private lastResponseAt = Number.NEGATIVE_INFINITY;
  private readonly retry$ = new Subject<void>();

  /** Emits when the user asks to retry after automatic retries gave up. */
  readonly retryRequested$: Observable<void> = this.retry$.asObservable();

  mightBeAsleep(now = Date.now()): boolean {
    return now - this.lastResponseAt > ASLEEP_AFTER_MS;
  }

  /** Any HTTP answer from the app (even 4xx) proves it is awake. */
  markAwake(now = Date.now()): void {
    this.lastResponseAt = now;
    this._state.set('idle');
  }

  markWaking(): void {
    if (this._state() === 'idle') this._state.set('waking');
  }

  markFailed(): void {
    this._state.set('failed');
  }

  retry(): void {
    this._state.set('waking');
    this.retry$.next();
  }
}
