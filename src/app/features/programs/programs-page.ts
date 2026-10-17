import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { ProgramsStore } from './programs.store';

@Component({
  selector: 'app-programs-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.programs.title" icon="calendar_month" />`,
})
export class ProgramsPage {
  protected readonly store = inject(ProgramsStore);
}
