import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Measurements / Progress photos: real routes, so each tab has its own URL. */
@Component({
  selector: 'app-body-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.body.title' | transloco }}</h1>
      <nav mat-tab-nav-bar [tabPanel]="panel" [attr.aria-label]="'pages.body.title' | transloco">
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
export class BodyShell {
  protected readonly tabs = [
    { path: '/body/measurements', labelKey: 'body.tabs.measurements' },
    { path: '/body/photos', labelKey: 'body.tabs.photos' },
  ];
}
