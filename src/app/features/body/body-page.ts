import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { BodyStore } from './body.store';

@Component({
  selector: 'app-body-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.body.title" icon="straighten" />`,
})
export class BodyPage {
  protected readonly store = inject(BodyStore);
}
