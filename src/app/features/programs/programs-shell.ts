import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** My programs / This week / Templates: real routes, so each tab has its own URL. */
@Component({
  selector: 'app-programs-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.programs.title' | transloco }}</h1>
      <nav
        mat-tab-nav-bar
        [tabPanel]="panel"
        [attr.aria-label]="'pages.programs.title' | transloco"
      >
        @for (tab of tabs; track tab.path) {
          <a
            mat-tab-link
            [routerLink]="tab.path"
            routerLinkActive
            #rla="routerLinkActive"
            [routerLinkActiveOptions]="{ exact: true }"
            [active]="rla.isActive"
          >
            {{ tab.labelKey | transloco }}
          </a>
        }
      </nav>
      <mat-tab-nav-panel #panel>
        <router-outlet />
      </mat-tab-nav-panel>
    </section>
  `,
  styles: `
    mat-tab-nav-panel {
      display: block;
      padding-top: 16px;
    }
  `,
})
export class ProgramsShell {
  protected readonly tabs = [
    { path: '/programs', labelKey: 'programs.tabs.mine' },
    { path: '/programs/week', labelKey: 'programs.tabs.week' },
    { path: '/programs/templates', labelKey: 'programs.tabs.templates' },
  ];
}
