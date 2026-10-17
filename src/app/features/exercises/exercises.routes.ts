import { Routes } from '@angular/router';
import { ExercisesPage } from './exercises-page';
import { ExercisesStore } from './exercises.store';

const exercisesRoutes: Routes = [
  {
    path: '',
    providers: [ExercisesStore],
    children: [{ path: '', component: ExercisesPage }],
  },
];

export default exercisesRoutes;
