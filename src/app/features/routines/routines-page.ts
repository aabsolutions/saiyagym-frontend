import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { RoutinesStore } from './routines.store';

@Component({
  selector: 'app-routines-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.routines.title" icon="list_alt" />`,
})
export class RoutinesPage {
  protected readonly store = inject(RoutinesStore);
}
