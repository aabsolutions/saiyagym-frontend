import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Progress / Volume / Consistency / Records: real routes, so each tab has its own URL. */
@Component({
  selector: 'app-stats-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.stats.title' | transloco }}</h1>
      <nav mat-tab-nav-bar [tabPanel]="panel" [attr.aria-label]="'pages.stats.title' | transloco">
        @for (tab of tabs; track tab.path) {
          <a
            mat-tab-link
            [routerLink]="tab.path"
            routerLinkActive
            #rla="routerLinkActive"
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
export class StatsShell {
  protected readonly tabs = [
    { path: '/stats/progress', labelKey: 'stats.tabs.progress' },
    { path: '/stats/volume', labelKey: 'stats.tabs.volume' },
    { path: '/stats/consistency', labelKey: 'stats.tabs.consistency' },
    { path: '/stats/records', labelKey: 'stats.tabs.records' },
  ];
}
