import { Routes } from '@angular/router';
import { providePaginatorI18n } from '../../core/i18n/paginator-intl';
import { unsavedChangesGuard } from '../../shared/ui/unsaved-changes.guard';
import { ExerciseSetsPage } from './exercise-sets-page';
import { HistoryPage } from './history-page';
import { HistoryStore } from './history.store';
import { WorkoutDetailPage } from './workout-detail-page';
import { WorkoutDetailStore } from './workout-detail.store';

const historyRoutes: Routes = [
  {
    path: '',
    // Feature-wide: filters, page and month survive opening a session and coming back.
    providers: [HistoryStore, providePaginatorI18n()],
    children: [
      { path: '', component: HistoryPage },
      // `exercise/:id` before `:id`.
      { path: 'exercise/:id', component: ExerciseSetsPage },
      {
        path: ':id',
        component: WorkoutDetailPage,
        providers: [WorkoutDetailStore],
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
];

export default historyRoutes;
