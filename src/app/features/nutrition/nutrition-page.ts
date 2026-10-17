import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { NutritionStore } from './nutrition.store';

@Component({
  selector: 'app-nutrition-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.nutrition.title" icon="restaurant" />`,
})
export class NutritionPage {
  protected readonly store = inject(NutritionStore);
}
