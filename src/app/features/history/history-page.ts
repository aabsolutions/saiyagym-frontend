import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { HistoryStore } from './history.store';

@Component({
  selector: 'app-history-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.history.title" icon="history" />`,
})
export class HistoryPage {
  protected readonly store = inject(HistoryStore);
}
