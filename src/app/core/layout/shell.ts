import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { LanguageMenu } from './language-menu';
import { NAV_ITEMS } from './nav-items';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

/** Authenticated layout: side nav on desktop, modal drawer on handsets. */
@Component({
  selector: 'app-shell',
  imports: [
    LanguageMenu,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggle,
    TranslocoPipe,
    UserMenu,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthStore);

  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  /** Open by default on desktop, closed on handsets; resets when the breakpoint flips. */
  protected readonly opened = linkedSignal(() => !this.isHandset());

  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter((item) => !item.adminOnly || this.auth.isAdmin()),
  );

  protected readonly displayName = this.auth.displayName;
  protected readonly planName = computed(() => this.auth.plan()?.name ?? '');

  protected closeOnHandset(): void {
    if (this.isHandset()) this.opened.set(false);
  }
}
