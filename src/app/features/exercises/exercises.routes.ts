import { Routes } from '@angular/router';
import { providePaginatorI18n } from '../../core/i18n/paginator-intl';
import { ExerciseDetailPage } from './exercise-detail-page';
import { ExerciseDetailStore } from './exercise-detail.store';
import { ExerciseFormPage } from './exercise-form-page';
import { ExerciseFormStore } from './exercise-form.store';
import { ExerciseListPage } from './exercise-list-page';
import { ExercisesShell } from './exercises-shell';
import { ExercisesStore } from './exercises.store';
import { TierBoardPage } from './tier-board-page';
import { TierBoardStore } from './tier-board.store';

const exercisesRoutes: Routes = [
  {
    path: '',
    // Feature-wide: list filters and board choices survive visiting a detail page.
    providers: [ExercisesStore, TierBoardStore, providePaginatorI18n()],
    children: [
      {
        path: '',
        component: ExercisesShell,
        children: [
          { path: '', component: ExerciseListPage },
          { path: 'tiers', component: TierBoardPage },
        ],
      },
      // Static segments before ':id'.
      { path: 'new', component: ExerciseFormPage, providers: [ExerciseFormStore] },
      { path: ':id', component: ExerciseDetailPage, providers: [ExerciseDetailStore] },
      { path: ':id/edit', component: ExerciseFormPage, providers: [ExerciseFormStore] },
    ],
  },
];

export default exercisesRoutes;
