import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon';
import { ExercisesStore } from './exercises.store';

@Component({
  selector: 'app-exercises-page',
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-coming-soon titleKey="pages.exercises.title" icon="fitness_center" />`,
})
export class ExercisesPage {
  protected readonly store = inject(ExercisesStore);
}
