import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { DashboardStore } from './dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  imports: [MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="hello">
        <h1 class="page-title">
          @if (store.name(); as name) {
            {{ 'pages.dashboard.welcome' | transloco: { name } }}
          } @else {
            {{ 'pages.dashboard.welcomeAnonymous' | transloco }}
          }
        </h1>
        @if (store.planName(); as plan) {
          <p class="plan">
            <mat-icon aria-hidden="true">workspace_premium</mat-icon>
            {{ 'pages.dashboard.plan' | transloco: { plan } }}
          </p>
        }
      </div>
      <p class="soon">{{ 'common.comingSoon' | transloco }}</p>
    </section>
  `,
  styles: `
    .hello {
      padding: 24px;
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      border-bottom: 4px solid var(--sg-gold);
    }
    .plan {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
    .soon {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class DashboardPage {
  protected readonly store = inject(DashboardStore);
}
