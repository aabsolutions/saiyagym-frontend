import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Admin sections as real routes (each with its URL). Guarded by adminGuard in app.routes. */
@Component({
  selector: 'app-admin-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.admin.title' | transloco }}</h1>
      <nav mat-tab-nav-bar [tabPanel]="panel" [attr.aria-label]="'pages.admin.title' | transloco">
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
export class AdminShell {
  protected readonly tabs = [
    { path: '/admin/users', labelKey: 'admin.tabs.users' },
    { path: '/admin/plans', labelKey: 'admin.tabs.plans' },
    { path: '/admin/exercises', labelKey: 'admin.tabs.exercises' },
    { path: '/admin/tiers', labelKey: 'admin.tabs.tiers' },
    { path: '/admin/tags', labelKey: 'admin.tabs.tags' },
    { path: '/admin/templates', labelKey: 'admin.tabs.templates' },
    { path: '/admin/foods', labelKey: 'admin.tabs.foods' },
    { path: '/admin/meals', labelKey: 'admin.tabs.meals' },
    { path: '/admin/guidelines', labelKey: 'admin.tabs.guidelines' },
    { path: '/admin/sounds', labelKey: 'admin.tabs.sounds' },
  ];
}
