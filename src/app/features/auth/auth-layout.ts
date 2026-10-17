import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageMenu } from '../../core/layout/language-menu';
import { ThemeToggle } from '../../core/layout/theme-toggle';

/** Split screen: brand hero (hidden on handsets) + form panel. */
@Component({
  selector: 'app-auth-layout',
  imports: [LanguageMenu, MatIconModule, RouterOutlet, ThemeToggle, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <aside class="hero" aria-hidden="true">
        <div class="aura"></div>
        <div class="hero-card">
          <span class="badge"><mat-icon>bolt</mat-icon>{{ 'auth.hero.badge' | transloco }}</span>
          <h2>{{ 'auth.hero.title' | transloco }}</h2>
          <p>{{ 'auth.hero.text' | transloco }}</p>
        </div>
      </aside>
      <main class="panel">
        <div class="panel-tools">
          <app-language-menu />
          <app-theme-toggle />
        </div>
        <div class="panel-body">
          <div class="brand">
            <span class="logo"><mat-icon>bolt</mat-icon></span>
            <span>{{ 'app.name' | transloco }}</span>
          </div>
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
