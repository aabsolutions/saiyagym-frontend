import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { StatsStore } from './stats.store';

@Component({
  selector: 'app-stats-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.stats.title" icon="monitoring" />`,
})
export class StatsPage {
  protected readonly store = inject(StatsStore);
}
