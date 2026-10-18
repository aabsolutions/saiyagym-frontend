import { Routes } from '@angular/router';
import { StatsConsistencyPage } from './stats-consistency-page';
import { StatsProgressPage } from './stats-progress-page';
import { StatsRecordsPage } from './stats-records-page';
import { StatsShell } from './stats-shell';
import { StatsVolumePage } from './stats-volume-page';
import { StatsStore } from './stats.store';

const statsRoutes: Routes = [
  {
    path: '',
    // Feature-wide: the range and the picked exercise survive switching tabs.
    providers: [StatsStore],
    component: StatsShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'progress' },
      { path: 'progress', component: StatsProgressPage },
      { path: 'volume', component: StatsVolumePage },
      { path: 'consistency', component: StatsConsistencyPage },
      { path: 'records', component: StatsRecordsPage },
    ],
  },
];

export default statsRoutes;
