import { Routes } from '@angular/router';
import { PlansPage } from './plans-page';
import { PlansStore } from './plans.store';

const plansRoutes: Routes = [
  {
    path: '',
    providers: [PlansStore],
    children: [{ path: '', component: PlansPage }],
  },
];

export default plansRoutes;
