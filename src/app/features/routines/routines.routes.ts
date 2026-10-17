import { Routes } from '@angular/router';
import { RoutinesPage } from './routines-page';
import { RoutinesStore } from './routines.store';

const routinesRoutes: Routes = [
  {
    path: '',
    providers: [RoutinesStore],
    children: [{ path: '', component: RoutinesPage }],
  },
];

export default routinesRoutes;
