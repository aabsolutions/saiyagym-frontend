import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Calculator / Meals / Guidelines / Foods. The disclaimer lives here, above the tabs, so it is
 * visible on every nutrition screen (SPEC: "orientativo, consulta con un profesional").
 */
@Component({
  selector: 'app-nutrition-shell',
  imports: [
    MatIconModule,
    MatTabsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.nutrition.title' | transloco }}</h1>
      <p class="disclaimer" role="note">
        <mat-icon aria-hidden="true">info</mat-icon>
        <span>{{ 'nutrition.disclaimer' | transloco }}</span>
      </p>
      <nav
        mat-tab-nav-bar
        [tabPanel]="panel"
        [attr.aria-label]="'pages.nutrition.title' | transloco"
      >
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
    .disclaimer {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 0 16px;
      padding: 12px 16px;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    mat-tab-nav-panel {
      display: block;
      padding-top: 16px;
    }
  `,
})
export class NutritionShell {
  protected readonly tabs = [
    { path: '/nutrition/calculator', labelKey: 'nutrition.tabs.calculator' },
    { path: '/nutrition/meals', labelKey: 'nutrition.tabs.meals' },
    { path: '/nutrition/guidelines', labelKey: 'nutrition.tabs.guidelines' },
    { path: '/nutrition/foods', labelKey: 'nutrition.tabs.foods' },
  ];
}
