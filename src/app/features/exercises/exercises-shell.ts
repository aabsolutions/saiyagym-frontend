import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** List / tier board tabs. The tabs are real routes, so each view has its own URL. */
@Component({
  selector: 'app-exercises-shell',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 class="page-title">{{ 'pages.exercises.title' | transloco }}</h1>
      <nav
        mat-tab-nav-bar
        [tabPanel]="panel"
        [attr.aria-label]="'pages.exercises.title' | transloco"
      >
        <a
          mat-tab-link
          routerLink="/exercises"
          routerLinkActive
          #list="routerLinkActive"
          [routerLinkActiveOptions]="{
            paths: 'exact',
            queryParams: 'ignored',
            fragment: 'ignored',
            matrixParams: 'ignored',
          }"
          [active]="list.isActive"
        >
          {{ 'exercises.tabs.list' | transloco }}
        </a>
        <a
          mat-tab-link
          routerLink="/exercises/tiers"
          routerLinkActive
          #tiers="routerLinkActive"
          [active]="tiers.isActive"
        >
          {{ 'exercises.tabs.tiers' | transloco }}
        </a>
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
export class ExercisesShell {}
