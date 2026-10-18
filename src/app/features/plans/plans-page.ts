import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { PlansStore } from './plans.store';

/** Free vs Premium from the API's entitlements. No payments yet: upgrade is "coming soon". */
@Component({
  selector: 'app-plans-page',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.scss',
})
export class PlansPage {
  protected readonly store = inject(PlansStore);
  protected readonly auth = inject(AuthStore);

  protected isCurrent(code: string): boolean {
    return this.auth.plan()?.code === code;
  }
}
