import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FeatureKey, LimitKey } from '../../core/plans/entitlements';

/**
 * "This needs Premium" call to action. Presentational: give it what is missing
 * (a feature, or a limit that was reached) and it links to /plans.
 */
@Component({
  selector: 'app-upgrade-cta',
  imports: [MatButtonModule, MatIconModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let featureName = feature() ? ('plans.features.' + feature() | transloco) : '';
    @let resourceName = limit() ? ('plans.limits.' + limit() | transloco) : '';
    <div class="cta" [class.compact]="compact()" role="note">
      <mat-icon class="badge" aria-hidden="true">workspace_premium</mat-icon>
      <div class="text">
        <strong>{{ titleKey() | transloco }}</strong>
        <span>{{
          messageKey()
            | transloco: { feature: featureName, resource: resourceName, limit: limitValue() }
        }}</span>
      </div>
      <a mat-flat-button routerLink="/plans" (click)="navigated.emit()">
        {{ 'plans.cta.seePlans' | transloco }}
      </a>
    </div>
  `,
  styles: `
    .cta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 16px;
      padding: 16px;
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
      border-left: 4px solid var(--sg-gold);
    }
    .cta.compact {
      padding: 12px;
    }
    .badge {
      width: 32px;
      height: 32px;
      font-size: 32px;
    }
    .text {
      display: flex;
      flex: 1 1 200px;
      flex-direction: column;
      gap: 2px;
    }
  `,
})
export class UpgradeCta {
  readonly feature = input<FeatureKey | null>(null);
  readonly limit = input<LimitKey | null>(null);
  /** The limit value, when known (from PLAN_LIMIT_REACHED details). */
  readonly limitValue = input<number | null>(null);
  readonly compact = input(false);
  /** Replaces the generic message (e.g. what exactly the plan leaves out). */
  readonly customMessageKey = input<string | null>(null);
  readonly navigated = output<void>();

  protected readonly titleKey = computed(() =>
    this.limit() ? 'plans.cta.limitTitle' : 'plans.cta.featureTitle',
  );

  protected readonly messageKey = computed(() => {
    const custom = this.customMessageKey();
    if (custom) return custom;
    const limit = this.limit();
    if (limit) return this.limitValue() === null ? 'plans.cta.limitGeneric' : 'plans.cta.limit';
    return this.feature() ? 'plans.cta.feature' : 'plans.cta.featureGeneric';
  });
}
