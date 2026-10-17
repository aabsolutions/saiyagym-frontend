import { HttpContext } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { HealthService } from './api/services/health.service';
import { AuthStore } from './core/auth/auth.store';
import { ColdStartBanner } from './core/cold-start/cold-start-banner';
import { SKIP_AUTH, SKIP_ERROR_NOTIFY } from './core/http/api-request';
import { PreferencesStore } from './core/preferences/preferences.store';

@Component({
  selector: 'app-root',
  imports: [ColdStartBanner, MatProgressBarModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (navigating()) {
      <mat-progress-bar class="nav-progress" mode="indeterminate" />
    }
    <router-outlet />
    <app-cold-start-banner />
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .nav-progress {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 1001;
    }
  `,
})
export class App {
  // Eager: applies theme/language before the first screen renders.
  private readonly prefs = inject(PreferencesStore);

  protected readonly navigating = toSignal(
    inject(Router).events.pipe(
      filter(
        (e) =>
          e instanceof NavigationStart ||
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError,
      ),
      map((e) => e instanceof NavigationStart),
    ),
    { initialValue: false },
  );

  constructor() {
    // Wake Render up as early as possible; the session restore runs in parallel.
    void inject(HealthService)
      .healthControllerCheck(
        undefined,
        new HttpContext().set(SKIP_AUTH, true).set(SKIP_ERROR_NOTIFY, true),
      )
      .catch(() => undefined);
    void inject(AuthStore).whenReady();
  }
}
