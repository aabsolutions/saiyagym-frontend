import { Routes } from '@angular/router';
import { StatsPage } from './stats-page';
import { StatsStore } from './stats.store';

const statsRoutes: Routes = [
  {
    path: '',
    providers: [StatsStore],
    children: [{ path: '', component: StatsPage }],
  },
];

export default statsRoutes;
