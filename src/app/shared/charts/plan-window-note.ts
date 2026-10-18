import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UpgradeCta } from '../plans/upgrade-cta';

/**
 * "Your plan shows the last 90 days": shown when a Free user picks a longer range or the API
 * reports it clamped the window (`window.limitedByPlan`). The data shown is still real.
 */
@Component({
  selector: 'app-plan-window-note',
  imports: [UpgradeCta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-upgrade-cta feature="fullStats" customMessageKey="charts.planWindow" [compact]="true" />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PlanWindowNote {}
